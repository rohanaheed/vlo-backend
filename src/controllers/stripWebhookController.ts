import { Request, Response } from "express";
import { stripe } from "../config/stripe";
import { AppDataSource } from "../config/db";
import { Payment } from "../entity/payment";

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
  const paymentRepo = AppDataSource.getRepository(Payment);
  const paymentInstance = paymentRepo.create({
    paymentMethod: payment.payment_method_types[0],
    customerId: payment.customer as string,
    name: payment.metadata?.name || "N/A",
    amount: payment.amount_received / 100, // Convert from cents
    transactionId: payment.id,
    isDelete: false,
  });
  const newPayment = paymentRepo.create(paymentInstance);
  await paymentRepo.save(newPayment);
};
