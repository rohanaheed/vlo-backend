import { Request, Response } from "express";
import Stripe from "stripe";
import { stripe } from "../config/stripe";
import { AppDataSource } from "../config/db";
import { Transaction } from "../entity/Transaction";
import { Order } from "../entity/Order";
import { Invoice } from "../entity/Invioce";
import { Subscription } from "../entity/Subscription";
import { CustomerPackage } from "../entity/CustomerPackage";
import { Package } from "../entity/Package";
import { Customer } from "../entity/Customer";
import { Currency } from "../entity/Currency";
import { generateInvoicePDF } from "../utils/pdfUtils";
import { sendCustomerInvoiceEmail } from "../utils/emailUtils";
import { createStripeSubscription } from "../utils/stripUtils";
import * as crypto from "crypto";

const transactionRepo = AppDataSource.getRepository(Transaction);
const orderRepo = AppDataSource.getRepository(Order);
const invoiceRepo = AppDataSource.getRepository(Invoice);
const subscriptionRepo = AppDataSource.getRepository(Subscription);
const customerPackageRepo = AppDataSource.getRepository(CustomerPackage);
const packageRepo = AppDataSource.getRepository(Package);
const customerRepo = AppDataSource.getRepository(Customer);
const currencyRepo = AppDataSource.getRepository(Currency);

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Generate unique 6-digit order number
const generateOrderNumber = (): string => {
  const randomBytes = crypto.randomBytes(3);
  const random = (randomBytes.readUIntBE(0, 3) % 900000) + 100000;
  return `${random}`;
};

// Generate unique 6-digit invoice number
const generateInvoiceNumber = (): string => {
  const randomBytes = crypto.randomBytes(3);
  const random = (randomBytes.readUIntBE(0, 3) % 900000) + 100000;
  return `INV-${random}`;
};

// Helper to parse Metadata numbers
const parseMetadataNumber = (value: string | undefined): number | undefined => {
  if (!value) return undefined;
  const parsed = Number(value);
  return isNaN(parsed) ? undefined : parsed;
};

export const handleStripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] as string;

  if (!sig) {
    console.error('Webhook Error: Missing stripe-signature header');
    return res.status(400).send('Missing signature header');
  }

  if (!endpointSecret) {
    console.error('Webhook Error: STRIPE_WEBHOOK_SECRET not configured');
    return res.status(500).send('Server configuration error');
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send('Webhook signature verification failed');
  }

  // Log all incoming webhook events
  console.log(`Stripe webhook received: ${event.type} [${event.id}]`);

  try {
    switch (event.type) {
      // Manual payment success
      case "payment_intent.succeeded":
        await handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
        break;

      // Manual payment failure
      case "payment_intent.payment_failed":
        await handlePaymentFailure(event.data.object as Stripe.PaymentIntent);
        break;

      // Auto-renewal payment success (subscription invoice paid)
      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      // Auto-renewal payment failure (subscription invoice failed)
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      // Subscription updated
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      // Subscription cancelled/deleted
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      default:
        console.log(`Unhandled webhook event type: ${event.type}`);
        break;
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error(`Webhook processing failed for ${event.type} [${event.id}]:`, error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

const handlePaymentSuccess = async (intent: Stripe.PaymentIntent) => {
  let meta: Stripe.Metadata | null = intent.metadata;
  // If no metadata on PaymentIntent, try to get it from the associated invoice
  const intentAny = intent as any;
  if ((!meta || !meta.customerId) && intentAny.invoice) {
    try {
      const invoiceId = typeof intentAny.invoice === 'string' ? intentAny.invoice : intentAny.invoice.id;
      const stripeInvoice = await stripe.invoices.retrieve(invoiceId);
      meta = stripeInvoice.metadata;
    } catch (err) {
      console.error('Failed to retrieve invoice metadata:', err);
    }
  }

  // Skip if no metadata
  if (!meta || !meta.customerId) {
    console.log('Skipping payment_intent.succeeded: No customerId in metadata');
    return;
  }

  // Parse metadata with validation
  const customerId = parseMetadataNumber(meta.customerId);
  const orderId = parseMetadataNumber(meta.orderId);
  const invoiceId = parseMetadataNumber(meta.invoiceId);
  const customerPackageId = parseMetadataNumber(meta.customerPackageId);
  const paymentMethodId = parseMetadataNumber(meta.paymentMethodId);
  const currencyId = parseMetadataNumber(meta.currencyId);
  const autoRenew = meta.autoRenew === 'true' ? true : false;

  // Validate
  if (!customerId || !invoiceId || !customerPackageId || !currencyId) {
    console.error('Missing required metadata fields:', { customerId, invoiceId, customerPackageId, currencyId });
    return;
  }

  // Check for completed transaction
  const existingTransaction = await transactionRepo.findOne({
    where: {
      invoiceId: invoiceId,
      status: "completed",
      isDeleted: false
    }
  });

  if (existingTransaction) {
    return;
  }

  const runner = AppDataSource.createQueryRunner();
  await runner.connect();
  await runner.startTransaction();

  try {
    // Double-check inside transaction (race condition protection)
    const doubleCheck = await runner.manager.findOne(Transaction, {
      where: {
        invoiceId: invoiceId,
        status: "completed",
        isDeleted: false
      }
    });

    if (doubleCheck) {
      await runner.rollbackTransaction();
      return;
    }

    const customerAmount = intent.amount / 100;

    // Create Transaction
    await runner.manager.save(Transaction, {
      customerId,
      orderId: orderId ?? 0,
      invoiceId,
      amount: customerAmount,
      currencyId: currencyId,
      paymentMethodId: paymentMethodId ?? 0,
      reference: intent.id,
      status: "completed",
      description: `Payment for invoice #${invoiceId}`,
      transactionDate: new Date(),
      isDeleted: false
    });

    // Update Order
    if (orderId) {
      const paidOrder = await runner.manager.findOne(Order, { where: { id: orderId, status: "completed", isDelete: false } });
      if (!paidOrder) {
        await runner.manager.update(Order, { id: orderId }, { status: "completed" });
      }
    }

    // Update Invoice
    const paidInvoice = await runner.manager.findOne(Invoice, { where: { id: invoiceId, paymentStatus: "paid", isDelete: false } });
    if (!paidInvoice) {
      await runner.manager.update(Invoice, { id: invoiceId }, {
        status: "paid",
        paymentStatus: "paid",
        outstandingBalance: 0
      });
    }

    // Get Customer Package & Package
    const customerPackage = await runner.manager.findOne(CustomerPackage, {
      where: { id: customerPackageId, isDelete: false }
    });
    if (!customerPackage) {
      throw new Error(`CustomerPackage ${customerPackageId} not found`);
    }

    const pkg = await runner.manager.findOne(Package, {
      where: { id: customerPackage.packageId, isDelete: false, isActive: true }
    });
    if (!pkg) {
      throw new Error(`Package ${customerPackage.packageId} not found`);
    }

    // Get Customer
    const customer = await runner.manager.findOne(Customer, {
      where: { id: customerId, isDelete: false }
    });
    if (!customer) {
      throw new Error(`Customer ${customerId} not found`);
    }

    // Get Currency
    const currency = await runner.manager.findOne(Currency, {
      where: { id: currencyId, isDelete: false }
    });

    // Calculate Subscription Dates
    const startDate = new Date();
    const endDate = new Date(startDate);

    const billingCycle = pkg.billingCycle.toLowerCase();
    if (billingCycle === "monthly") {
      endDate.setMonth(endDate.getMonth() + 1);
    } else if (billingCycle === "annual") {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      throw new Error(`Invalid billing cycle: ${pkg.billingCycle}`);
    }

    let stripeSubscriptionId: string | undefined;

    // Create Stripe Subscription
    if (autoRenew && customer.stripeCustomerId) {
      try {
        // Build subscription items
        const subscriptionItems: { priceId: string; quantity?: number }[] = [];
        const couponIds: (string | null)[] = [];

        // Add package price
        const packagePriceId = billingCycle === "monthly" ? pkg.stripeMonthlyPriceId : pkg.stripeYearlyPriceId;
        if (packagePriceId) {
          subscriptionItems.push({ priceId: packagePriceId });
          // Add package coupon
          if (pkg.stripeCouponId && pkg.discount > 0) {
            couponIds.push(pkg.stripeCouponId);
          }
        } else {
          console.error(`Package ${pkg.id} (${pkg.name}) is missing Stripe price ID for ${billingCycle} billing. Subscription cannot include package.`);
        }

        // Add addOns with prices and coupons
        const addOns = customerPackage.addOns || [];
        for (const addOn of addOns) {
          const addOnPriceId = billingCycle === "monthly" ? addOn.stripeMonthlyPriceId : addOn.stripeYearlyPriceId;
          if (addOnPriceId) {
            subscriptionItems.push({ priceId: addOnPriceId });
            // Only add coupon if the addOn has a discount
            if (addOn.stripeCouponId && addOn.discount && addOn.discount > 0) {
              couponIds.push(addOn.stripeCouponId);
            }
          } else {
            console.warn(`AddOn ${addOn.module || addOn.feature} is missing Stripe price ID for ${billingCycle} billing.`);
          }
        }

        if (subscriptionItems.length > 0 && packagePriceId) {
          const stripeSubscription = await createStripeSubscription({
            stripeCustomerId: customer.stripeCustomerId,
            items: subscriptionItems,
            couponIds: couponIds.length > 0 ? couponIds : undefined,
            metadata: {
              customerId: String(customerId),
              customerPackageId: String(customerPackageId),
              packageId: String(pkg.id),
              packageName: pkg.name,
              currencyId: String(currencyId),
            },
            billingCycleAnchor: Math.floor(endDate.getTime() / 1000),
          });

          stripeSubscriptionId = stripeSubscription.id;
        } else if (!packagePriceId) {
          console.error('Cannot create Stripe subscription: Package price ID is missing. Please configure Stripe prices for the package.');
        }
      } catch (stripeError: any) {
        console.error('Failed to create Stripe subscription:', stripeError.message);
      }
    }

    // Create or Update Subscription
    let subscription = await runner.manager.findOne(Subscription, {
      where: { customerId, isDelete: false }
    });

    if (!subscription) {
      subscription = runner.manager.create(Subscription, {
        customerPackageId: customerPackage.packageId,
        customerId,
        currencyId,
        status: "active",
        startDate,
        endDate,
        autoRenew,
        subscriptionId: stripeSubscriptionId,
        isDelete: false
      });
    } else {
      subscription.customerPackageId = customerPackage.packageId;
      subscription.status = "active";
      subscription.startDate = startDate;
      subscription.endDate = endDate;
      subscription.autoRenew = autoRenew;
      if (stripeSubscriptionId) {
        subscription.subscriptionId = stripeSubscriptionId;
      }
    }

    await runner.manager.save(subscription);

    // Update Customer Status & Expiry
    await runner.manager.update(Customer, { id: customerId }, {
      status: "Active",
      expiryDate: endDate
    });

    await runner.commitTransaction();

    // Generate PDF and send email
    try {
      const invoice = await invoiceRepo.findOne({ where: { id: invoiceId } });
      if (invoice && customer && currency) {
        const pdfBytes = await generateInvoicePDF({
          invoice,
          customer: {
            name: `${customer.firstName} ${customer.lastName}`.trim(),
            email: customer.email,
            phone: `${customer.countryCode}${customer.phoneNumber}`,
            address: customer.businessAddress ?
              `${customer.businessAddress.buildingNumber || ''} ${customer.businessAddress.street || ''}, ${customer.businessAddress.city || ''}, ${customer.businessAddress.postalCode || ''}`.trim() : ''
          },
          currency
        });

        await sendCustomerInvoiceEmail(
          { name: `${customer.firstName} ${customer.lastName}`.trim(), email: customer.email },
          {
            invoiceNumber: invoice.invoiceNumber,
            outstandingBalance: 0,
            paymentStatus: "paid",
            createdAt: invoice.createdAt,
            dueDate: invoice.dueDate
          },
          pdfBytes,
          {
            currencySymbol: currency.currencySymbol,
            currencyCode: currency.currencyCode,
            exchangeRate: currency.exchangeRate
          }
        );
      }
    } catch (emailError) {
      console.error('Failed to send invoice email:', emailError);
    }

  } catch (err: any) {
    await runner.rollbackTransaction();
    throw err;
  } finally {
    await runner.release();
  }
};

const handlePaymentFailure = async (intent: Stripe.PaymentIntent) => {
  let meta: Stripe.Metadata | null = intent.metadata;
  // If no metadata on PaymentIntent, try to get it from the associated invoice
  const intentAny = intent as any;
  if ((!meta || !meta.customerId) && intentAny.invoice) {
    try {
      const invoiceId = typeof intentAny.invoice === 'string' ? intentAny.invoice : intentAny.invoice.id;
      const stripeInvoice = await stripe.invoices.retrieve(invoiceId);
      meta = stripeInvoice.metadata;
    } catch (err) {
      console.error('Failed to retrieve invoice metadata:', err);
    }
  }

  if (!meta || !meta.customerId) {
    console.log('Skipping payment_intent.payment_failed: No customerId in metadata');
    return;
  }

  // Parse metadata with validation
  const customerId = parseMetadataNumber(meta.customerId);
  const orderId = parseMetadataNumber(meta.orderId);
  const invoiceId = parseMetadataNumber(meta.invoiceId);
  const paymentMethodId = parseMetadataNumber(meta.paymentMethodId);
  const currencyId = parseMetadataNumber(meta.currencyId);

  // Validate
  if (!customerId || !invoiceId) {
    console.error('Missing required metadata fields for payment failure:', { customerId, invoiceId });
    return;
  }

  // Check Transaction
  const existingSuccessTransaction = await transactionRepo.findOne({
    where: {
      invoiceId: invoiceId,
      status: "completed",
      isDeleted: false
    }
  });

  if (existingSuccessTransaction) {
    return;
  }

  // Check If Failed Transaction Already Recorded
  const existingIntentTransaction = await transactionRepo.findOne({
    where: { reference: intent.id, isDeleted: false }
  });

  if (existingIntentTransaction) {
    return;
  }

  try {
    const customerAmount = (intent.amount || 0) / 100;

    await transactionRepo.save({
      customerId,
      orderId: orderId ?? 0,
      invoiceId,
      amount: customerAmount,
      currencyId: currencyId ?? 0,
      paymentMethodId: paymentMethodId ?? 0,
      reference: intent.id,
      status: "failed",
      description: `Failed: ${intent.last_payment_error?.message || 'Unknown error'}`,
      transactionDate: new Date(),
      isDeleted: false
    });

    // Update Order
    if (orderId) {
      await orderRepo.update({ id: orderId }, { status: "failed" });
    }
    await invoiceRepo.update({ id: invoiceId }, {
      status: "unpaid",
      paymentStatus: "failed"
    });

  } catch (err: any) {
    if (err.code === 'ER_DUP_ENTRY' || err.code === '23505') {
      return;
    }
    throw err;
  }
};

// Handle auto-renewal success
const handleInvoicePaymentSucceeded = async (stripeInvoice: Stripe.Invoice) => {

  const invoiceAny = stripeInvoice as any;

  // Skip if not a subscription invoice
  if (!invoiceAny.subscription) {
    return;
  }

  // Skip (subscription creation)
  if (stripeInvoice.billing_reason === 'subscription_create') {
    return;
  }

  // Metadata from subscription
  const subscriptionId = typeof invoiceAny.subscription === 'string'
    ? invoiceAny.subscription
    : invoiceAny.subscription.id;
  const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
  const meta = stripeSubscription.metadata;

  if (!meta || !meta.customerId) {
    console.log('Skipping invoice.payment_succeeded: No customerId in metadata');
    return;
  }

  // Parse metadata with validation
  const customerId = parseMetadataNumber(meta.customerId);
  const customerPackageId = parseMetadataNumber(meta.customerPackageId);
  const currencyId = parseMetadataNumber(meta.currencyId);

  // Validate
  if (!customerId || !customerPackageId || !currencyId) {
    console.error('Missing required metadata fields for invoice success:', { customerId, customerPackageId, currencyId });
    return;
  }

  const runner = AppDataSource.createQueryRunner();
  await runner.connect();
  await runner.startTransaction();

  try {
    // Get customer
    const customer = await runner.manager.findOne(Customer, {
      where: { id: customerId, isDelete: false }
    });
    if (!customer) {
      throw new Error(`Customer ${customerId} not found`);
    }

    // Get customer package with addOns
    const customerPackage = await runner.manager.findOne(CustomerPackage, {
      where: { id: customerPackageId, isDelete: false }
    });
    if (!customerPackage) {
      throw new Error(`CustomerPackage ${customerPackageId} not found`);
    }

    // Get package
    const pkg = await runner.manager.findOne(Package, {
      where: { id: customerPackage.packageId, isDelete: false, isActive: true }
    });
    if (!pkg) {
      throw new Error(`Package ${customerPackage.packageId} not found`);
    }

    // Get currency
    const currency = await runner.manager.findOne(Currency, {
      where: { id: currencyId, isDelete: false }
    });

    // Get subscription
    const subscription = await runner.manager.findOne(Subscription, {
      where: { customerId, isDelete: false }
    });

    const addOns = customerPackage.addOns || [];
    const billingCycle = pkg.billingCycle.toLowerCase();
    const now = new Date();

    // Calculate prices and discounts
    const packagePrice = billingCycle === "annual" ? Number(pkg.priceYearly ?? 0) : Number(pkg.priceMonthly ?? 0);
    const packageDiscountPercent = pkg.discount ?? 0;
    const packageSubTotal = packagePrice;

    // Build invoice items
    const invoiceItems: any[] = [];
    invoiceItems.push({
      description: `${pkg.name} - ${pkg.billingCycle}`,
      quantity: 1,
      amount: Number(packagePrice.toFixed(2)),
      subTotal: Number(packageSubTotal.toFixed(2)),
      discountType: `${packageDiscountPercent}%`,
      vatRate: "",
      vatType: ""
    });

    // Calculate add-ons
    let addOnsSubTotal = 0;
    let totalDiscountPercent = packageDiscountPercent;

    for (const addOn of addOns) {
      const addOnPrice = billingCycle === "annual" ? Number(addOn.yearlyPrice ?? 0) : Number(addOn.monthlyPrice ?? 0);
      const addOnDiscountPercent = addOn.discount ?? 0;
      const addOnItemSubTotal = addOnPrice;

      invoiceItems.push({
        description: `Add-on: ${addOn.feature || addOn.module}`,
        quantity: 1,
        amount: Number(addOnPrice.toFixed(2)),
        subTotal: Number(addOnItemSubTotal.toFixed(2)),
        discountType: `${addOnDiscountPercent}%`,
        vatRate: "",
        vatType: ""
      });

      addOnsSubTotal += addOnItemSubTotal;
      totalDiscountPercent += addOnDiscountPercent;
    }

    // Calculate totals
    const subTotal = packageSubTotal + addOnsSubTotal;
    const discount = (subTotal * totalDiscountPercent) / 100;
    const total = subTotal - discount;
    const invoiceDiscountType = `${totalDiscountPercent}%`;

    const orderNumber = generateOrderNumber();
    const invoiceNumber = generateInvoiceNumber();

    // Calculate subscription dates
    const startDate = new Date();
    const endDate = new Date(startDate);
    if (billingCycle === "monthly") {
      endDate.setMonth(endDate.getMonth() + 1);
    } else if (billingCycle === "annual") {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    // Create Order
    const order = await runner.manager.save(Order, {
      customerId,
      orderNumber,
      originalOrderNumber: `ORD-${orderNumber}`,
      customOrderNumber: `CUST-ORD-${orderNumber}`,
      orderDate: now.toISOString(),
      subTotal: Number(subTotal.toFixed(2)),
      discount: Number(discount.toFixed(2)),
      discountType: totalDiscountPercent,
      total: Number(total.toFixed(2)),
      status: "completed",
      currencyId,
      note: `Auto-renewal for ${pkg.name}`,
      addedBy: 0,
      isDelete: false
    });

    // Client address
    const addressParts = [
      customer.businessAddress?.buildingNumber || '',
      customer.businessAddress?.buildingName || '',
      customer.businessAddress?.street || '',
      customer.businessAddress?.city || '',
      customer.businessAddress?.county || '',
      customer.businessAddress?.country || ''
    ].filter(part => part.trim() !== '');
    const clientAddress = addressParts.join(', ');

    // Create Invoice
    const invoice = await runner.manager.save(Invoice, {
      invoiceNumber,
      total: Number(total.toFixed(2)),
      amount: Number(total.toFixed(2)),
      status: "paid",
      paymentStatus: "paid",
      plan: pkg.billingCycle,
      customerId,
      customerName: `${customer.firstName || ''} ${customer.lastName || ''}`.trim(),
      customerEmail: customer.email,
      clientAddress,
      currencyId,
      orderId: order.id,
      subTotal: Number(subTotal.toFixed(2)),
      discountValue: Number(discount.toFixed(2)),
      discountType: invoiceDiscountType,
      isDiscount: discount >= 0,
      outstandingBalance: 0,
      dueDate: now,
      IssueDate: now,
      vat: 0,
      items: invoiceItems,
      isDelete: false
    });

    // Create Transaction
    await runner.manager.save(Transaction, {
      customerId,
      orderId: order.id,
      invoiceId: invoice.id,
      amount: total,
      currencyId,
      paymentMethodId: 0,
      reference: invoiceAny.payment_intent || stripeInvoice.id,
      status: "completed",
      description: `Auto-renewal payment for ${pkg.name}`,
      transactionDate: now,
      isDeleted: false
    });

    // Update subscription
    if (subscription) {
      subscription.status = "active";
      subscription.startDate = startDate;
      subscription.endDate = endDate;
      await runner.manager.save(subscription);
    }

    // Update customer status
    await runner.manager.update(Customer, { id: customerId }, {
      status: "Active",
      expiryDate: endDate
    });

    await runner.commitTransaction();

    try {
      const customerInvoice = await invoiceRepo.findOne({ where: { id: invoice?.id } });
      if (customerInvoice && customer && currency) {
        const pdfBytes = await generateInvoicePDF({
          invoice: customerInvoice,
          customer: {
            name: `${customer.firstName} ${customer.lastName}`.trim(),
            email: customer.email,
            phone: `${customer.countryCode}${customer.phoneNumber}`,
            address: clientAddress
          },
          currency
        });

        await sendCustomerInvoiceEmail(
          { name: `${customer.firstName} ${customer.lastName}`.trim(), email: customer.email },
          {
            invoiceNumber: invoice.invoiceNumber,
            outstandingBalance: 0,
            paymentStatus: "paid",
            createdAt: invoice.createdAt,
            dueDate: invoice.dueDate
          },
          pdfBytes,
          {
            currencySymbol: currency.currencySymbol,
            currencyCode: currency.currencyCode,
            exchangeRate: currency.exchangeRate
          }
        );
      }
    } catch (emailError) {
      console.error('Failed to send invoice email:', emailError);
    }

  } catch (err: any) {
    await runner.rollbackTransaction();
    throw err;
  } finally {
    await runner.release();
  }
};

// Handle auto-renewal failure
const handleInvoicePaymentFailed = async (stripeInvoice: Stripe.Invoice) => {

  const invoiceAny = stripeInvoice as any;

  // Skip if not a subscription invoice
  if (!invoiceAny.subscription) {
    return;
  }

  // Metadata from subscription
  const subscriptionId = typeof invoiceAny.subscription === 'string'
    ? invoiceAny.subscription
    : invoiceAny.subscription.id;
  const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
  const meta = stripeSubscription.metadata;

  if (!meta || !meta.customerId) {
    console.log('Skipping invoice.payment_failed: No customerId in metadata');
    return;
  }

  // Parse metadata with validation
  const customerId = parseMetadataNumber(meta.customerId);
  const customerPackageId = parseMetadataNumber(meta.customerPackageId);
  const currencyId = parseMetadataNumber(meta.currencyId);

  // Validate
  if (!customerId || !customerPackageId || !currencyId) {
    console.error('Missing required metadata fields for invoice failure:', { customerId, customerPackageId, currencyId });
    return;
  }

  const runner = AppDataSource.createQueryRunner();
  await runner.connect();
  await runner.startTransaction();

  try {
    // Get customer
    const customer = await runner.manager.findOne(Customer, {
      where: { id: customerId, isDelete: false }
    });
    if (!customer) {
      throw new Error(`Customer ${customerId} not found`);
    }

    // Get customer package with addOns
    const customerPackage = await runner.manager.findOne(CustomerPackage, {
      where: { id: customerPackageId, isDelete: false }
    });
    if (!customerPackage) {
      throw new Error(`CustomerPackage ${customerPackageId} not found`);
    }

    // Get package
    const pkg = await runner.manager.findOne(Package, {
      where: { id: customerPackage.packageId, isDelete: false, isActive: true }
    });
    if (!pkg) {
      throw new Error(`Package ${customerPackage.packageId} not found`);
    }

    // Get currency
    const currency = await runner.manager.findOne(Currency, {
      where: { id: currencyId, isDelete: false }
    });

    // Get subscription
    const subscription = await runner.manager.findOne(Subscription, {
      where: { customerId, isDelete: false }
    });

    const addOns = customerPackage.addOns || [];
    const billingCycle = pkg.billingCycle.toLowerCase();
    const now = new Date();
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + 7);

    // Calculate prices and discounts
    const packagePrice = billingCycle === "annual" ? Number(pkg.priceYearly ?? 0) : Number(pkg.priceMonthly ?? 0);
    const packageDiscountPercent = pkg.discount ?? 0;
    const packageSubTotal = packagePrice;

    // Build invoice items
    const invoiceItems: any[] = [];
    invoiceItems.push({
      description: `${pkg.name} - ${pkg.billingCycle}`,
      quantity: 1,
      amount: Number(packagePrice.toFixed(2)),
      subTotal: Number(packageSubTotal.toFixed(2)),
      discountType: `${packageDiscountPercent}%`,
      vatRate: "",
      vatType: ""
    });

    // Calculate add-ons
    let addOnsSubTotal = 0;
    let totalDiscountPercent = packageDiscountPercent;

    for (const addOn of addOns) {
      const addOnPrice = billingCycle === "annual" ? Number(addOn.yearlyPrice ?? 0) : Number(addOn.monthlyPrice ?? 0);
      const addOnDiscountPercent = addOn.discount ?? 0;
      const addOnItemSubTotal = addOnPrice;

      invoiceItems.push({
        description: `Add-on: ${addOn.feature || addOn.module}`,
        quantity: 1,
        amount: Number(addOnPrice.toFixed(2)),
        subTotal: Number(addOnItemSubTotal.toFixed(2)),
        discountType: `${addOnDiscountPercent}%`,
        vatRate: "",
        vatType: ""
      });

      addOnsSubTotal += addOnItemSubTotal;
      totalDiscountPercent += addOnDiscountPercent;
    }

    // Calculate totals
    const subTotal = packageSubTotal + addOnsSubTotal;
    const discount = (subTotal * totalDiscountPercent) / 100;
    const total = subTotal - discount;
    const invoiceDiscountType = `${totalDiscountPercent}%`;

    const orderNumber = generateOrderNumber();
    const invoiceNumber = generateInvoiceNumber();

    // Create Order
    const order = await runner.manager.save(Order, {
      customerId,
      orderNumber,
      originalOrderNumber: `ORD-${orderNumber}`,
      customOrderNumber: `CUST-ORD-${orderNumber}`,
      orderDate: now.toISOString(),
      subTotal: Number(subTotal.toFixed(2)),
      discount: Number(discount.toFixed(2)),
      discountType: totalDiscountPercent,
      total: Number(total.toFixed(2)),
      status: "incomplete",
      currencyId,
      note: `Failed auto-renewal for ${pkg.name}`,
      addedBy: 0,
      isDelete: false
    });

    // Client address
    const addressParts = [
      customer.businessAddress?.buildingNumber || '',
      customer.businessAddress?.buildingName || '',
      customer.businessAddress?.street || '',
      customer.businessAddress?.city || '',
      customer.businessAddress?.county || '',
      customer.businessAddress?.country || ''
    ].filter(part => part.trim() !== '');
    const clientAddress = addressParts.join(', ');

    // Create Invoice
    const invoice = await runner.manager.save(Invoice, {
      invoiceNumber,
      total: Number(total.toFixed(2)),
      amount: Number(total.toFixed(2)),
      status: "unpaid",
      paymentStatus: "failed",
      plan: pkg.billingCycle,
      customerId,
      customerName: `${customer.firstName || ''} ${customer.lastName || ''}`.trim(),
      customerEmail: customer.email,
      clientAddress,
      currencyId,
      orderId: order.id,
      subTotal: Number(subTotal.toFixed(2)),
      discountValue: Number(discount.toFixed(2)),
      discountType: invoiceDiscountType,
      isDiscount: discount >= 0,
      outstandingBalance: Number(total.toFixed(2)),
      dueDate: dueDate,
      IssueDate: now,
      vat: 0,
      items: invoiceItems,
      isDelete: false
    });

    // Create Transaction
    await runner.manager.save(Transaction, {
      customerId,
      orderId: order.id,
      invoiceId: invoice.id,
      amount: total,
      currencyId,
      paymentMethodId: 0,
      reference: invoiceAny.payment_intent || stripeInvoice.id,
      status: "failed",
      description: `Failed auto-renewal: ${invoiceAny.last_finalization_error?.message || 'Payment failed'}`,
      transactionDate: now,
      isDeleted: false
    });

    // Update subscription status
    if (subscription) {
      subscription.status = "past_due";
      await runner.manager.save(subscription);
    }

    // Update customer status
    await runner.manager.update(Customer, { id: customerId }, {
      status: "Inactive"
    });

    await runner.commitTransaction();

    // Generate PDF and send email for failed payment
    try {
      const customerInvoice = await invoiceRepo.findOne({ where: { id: invoice?.id } });
      if (customerInvoice && customer && currency) {
        const pdfBytes = await generateInvoicePDF({
          invoice: customerInvoice,
          customer: {
            name: `${customer.firstName} ${customer.lastName}`.trim(),
            email: customer.email,
            phone: `${customer.countryCode}${customer.phoneNumber}`,
            address: clientAddress
          },
          currency
        });

        await sendCustomerInvoiceEmail(
          { name: `${customer.firstName} ${customer.lastName}`.trim(), email: customer.email },
          {
            invoiceNumber: invoice.invoiceNumber,
            outstandingBalance: Number(total.toFixed(2)),
            paymentStatus: "failed",
            createdAt: invoice.createdAt,
            dueDate: invoice.dueDate
          },
          pdfBytes,
          {
            currencySymbol: currency.currencySymbol,
            currencyCode: currency.currencyCode,
            exchangeRate: currency.exchangeRate
          }
        );
      }
    } catch (emailError) {
      console.error('Failed to send invoice email:', emailError);
    }
  } catch (err: any) {
    await runner.rollbackTransaction();
    throw err;
  } finally {
    await runner.release();
  }
};

// Handle subscription updated
const handleSubscriptionUpdated = async (stripeSubscription: Stripe.Subscription) => {
  const meta = stripeSubscription.metadata;

  if (!meta || !meta.customerId) {
    console.log('Skipping subscription.updated: No customerId in metadata');
    return;
  }

  const customerId = parseMetadataNumber(meta.customerId);
  if (!customerId) {
    console.error('Invalid customerId in subscription metadata');
    return;
  }

  try {
    // Find subscription
    const subscription = await subscriptionRepo.findOne({
      where: { customerId, isDelete: false }
    });

    if (!subscription) {
      return;
    }

    // Update subscription
    if (stripeSubscription.status === 'active') {
      subscription.status = 'active';
    } else if (stripeSubscription.status === 'past_due') {
      subscription.status = 'past_due';
    } else if (stripeSubscription.status === 'canceled') {
      subscription.status = 'cancelled';
    } else if (stripeSubscription.status === 'unpaid') {
      subscription.status = 'past_due';
    }

    // Update autoRenew
    subscription.autoRenew = !stripeSubscription.cancel_at_period_end;

    // Update dates
    const subAny = stripeSubscription as any;
    if (subAny.current_period_start) {
      subscription.startDate = new Date(subAny.current_period_start * 1000);
    }
    if (subAny.current_period_end) {
      subscription.endDate = new Date(subAny.current_period_end * 1000);
    }

    await subscriptionRepo.save(subscription);

    // Update customer status
    if (subscription.status === 'active') {
      await customerRepo.update({ id: customerId }, {
        status: 'Active',
        expiryDate: subscription.endDate
      });
    } else if (subscription.status === 'past_due' || subscription.status === 'cancelled') {
      await customerRepo.update({ id: customerId }, {
        status: 'Inactive'
      });
    }

  } catch (err) {
    console.error('Error handling subscription update:', err);
  }
};

// Handle subscription cancelled/deleted
const handleSubscriptionDeleted = async (stripeSubscription: Stripe.Subscription) => {
  const meta = stripeSubscription.metadata;

  if (!meta || !meta.customerId) {
    console.log('Skipping subscription.deleted: No customerId in metadata');
    return;
  }

  const customerId = parseMetadataNumber(meta.customerId);
  if (!customerId) {
    console.error('Invalid customerId in subscription metadata');
    return;
  }

  try {
    // Find subscription
    const subscription = await subscriptionRepo.findOne({
      where: { customerId, isDelete: false }
    });

    if (subscription) {
      subscription.status = 'cancelled';
      subscription.autoRenew = false;
      await subscriptionRepo.save(subscription);
    }

    // Update customer status
    await customerRepo.update({ id: customerId }, {
      status: 'Inactive'
    });

    console.log(`Subscription deleted for customer ${customerId}`);
  } catch (err) {
    console.error('Error handling subscription deletion:', err);
  }
};