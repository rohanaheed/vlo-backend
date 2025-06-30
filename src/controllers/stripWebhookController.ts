import { Request, Response } from "express";
import { stripe } from "../config/stripe";
import { AppDataSource } from "../config/db";
import { PaymentMethod } from "../entity/PaymentMethod";

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || "whsec_...";

export const handleStripeWebhook = async (req: Request, res: Response): Promise<any> => {
  const sig = req.headers["stripe-signature"] as string;
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case "invoice.payment_succeeded":
      const invoice = event.data.object;
      await savePayment(invoice);
      console.log("Payment succeeded:", invoice);
      break;
    case "customer.subscription.created":
      const subscription = event.data.object;
      await savePayment(subscription);
      console.log("Subscription created:", subscription);
      break;
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
};


const savePayment = async (payment: any) => {
  const paymentRepo = AppDataSource.getRepository(PaymentMethod);
  const paymentMethodData = {
    paymentMethod: payment.payment_method_types?.[0] || "unknown",
    customerId: String(payment.customer),
    name: payment.metadata?.name ?? "N/A",
    amount: payment.amount_received ? payment.amount_received / 100 : 0, // Convert from cents, default to 0
    transactionId: payment.id,
    isDelete: false,
  };
  const newPaymentMethod = paymentRepo.create(paymentMethodData);
  await paymentRepo.save(newPaymentMethod);
};



export const createPaymentIntent = async (req: Request, res: Response): Promise<any> => {
  const { amount, currency, customerId } = req.body;

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // amount in cents
      currency: currency || "usd",
      customer: customerId,
      payment_method_types: ["card"],
    });

    return res.status(200).json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to create payment intent" });
  }
};
