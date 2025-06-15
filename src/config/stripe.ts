import Stripe from "stripe";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "your_stripe_secret";

export const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2025-05-28.basil" as any, 
});
