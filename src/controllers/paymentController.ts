import { Request, Response } from "express";
import { stripe } from "../config/stripe";
import { AppDataSource } from "../config/db";
import { PaymentMethod } from "../entity/PaymentMethod";
import { Order } from "../entity/Order";
import { Invoice } from "../entity/Invioce";
import { CustomerPackage } from "../entity/CustomerPackage";
import { Package } from "../entity/Package";
import { Currency } from "../entity/Currency";
import { Customer } from "../entity/Customer";
import { Subscription } from "../entity/Subscription";
import * as crypto from 'crypto';

const orderRepo = AppDataSource.getRepository(Order);
const invoiceRepo = AppDataSource.getRepository(Invoice);
const customerPackageRepo = AppDataSource.getRepository(CustomerPackage);
const packageRepo = AppDataSource.getRepository(Package);
const currencyRepo = AppDataSource.getRepository(Currency);
const paymentRepo = AppDataSource.getRepository(PaymentMethod);
const customerRepo = AppDataSource.getRepository(Customer);
const subscriptionRepo = AppDataSource.getRepository(Subscription);

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

// ─────────── COUNTRY NAME TO ISO CODE CONVERTER ───────────
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
  
  // If already 2 letters and uppercase, return as is
  if (/^[A-Z]{2}$/.test(countryName)) {
    return countryName;
  }
  
  // If already 2 letters lowercase, return uppercase
  if (/^[a-z]{2}$/.test(countryName)) {
    return countryName.toUpperCase();
  }
  
  // Look up in map
  const isoCode = countryMap[normalized];
  if (isoCode) {
    return isoCode;
  }
  
  // Default to US if not found
  console.warn(`Country "${countryName}" not found in map, defaulting to US`);
  return 'US';
}

// ─────────── PAYMENT NOW ───────────
export const paymentNow = async (req: Request, res: Response): Promise<any> => {
  try {
    const { customerId, orderId, invoiceId, paymentMethodId, autoRenew = true } = req.body;

    console.log('📥 Payment request received:', { customerId, orderId, invoiceId });

    // Validation
    if (!customerId || !orderId || !invoiceId) {
      return res.status(400).json({
        success: false,
        message: "Required fields: customerId, orderId, invoiceId"
      });
    }

    // Get payment method
    let paymentMethod: PaymentMethod | null = null;

    if (paymentMethodId) {
      paymentMethod = await paymentRepo.findOne({ 
        where: { 
          id: paymentMethodId, 
          customerId: String(customerId),
          isDelete: false,
          isActive: true 
        } 
      });
    } else {
      paymentMethod = await paymentRepo.findOne({ 
        where: { 
          customerId: String(customerId), 
          isDefault: true, 
          isDelete: false,
          isActive: true 
        } 
      });
    }

    if (!paymentMethod) {
      return res.status(404).json({ 
        success: false, 
        message: "No active payment method found" 
      });
    }

    // Get invoice
    const invoice = await invoiceRepo.findOne({ where: { id: invoiceId, paymentStatus:"unpaid", isDelete: false } });
    if (!invoice) {
      return res.status(404).json({ success: false, message: "Invoice not found or Invoice already paid" });
    }

    // Get order
    const order = await orderRepo.findOne({ where: { id: orderId, status:"pending", isDelete: false } });
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found or order already paid" });
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

    // Validate amount
    if (invoice.amount <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid invoice amount" 
      });
    }

    // Update order status to 'processing' before payment
    await orderRepo.update({ id: orderId }, { status: "processing" });
    console.log('Order status updated to processing');

    // Process payment based on gateway
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
      
      console.log('Payment intent created:', result.paymentIntentId);
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
      message: err.message || "Payment processing failed" 
    });
  }
};

// ─────────── PROCESS STRIPE PAYMENT ───────────
async function processStripePayment(
  paymentMethod: PaymentMethod,
  invoice: any,
  order: any,
  customer: any,
  customerPackage: any,
  currency: any,
  pkg: any,
  autoRenew: boolean
): Promise<any> {
  try {
    console.log('Starting Stripe payment process...');
    
    // Decrypt card details
    const cardNumber = decrypt(paymentMethod.cardNumber);
    const cardExpiryDate = decrypt(paymentMethod.cardExpiryDate);
    const cardCvv = decrypt(paymentMethod.cardCvv);

    console.log('Card details decrypted');

    // Parse expiry date (supports MM/YY or MMYY format)
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
    const countryCode = convertCountryToISO(paymentMethod.country || 'GB');
    console.log(`Country code: ${countryCode}`);

    // Create Stripe payment method
    let stripePaymentMethod;
    
    // Check if we're in test mode
    const isTestMode = process.env.STRIPE_SECRET_KEY?.includes('test');
    
    if (isTestMode) {
      console.log('Test mode detected - Using Stripe test payment methods');
      
      const testTokens: Record<string, string> = {
        '4242424242424242': 'pm_card_visa',           // Successful payment
        '5555555555554444': 'pm_card_mastercard',     // Successful payment
        '378282246310005': 'pm_card_amex',            // Successful payment
        '4000000000000002': 'pm_card_chargeDeclined', // Declined payment
        '4000000000009995': 'pm_card_visa_debit',     // Debit card
      };

      const testToken = testTokens[cardNumber];
      if (testToken) {
        stripePaymentMethod = await stripe.paymentMethods.retrieve(testToken);
        console.log(`Using test payment method: ${testToken}`);
      } else {
        // Fallback to default test card
        console.log(`Unknown test card ${cardNumber}, using default pm_card_visa`);
        stripePaymentMethod = await stripe.paymentMethods.retrieve('pm_card_visa');
      }
      
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
        console.log(`Payment method created: ${stripePaymentMethod.id}`);
      } catch (error: any) {
        console.error('Failed to create payment method:', error.message);
        
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
    let stripeCustomer;
    try {
      // Try to find existing customer by email
      const customers = await stripe.customers.list({
        email: customer.email,
        limit: 1,
      });
      
      if (customers.data.length > 0) {
        stripeCustomer = customers.data[0];
        console.log('👤 Found existing Stripe customer:', stripeCustomer.id);
      } else {
        // Create new customer
        stripeCustomer = await stripe.customers.create({
          email: customer.email,
          name: `${customer.firstName} ${customer.lastName}`,
          phone: customer.phoneNumber || undefined,
          metadata: {
            customerId: String(customer.id),
            businessName: customer.businessName || '',
          },
        });
        console.log('Created new Stripe customer:', stripeCustomer.id);
      }
    } catch (error: any) {
      console.error('Error finding customer, creating new one:', error.message);
      stripeCustomer = await stripe.customers.create({
        email: customer.email,
        name: `${customer.firstName} ${customer.lastName}`,
        phone: customer.phoneNumber || undefined,
        metadata: {
          customerId: String(customer.id),
          businessName: customer.businessName || '',
        },
      });
      console.log('Created new Stripe customer:', stripeCustomer.id);
    }

    // Attach payment method to customer
    try {
      await stripe.paymentMethods.attach(stripePaymentMethod.id, {
        customer: stripeCustomer.id,
      });
      console.log('Payment method attached to customer');
    } catch (error: any) {
      if (error.code === 'resource_already_exists') {
        console.log('Payment method already attached to customer');
      } else {
        throw error;
      }
    }

    // Set as default payment method for customer
    await stripe.customers.update(stripeCustomer.id, {
      invoice_settings: {
        default_payment_method: stripePaymentMethod.id,
      },
    });
    console.log('Set as default payment method');

    // Create payment intent
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(invoice.amount * 100), // Convert to cents
      currency: currency.currencyCode.toLowerCase(),
      customer: stripeCustomer.id,
      payment_method: stripePaymentMethod.id,
      confirm: true, // Auto-confirm the payment
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never'
      },
      description: `Payment for Invoice #${invoice.invoiceNumber || invoice.id}`,
      metadata: {
        customerId: String(customer.id),
        orderId: String(order.id),
        invoiceId: String(invoice.id),
        customerPackageId: String(customerPackage.id),
        paymentMethodId: String(paymentMethod.id),
        currencyId: String(currency.id),
        packageId: String(pkg.id),
        packageName: pkg.packageName || "",
        billingCycle: pkg.billingCycle || "Monthly",
        autoRenew: String(autoRenew),
      }
    });

    console.log(`Payment Intent created: ${intent.id}`);
    console.log(`Status: ${intent.status}`);

    if (intent.status === 'succeeded') {
      console.log('Payment succeeded immediately!');
      return {
        success: true,
        clientSecret: intent.client_secret,
        paymentIntentId: intent.id,
        status: intent.status,
        message: "Payment succeeded! Webhook will update records.",
        note: "Database will be updated via webhook"
      };
    } else if (intent.status === 'requires_action') {
      console.log('Payment requires additional authentication (3D Secure)');
      return {
        success: true,
        clientSecret: intent.client_secret,
        paymentIntentId: intent.id,
        status: intent.status,
        requiresAction: true,
        message: "Payment requires additional authentication",
        nextActionUrl: intent.next_action?.redirect_to_url?.url
      };
    } else if (intent.status === 'processing') {
      console.log('Payment is processing...');
      return {
        success: true,
        clientSecret: intent.client_secret,
        paymentIntentId: intent.id,
        status: intent.status,
        message: "Payment is processing. You will be notified when complete."
      };
    } else {
      console.log(`Unexpected payment status: ${intent.status}`);
      return {
        success: false,
        paymentIntentId: intent.id,
        status: intent.status,
        message: "Payment could not be completed",
        error: intent.last_payment_error?.message
      };
    }

  } catch (error: any) {
    console.error('Stripe payment error:', error);
    
    // Return user-friendly error messages
    return {
      success: false,
      message: error.message || "Payment processing failed",
      errorCode: error.code,
      errorType: error.type
    };
  }
}