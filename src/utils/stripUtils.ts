import { stripe } from "../config/stripe";

export const createStripeCustomer = async (email: string, name?: string) => {
  const customer = await stripe.customers.create({
    email,
    name,
  });
  return customer;
};

export const createStripeSubscription = async (customerId: string, priceId: string) => {
  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    payment_behavior: "default_incomplete",
    expand: ["latest_invoice.payment_intent"],
  });

  return subscription;
};

export const retrieveStripeCustomer = async (customerId: string) => {
  return await stripe.customers.retrieve(customerId);
};
