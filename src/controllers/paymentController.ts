import { Request, Response } from "express";
import Stripe from "stripe";
import { stripe } from "../config/stripe";
import { AppDataSource } from "../config/db";
import { PaymentMethod } from "../entity/PaymentMethod";
import { Order } from "../entity/Order";
import { Invoice } from "../entity/Invioce";
import { CustomerPackage } from "../entity/CustomerPackage";
import { Package } from "../entity/Package";
import { Currency } from "../entity/Currency";
import { Customer } from "../entity/Customer";
import * as crypto from 'crypto';
import {
  getOrCreateStripeCustomer,
  createStripeInvoiceItems,
  createStripeInvoice,
  finalizeStripeInvoice,
} from "../utils/stripUtils";
import { paymentNowSchema } from "../utils/validators/inputValidator";

const orderRepo = AppDataSource.getRepository(Order);
const invoiceRepo = AppDataSource.getRepository(Invoice);
const customerPackageRepo = AppDataSource.getRepository(CustomerPackage);
const packageRepo = AppDataSource.getRepository(Package);
const currencyRepo = AppDataSource.getRepository(Currency);
const paymentRepo = AppDataSource.getRepository(PaymentMethod);
const customerRepo = AppDataSource.getRepository(Customer);

const algorithm = 'aes-256-cbc';
const secretKey = crypto.createHash('sha256').update(process.env.ENCRYPTION_KEY || '32-char-secret-key!!').digest();

const decrypt = (encryptedText: string) => {
  const [ivHex, encrypted] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(algorithm, secretKey, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

// Country Names to ISO code
function convertCountryToISO(countryName: string): string {
  const countryMap: Record<string, string> = {
    'united states': 'US',
    'usa': 'US',
    'united kingdom': 'GB',
    'uk': 'GB',
    'pakistan': 'PK',
    'india': 'IN',
    'canada': 'CA',
    'australia': 'AU',
    'germany': 'DE',
    'france': 'FR',
    'spain': 'ES',
    'italy': 'IT',
    'japan': 'JP',
    'china': 'CN',
    'brazil': 'BR',
    'mexico': 'MX',
    'russia': 'RU',
    'south africa': 'ZA',
    'nigeria': 'NG',
    'egypt': 'EG',
    'saudi arabia': 'SA',
    'uae': 'AE',
    'united arab emirates': 'AE',
    'turkey': 'TR',
    'netherlands': 'NL',
    'belgium': 'BE',
    'switzerland': 'CH',
    'sweden': 'SE',
    'norway': 'NO',
    'denmark': 'DK',
    'poland': 'PL',
    'ireland': 'IE',
    'new zealand': 'NZ',
    'singapore': 'SG',
    'malaysia': 'MY',
    'indonesia': 'ID',
    'philippines': 'PH',
    'thailand': 'TH',
    'vietnam': 'VN',
    'south korea': 'KR',
    'argentina': 'AR',
    'chile': 'CL',
    'colombia': 'CO',
    'portugal': 'PT',
    'greece': 'GR',
    'czech republic': 'CZ',
    'austria': 'AT',
    'romania': 'RO',
    'hungary': 'HU',
    'israel': 'IL',
    'bangladesh': 'BD',
    'sri lanka': 'LK',
    'nepal': 'NP',
  };

  const normalized = countryName.toLowerCase().trim();
  
  if (/^[A-Z]{2}$/.test(countryName)) {
    return countryName;
  }

  if (/^[a-z]{2}$/.test(countryName)) {
    return countryName.toUpperCase();
  }

  const isoCode = countryMap[normalized];
  if (isoCode) {
    return isoCode;
  }

  throw new Error(`Invalid country: "${countryName}". Please provide a valid country name or ISO code.`);
}


export const paymentNow = async (req: Request, res: Response): Promise<any> => {
  try {
    // Validate
    const { error, value } = paymentNowSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { customerId, orderId, invoiceId, paymentMethodId, autoRenew } = value;

    // Get payment method
    const paymentMethod = await paymentRepo.findOne({
      where: {
        id: paymentMethodId,
        customerId: String(customerId),
        isDelete: false,
        isActive: true
      }
    });

    if (!paymentMethod) {
      return res.status(404).json({
        success: false,
        message: "No active payment method found"
      });
    }

    // Get invoice
    const invoice = await invoiceRepo.findOne({ where: { id: invoiceId, paymentStatus:"pending", isDelete: false } });
    if (!invoice) {
      return res.status(404).json({ success: false, message: "Invoice not found or Invoice already paid" });
    }

    // Get order
    let order: Order | null = null;
    if (orderId) {
      order = await orderRepo.findOne({ where: { id: orderId, status: "pending", isDelete: false } });
      if (!order) {
        return res.status(404).json({ success: false, message: "Order not found or order already paid" });
      }
    }

    // Get customer
    const customer = await customerRepo.findOne({
      where: { id: customerId, isDelete: false }
    });
    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    // Get customer package
    const customerPackage = await customerPackageRepo.findOne({
      where: { customerId, isDelete: false }
    });
    if (!customerPackage) {
      return res.status(404).json({
        success: false,
        message: "Customer package not found"
      });
    }

    // Get package
    const pkg = await packageRepo.findOne({ where: { id: customerPackage.packageId } });
    if (!pkg) {
      return res.status(404).json({ success: false, message: "Package not found" });
    }

    // Get currency
    const currency = await currencyRepo.findOne({ where: { id: customer.currencyId } });
    if (!currency) {
      return res.status(404).json({ success: false, message: "Currency not found" });
    }

    // Update order status
    if (order) {
      await orderRepo.update({ id: orderId }, { status: "processing" });
    }

    // Process payment based on payment method
    if (paymentMethod.paymentMethod.toLowerCase() === "stripe") {
      const result = await processStripePayment(
        paymentMethod,
        invoice,
        order,
        customer,
        customerPackage,
        currency,
        pkg,
        autoRenew
      );

      return res.status(200).json(result);
    } 
    else if (paymentMethod.paymentMethod.toLowerCase() === "paypal") {
      return res.status(501).json({ 
        success: false, 
        message: "PayPal payment not yet implemented" 
      });
    }
    else {
      return res.status(400).json({ 
        success: false, 
        message: `Unsupported payment method: ${paymentMethod.paymentMethod}` 
      });
    }

  } catch (err: any) {
    console.error('Payment processing error:', err);
    return res.status(500).json({
      success: false,
      message: "Payment processing failed. Please try again or contact support."
    });
  }
};

async function processStripePayment(
  paymentMethod: PaymentMethod,
  invoice: Invoice,
  order: Order | null,
  customer: Customer,
  customerPackage: CustomerPackage,
  currency: Currency,
  pkg: Package,
  autoRenew: boolean
): Promise<{
  success: boolean;
  message: string;
  clientSecret?: string;
  paymentIntentId?: string;
  status?: string;
  requiresAction?: boolean;
  nextActionUrl?: string;
  error?: string;
  errorCode?: string;
  errorType?: string;
}> {
  try {
    // Decrypt card details
    const cardNumber = decrypt(paymentMethod.cardNumber);
    const cardExpiryDate = decrypt(paymentMethod.cardExpiryDate);
    const cardCvv = decrypt(paymentMethod.cardCvv);

    const expiryMatch = cardExpiryDate.match(/(\d{2})\/?(\d{2})/);
    if (!expiryMatch) {
      throw new Error("Invalid card expiry date format. Expected MM/YY or MMYY");
    }
    const expMonth = parseInt(expiryMatch[1]);
    const expYear = parseInt(`20${expiryMatch[2]}`);

    // Validate expiry
    if (expMonth < 1 || expMonth > 12) {
      throw new Error("Invalid expiry month. Must be between 01 and 12");
    }

    // Convert country to ISO code
    if (!paymentMethod.country) {
      throw new Error("Payment method country is required");
    }
    const countryCode = convertCountryToISO(paymentMethod.country);

    // Create Stripe payment method using customers card details
    let stripePaymentMethod: Stripe.PaymentMethod;

    // Check Test mode
    const isTestMode = process.env.STRIPE_SECRET_KEY?.includes('test');

    if (isTestMode) {
      const testTokens: Record<string, string> = {
        '4242424242424242': 'pm_card_visa',
        '5555555555554444': 'pm_card_mastercard',
        '378282246310005': 'pm_card_amex',
        '4000000000000002': 'pm_card_chargeDeclined',
        '4000000000009995': 'pm_card_visa_debit',
      };

      const testToken = testTokens[cardNumber] || 'pm_card_visa';
      stripePaymentMethod = await stripe.paymentMethods.retrieve(testToken);
    } else {
      try {
        stripePaymentMethod = await stripe.paymentMethods.create({
          type: 'card',
          card: {
            number: cardNumber,
            exp_month: expMonth,
            exp_year: expYear,
            cvc: cardCvv,
          },
          billing_details: {
            name: paymentMethod.cardHolderName,
            email: customer.email,
            address: {
              postal_code: paymentMethod.zipCode,
              country: countryCode,
            },
          },
        });
      } catch (error: any) {
        if (error.code === 'card_declined') {
          throw new Error('Card was declined. Please use a different payment method.');
        } else if (error.code === 'incorrect_number') {
          throw new Error('Card number is incorrect. Please check and try again.');
        } else if (error.code === 'invalid_expiry_month' || error.code === 'invalid_expiry_year') {
          throw new Error('Card expiry date is invalid.');
        } else if (error.code === 'invalid_cvc') {
          throw new Error('Card CVC is invalid.');
        } else if (error.message.includes('raw card data')) {
          throw new Error(
            'Raw card data API is not enabled in your Stripe account. ' +
            'Please enable it in Stripe Dashboard: Settings > Integration > Enable raw card data APIs'
          );
        }
        throw error;
      }
    }

    // Create or get Stripe customer
    const stripeCustomer = await getOrCreateStripeCustomer({
      id: customer.id,
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName,
      stripeCustomerId: customer.stripeCustomerId
    });
      if (!customer.stripeCustomerId) {
        await customerRepo.update(customer.id, {
          stripeCustomerId: stripeCustomer.id,
        });
      }

    // Attach payment method to customer
    try {
      await stripe.paymentMethods.attach(stripePaymentMethod.id, {
        customer: stripeCustomer.id,
      });
    } catch (error: any) {
      // Ignore if already attached
      if (error.code !== 'resource_already_exists') {
        throw error;
      }
    }

    // Set as default payment method for customer
    await stripe.customers.update(stripeCustomer.id, {
      invoice_settings: {
        default_payment_method: stripePaymentMethod.id,
      },
    });

    const currencyCode = currency.currencyCode.toLowerCase();

    // Calculate the total amount to charge
    const amountInCents = Math.round(Number(invoice.total) * 100);

    // Build metadata for webhook processing
    const paymentMetadata: Record<string, string> = {
      customerId: String(customer.id),
      invoiceId: String(invoice.id),
      customerPackageId: String(customerPackage.id),
      paymentMethodId: String(paymentMethod.id),
      currencyId: String(currency.id),
      packageId: String(pkg.id),
      packageName: pkg.name || "",
      billingCycle: pkg.billingCycle || "Monthly",
      autoRenew: String(autoRenew),
      localInvoiceNumber: invoice.invoiceNumber || "",
    };

    // Add orderId only if order exists
    if (order) {
      paymentMetadata.orderId = String(order.id);
    }

    const idempotencyKey = `payment_${invoice.id}_${paymentMethod.id}_${amountInCents}`;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: currencyCode,
      customer: stripeCustomer.id,
      payment_method: stripePaymentMethod.id,
      metadata: paymentMetadata,
      description: `Payment for Invoice #${invoice.invoiceNumber}`,
      confirm: true,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never',
      },
    },
    {
      idempotencyKey,
    }
   );


    // Create Stripe invoice
    try {
      // Build invoice items
      const stripeInvoiceItems: { description: string; amount: number }[] = [];

      const invoiceItems = invoice.items || [];
      for (const item of invoiceItems) {
        const itemAmount = Number(item.amount ?? 0);
        const itemQuantity = Number(item.quantity ?? 1);
        const lineTotal = itemAmount * itemQuantity;

        if (lineTotal > 0) {
          stripeInvoiceItems.push({
            description: item.description || "Invoice Item",
            amount: lineTotal,
          });
        }
      }

      // Create invoice items
      await createStripeInvoiceItems({
        stripeCustomerId: stripeCustomer.id,
        currency: currencyCode,
        items: stripeInvoiceItems,
      });

      // Handle discount
      const invoiceCouponIds: (string | null)[] = [];

      if (invoice.isDiscount && Number(invoice.discountValue) > 0) {
        // Create a one-time coupon for the invoice discount
        const discountCoupon = await stripe.coupons.create({
          percent_off: invoice.discountType === "percentage" ? Number(invoice.discountValue) : undefined,
          amount_off: invoice.discountType !== "percentage" ? Math.round(Number(invoice.discountValue) * 100) : undefined,
          currency: invoice.discountType !== "percentage" ? currencyCode : undefined,
          duration: "once",
          metadata: {
            invoiceId: String(invoice.id),
            invoiceNumber: invoice.invoiceNumber || "",
          },
        });
        invoiceCouponIds.push(discountCoupon.id);
      }

      // Create and finalize invoice
      const stripeInvoice = await createStripeInvoice({
        stripeCustomerId: stripeCustomer.id,
        couponIds: invoiceCouponIds.length > 0 ? invoiceCouponIds : undefined,
        metadata: {
          ...paymentMetadata,
          paymentIntentId: paymentIntent.id,
          paidViaPaymentIntent: "true",
        },
        description: `Invoice #${invoice.invoiceNumber || invoice.id}`,
      });

      if (stripeInvoice?.id) {
        await finalizeStripeInvoice(stripeInvoice.id);
        // Mark as paid since
        await stripe.invoices.pay(stripeInvoice.id, {
          paid_out_of_band: true,
        });
      }
    } catch (invoiceError: any) {
      console.error('Failed to create Stripe dashboard invoice:', invoiceError.message);
    }

    // Handle PaymentIntent status
    if (paymentIntent.status === 'succeeded') {
      return {
        success: true,
        clientSecret: paymentIntent.client_secret ?? undefined,
        paymentIntentId: paymentIntent.id,
        status: 'succeeded',
        message: "Payment succeeded"
      };
    } else if (paymentIntent.status === 'requires_action') {
      return {
        success: true,
        clientSecret: paymentIntent.client_secret ?? undefined,
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
        requiresAction: true,
        message: "Payment requires additional authentication",
        nextActionUrl: paymentIntent.next_action?.redirect_to_url?.url ?? undefined
      };
    } else if (paymentIntent.status === 'processing') {
      return {
        success: true,
        clientSecret: paymentIntent.client_secret ?? undefined,
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
        message: "Payment is processing"
      };
    } else {
      return {
        success: false,
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
        message: "Payment could not be completed",
        error: paymentIntent.last_payment_error?.message
      };
    }

  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Payment processing failed",
      errorCode: error.code,
      errorType: error.type
    };
  }
}