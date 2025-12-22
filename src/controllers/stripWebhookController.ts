import { Request, Response } from "express";
import { stripe } from "../config/stripe";
import { AppDataSource } from "../config/db";
import { Transaction } from "../entity/Transaction";
import { Order } from "../entity/Order";
import { Invoice } from "../entity/Invioce";
import { Subscription } from "../entity/Subscription";
import { CustomerPackage } from "../entity/CustomerPackage";
import { Package } from "../entity/Package";
import { Customer } from "../entity/Customer";

const transactionRepo = AppDataSource.getRepository(Transaction);
const orderRepo = AppDataSource.getRepository(Order);
const invoiceRepo = AppDataSource.getRepository(Invoice);
const subscriptionRepo = AppDataSource.getRepository(Subscription);
const customerPackageRepo = AppDataSource.getRepository(CustomerPackage);
const packageRepo = AppDataSource.getRepository(Package);
const customerRepo = AppDataSource.getRepository(Customer);

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export const handleStripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] as string;
  
  console.log('Webhook received');
  console.log('Headers:', req.headers);
  
  if (!sig) {
    console.error('No stripe-signature header found');
    return res.status(400).send('No signature header');
  }

  if (!endpointSecret) {
    console.error('STRIPE_WEBHOOK_SECRET not configured');
    return res.status(500).send('Webhook secret not configured');
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    console.log('Webhook signature verified');
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`Event type: ${event.type}`);

  try {
    if (event.type === "payment_intent.succeeded") {
      console.log('Processing payment success...');
      await handlePaymentSuccess(event.data.object);
    } 
    else if (event.type === "payment_intent.payment_failed") {
      console.log('Processing payment failure...');
      await handlePaymentFailure(event.data.object);
    }
    else {
      console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

const handlePaymentSuccess = async (intent: any) => {
  const meta = intent.metadata;

  console.log('Payment metadata:', meta);

  const customerId = Number(meta.customerId);
  const orderId = Number(meta.orderId);
  const invoiceId = Number(meta.invoiceId);
  const customerPackageId = Number(meta.customerPackageId);
  const paymentMethodId = Number(meta.paymentMethodId);
  const currencyId = Number(meta.currencyId);
  const autoRenew = meta.autoRenew === "true";

  // CHECK FOR COMPLETED TRANSACTION BY INVOICE ID
  const existingTransaction = await transactionRepo.findOne({
    where: { 
      invoiceId: invoiceId,
      status: "completed",
      isDeleted: false
    }
  });

  if (existingTransaction) {
    console.log(`Invoice ${invoiceId} already has a completed transaction (${existingTransaction.reference}), skipping...`);
    return;
  }

  const runner = AppDataSource.createQueryRunner();
  await runner.connect();
  await runner.startTransaction();

  try {
    console.log(`Processing payment success for customer ${customerId}, invoice ${invoiceId}`);

    // DOUBLE-CHECK INSIDE TRANSACTION (race condition protection)
    const doubleCheck = await runner.manager.findOne(Transaction, {
      where: { 
        invoiceId: invoiceId,
        status: "completed",
        isDeleted: false
      }
    });

    if (doubleCheck) {
      console.log(`Invoice ${invoiceId} payment already processed by another webhook, skipping...`);
      await runner.rollbackTransaction();
      return;
    }

    // Create Transaction
    try {
      await runner.manager.save(Transaction, {
        customerId,
        orderId,
        invoiceId,
        amount: intent.amount / 100,
        currencyId,
        paymentMethodId,
        reference: intent.id,
        status: "completed",
        description: `Payment for invoice #${invoiceId}`,
        transactionDate: new Date(),
        isDeleted: false
      });
      console.log(`Transaction created for invoice ${invoiceId}, reference: ${intent.id}`);
    } catch (err: any) {
      // Handle any database constraint violations
      if (err.code === 'ER_DUP_ENTRY' || err.code === '23505') {
        console.log('Duplicate transaction detected at DB level, skipping...');
        await runner.rollbackTransaction();
        return;
      }
      throw err;
    }
    const paidOrder = await runner.manager.findOne(Order, {where: {id: orderId, status: "completed", isDelete: false}})
    // Update Order
    if(!paidOrder){
      await runner.manager.update(Order, { id: orderId }, { 
      status: "completed" 
    });
    console.log(`Order ${orderId} completed`);
    }
    else{
      console.log("Order Already Completed");
      
    }
    const paidInvoice = await runner.manager.findOne(Invoice, {where: {id: invoiceId, paymentStatus: "paid", isDelete: false}})
    // Update Invoice
    if(!paidInvoice){
      await runner.manager.update(Invoice, { id: invoiceId }, { 
      status: "paid", 
      paymentStatus: "paid", 
      outstandingBalance: 0 
    });
    console.log(`Invoice ${invoiceId} paid`);
    } else {
      console.log("Invoice Already Paid");
      
    }

    // Get Customer Package & Package
    const customerPackage = await runner.manager.findOne(CustomerPackage, { 
      where: { id: customerPackageId } 
    });
    if (!customerPackage) {
      throw new Error(`CustomerPackage ${customerPackageId} not found`);
    }

    const pkg = await runner.manager.findOne(Package, { 
      where: { id: customerPackage.packageId } 
    });

    if (!pkg) {
      throw new Error(`Package ${customerPackage.packageId} not found`);
    }

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

    console.log(`Subscription dates: ${startDate.toISOString()} to ${endDate.toISOString()}`);

    // Create or Update Subscription
    let subscription = await runner.manager.findOne(Subscription, { 
      where: { customerPackageId: pkg.id, customerId, isDelete: false } 
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
        isDelete: false
      });
      console.log(`New subscription created`);
    } else {
      subscription.status = "active";
      subscription.startDate = startDate;
      subscription.endDate = endDate;
      subscription.autoRenew = autoRenew;
      console.log(`Subscription ${subscription.id} renewed`);
    }

    await runner.manager.save(subscription);

    // Update Customer Status & Expiry
    await runner.manager.update(Customer, { id: customerId }, {
      status: "Active",
      expiryDate: endDate
    });
    console.log(`Customer ${customerId} activated until ${endDate.toISOString()}`);

    await runner.commitTransaction();
    console.log(`Payment processing completed successfully for invoice ${invoiceId}!`);

  } catch (err: any) {
    console.error('Payment processing failed:', err);
    await runner.rollbackTransaction();
    throw err;
  } finally {
    await runner.release();
  }
};

const handlePaymentFailure = async (intent: any) => {
  const meta = intent.metadata;
  const customerId = Number(meta.customerId);
  const orderId = Number(meta.orderId);
  const invoiceId = Number(meta.invoiceId);
  const paymentMethodId = Number(meta.paymentMethodId);
  const currencyId = Number(meta.currencyId);

  console.log(`Processing payment failure for customer ${customerId}, invoice ${invoiceId}`);

  // CHECK IF INVOICE ALREADY HAS A FAILED TRANSACTION
  const existingFailedTransaction = await transactionRepo.findOne({
    where: { 
      invoiceId: invoiceId,
      status: "failed",
      isDeleted: false
    },
    order: { transactionDate: 'DESC' } // Get the most recent one
  });

  // CHECK IF INVOICE WAS ALREADY PAID
  const existingSuccessTransaction = await transactionRepo.findOne({
    where: { 
      invoiceId: invoiceId,
      status: "completed",
      isDeleted: false
    }
  });

  if (existingSuccessTransaction) {
    console.log(`Invoice ${invoiceId} is already paid, ignoring failure webhook`);
    return;
  }

  // Allow recording multiple failed attempts, but check if this specific intent was already recorded
  const existingIntentTransaction = await transactionRepo.findOne({
    where: { reference: intent.id }
  });

  if (existingIntentTransaction) {
    console.log(`Failed transaction for intent ${intent.id} already recorded`);
    return;
  }

  try {
    // Create failed transaction record
    try {
      await transactionRepo.save({
        customerId,
        orderId,
        invoiceId,
        amount: (intent.amount || 0) / 100,
        currencyId,
        paymentMethodId,
        reference: intent.id,
        status: "failed",
        description: `Failed: ${intent.last_payment_error?.message || 'Unknown error'}`,
        transactionDate: new Date(),
        isDeleted: false
      });
      console.log(`Failed transaction recorded for invoice ${invoiceId}`);
    } catch (err: any) {
      // Handle duplicate key error
      if (err.code === 'ER_DUP_ENTRY' || err.code === '23505') {
        console.log('Duplicate failed transaction detected, skipping...');
        return;
      }
      throw err;
    }

    // Only update order/invoice status if no successful payment exists
    await orderRepo.update({ id: orderId }, { status: "failed" });

    await invoiceRepo.update({ id: invoiceId }, { 
      status: "unpaid", 
      paymentStatus: "failed" 
    });

    console.log(`Payment failed for invoice ${invoiceId}`);
  } catch (err) {
    console.error('Error handling payment failure:', err);
  }
};