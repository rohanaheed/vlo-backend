import { stripe } from "../config/stripe";
import { AppDataSource } from "../config/db";
import { Customer } from "../entity/Customer";

const customerRepo = AppDataSource.getRepository(Customer);

// Stripe Customer
export const getOrCreateStripeCustomer = async (customer: {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  stripeCustomerId?: string | null;
}) => {
  // If stripeCustomerId exists, retrieve the customer
  if (customer.stripeCustomerId) {
    const existingCustomer = await stripe.customers.retrieve(customer.stripeCustomerId);

    // Check if customer deleted in Stripe
    if ('deleted' in existingCustomer && existingCustomer.deleted) {
      // Create New
      const newStripeCustomer = await stripe.customers.create({
        email: customer.email,
        name: `${customer.firstName || ""} ${customer.lastName || ""}`.trim(),
        metadata: { customerId: String(customer.id) },
      });

      await customerRepo.update(customer.id, {
        stripeCustomerId: newStripeCustomer.id,
      });

      return newStripeCustomer;
    }

    return existingCustomer;
  }

  // Create new Stripe customer
  const stripeCustomer = await stripe.customers.create({
    email: customer.email,
    name: `${customer.firstName || ""} ${customer.lastName || ""}`.trim(),
    metadata: { customerId: String(customer.id) },
  });

  // Save
  await customerRepo.update(customer.id, {
    stripeCustomerId: stripeCustomer.id,
  });

  return stripeCustomer;
};

// Stripe Products
export const createStripeProduct = async ({
  name,
  description,
  metadata,
}: {
  name: string;
  description?: string;
  metadata?: Record<string, string>;
}) => {
  return await stripe.products.create({
    name,
    description,
    metadata,
  });
};

export const findStripeAddOnProduct = async (
  module: string,
  feature?: string
) => {
  const key = feature ? `${module}::${feature}` : module;

  const products = await stripe.products.search({
    query: `metadata['addonKey']:'${key}'`,
    limit: 1,
  });

  return products.data.length ? products.data[0] : null;
};

export const updateStripeProduct = async ({
  productId,
  name,
  description,
  metadata,
}: {
  productId: string;
  name?: string;
  description?: string;
  metadata?: Record<string, string>;
}) => {
  return await stripe.products.update(productId, {
    name,
    description,
    metadata,
  });
};

// Stripe Prices
export const createStripePrice = async ({
  productId,
  amount,
  currency,
  interval,
  oldPriceId,
  metadata,
}: {
  productId: string;
  amount: number;
  currency: string;
  interval: "month" | "year";
  oldPriceId?: string | null;
  metadata?: Record<string, string>;
}) => {

  if (oldPriceId) {
    await stripe.prices.update(oldPriceId, {
      active: false,
      metadata: { ...metadata, isCurrent: "false" },
    });
  }

  return await stripe.prices.create({
    product: productId,
    unit_amount: Math.round(amount * 100),
    currency: currency.toLowerCase(),
    recurring: { interval },
    metadata: { ...metadata, isCurrent: "true" },
  });
};

// Archive/deactivate a Stripe Prices
export const archiveStripePrice = async (priceId: string | null | undefined) => {
  if (!priceId) return;

  try {
    await stripe.prices.update(priceId, { active: false });
  } catch (err) {
    console.warn(`Could not archive price ${priceId}:`, err);
  }
};

// Find Existing Prices
export const findExistingPrice = async (
  productId: string,
  interval: "month" | "year"
): Promise<{ id: string; unit_amount: number | null } | null> => {
  try {
    const prices = await stripe.prices.list({
      product: productId,
      active: true,
      type: "recurring",
      limit: 100,
    });

    // Finf By Interval
    const matchingPrices = prices.data.filter(
      (p) => p.recurring?.interval === interval
    );

    if (matchingPrices.length === 0) return null;

    // Mark Current price
    const currentPrice = matchingPrices.find(
      (p) => p.metadata?.isCurrent === "true"
    );

    if (currentPrice) {
      return { id: currentPrice.id, unit_amount: currentPrice.unit_amount };
    }

    // Otherwise return the most recently created matching price
    const sortedPrices = matchingPrices.sort((a, b) => b.created - a.created);
    return { id: sortedPrices[0].id, unit_amount: sortedPrices[0].unit_amount };
  } catch (err) {
    console.warn(`Could not find prices for product ${productId}:`, err);
    return null;
  }
};

// Find Existing Coupons
export const findExistingCoupon = async (
  addonKey: string
): Promise<{ id: string; percent_off: number | null } | null> => {
  try {
    const coupons = await stripe.coupons.list({ limit: 100 });

    // Filter coupons that match the addonKey
    const matchingCoupons = coupons.data.filter(
      (c) => c.metadata?.addonKey === addonKey
    );

    if (matchingCoupons.length === 0) return null;

    // Mark Current coupon
    const currentCoupon = matchingCoupons.find(
      (c) => c.metadata?.isCurrent === "true"
    );

    if (currentCoupon) {
      return { id: currentCoupon.id, percent_off: currentCoupon.percent_off };
    }

    // Return the most recently created
    const sortedCoupons = matchingCoupons.sort((a, b) => b.created - a.created);
    return { id: sortedCoupons[0].id, percent_off: sortedCoupons[0].percent_off };
  } catch (err) {
    console.warn(`Could not find coupon for addon ${addonKey}:`, err);
    return null;
  }
};

// Archive/deactivate a Stripe Product
export const archiveStripeProduct = async (productId: string | null | undefined) => {
  if (!productId) return;

  try {
    await stripe.products.update(productId, { active: false });
  } catch (err) {
    console.warn(`Could not archive product ${productId}:`, err);
  }
};

// Archive/deactivate a Stripe Coupon
export const archiveStripeCoupon = async (couponId: string | null | undefined) => {
  if (!couponId) return;

  try {
    await stripe.coupons.del(couponId);
  } catch (err) {
    // Coupon In Use cannot be deleted
    console.warn(`Could not delete coupon ${couponId}:`, err);
  }
};

// Create a Stripe Coupon
export const createStripeCoupon = async ({
  discount,
  oldCouponId,
  metadata,
}: {
  discount: number;
  oldCouponId?: string | null;
  metadata?: Record<string, string>;
}) => {
  if (!discount || discount <= 0) return null;

  // Delete Old Coupon
  if (oldCouponId) {
    await archiveStripeCoupon(oldCouponId);
  }

  return await stripe.coupons.create({
    percent_off: discount,
    duration: "forever",
    metadata: {
      ...metadata,
      isCurrent: "true",
    },
  });
};

// Stripe Subscriptions
export const createStripeSubscription = async ({
  stripeCustomerId,
  items,
  couponIds,
  metadata,
  billingCycleAnchor,
}: {
  stripeCustomerId: string;
  items: { priceId: string; quantity?: number }[];
  couponIds?: (string | null)[];
  metadata?: Record<string, string>;
  billingCycleAnchor?: number;
}) => {
  // Find Valid Coupons
  const validCoupons = (couponIds || []).filter((id): id is string => !!id);
  const discounts = validCoupons.map(coupon => ({ coupon }));

  return await stripe.subscriptions.create({
    customer: stripeCustomerId,
    items: items.map(item => ({
      price: item.priceId,
      quantity: item.quantity || 1,
    })),
    discounts: discounts.length > 0 ? discounts : undefined,
    metadata,
    payment_behavior: "default_incomplete",
    proration_behavior: "none",
    billing_cycle_anchor: billingCycleAnchor,
    expand: ["latest_invoice.payment_intent"],
  });
};

// Update a Stripe subscription
export const updateStripeSubscription = async ({
  subscriptionId,
  items,
  couponIds,
  metadata,
  prorationBehavior = "none",
}: {
  subscriptionId: string;
  items: { priceId: string; quantity?: number }[];
  couponIds?: (string | null)[];
  metadata?: Record<string, string>;
  prorationBehavior?: "none" | "create_prorations" | "always_invoice";
}) => {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  // Find Valid Coupons
  const validCoupons = (couponIds || []).filter((id): id is string => !!id);
  const discounts = validCoupons.map(coupon => ({ coupon }));

  return await stripe.subscriptions.update(subscriptionId, {
    items: [
      // Mark existing items for deletion
      ...subscription.items.data.map((item) => ({
        id: item.id,
        deleted: true as const,
      })),
      // Add new items
      ...items.map(item => ({
        price: item.priceId,
        quantity: item.quantity || 1,
      })),
    ],
    discounts: discounts.length > 0 ? discounts : [],
    metadata,
    proration_behavior: prorationBehavior,
  });
};

// Cancel a Stripe subscription
export const cancelStripeSubscription = async (
  subscriptionId: string,
  cancelAtPeriodEnd: boolean = false
) => {
  if (cancelAtPeriodEnd) {
    return await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  }
  return await stripe.subscriptions.cancel(subscriptionId);
};

// Retrieve a Stripe subscription
export const getStripeSubscription = async (subscriptionId: string) => {
  return await stripe.subscriptions.retrieve(subscriptionId);
};

// Pause a Stripe subscription
export const pauseStripeSubscription = async (subscriptionId: string) => {
  return await stripe.subscriptions.update(subscriptionId, {
    pause_collection: {
      behavior: "mark_uncollectible",
    },
  });
};

// Resume a paused Stripe subscription
export const resumeStripeSubscription = async (subscriptionId: string) => {
  return await stripe.subscriptions.update(subscriptionId, {
    pause_collection: "",
  });
};

// Create Stripe Invoice Items
export const createStripeInvoiceItems = async ({
  stripeCustomerId,
  currency,
  items,
}: {
  stripeCustomerId: string;
  currency: string;
  items: {
    description: string;
    amount: number;
    metadata?: Record<string, string>;
  }[];
}) => {
  const createdItems = [];
  for (const item of items) {
    const invoiceItem = await stripe.invoiceItems.create({
      customer: stripeCustomerId,
      amount: Math.round(item.amount * 100),
      currency: currency.toLowerCase(),
      description: item.description,
      metadata: item.metadata,
    });
    createdItems.push(invoiceItem);
  }
  return createdItems;
};

// Create a Stripe invoice
export const createStripeInvoice = async ({
  stripeCustomerId,
  couponIds,
  metadata,
  description,
}: {
  stripeCustomerId: string;
  couponIds?: (string | null)[];
  metadata?: Record<string, string>;
  description?: string;
}) => {
  // Find Valid Coupons
  const validCoupons = (couponIds || []).filter((id): id is string => !!id);
  const discounts = validCoupons.map(coupon => ({ coupon }));

  return await stripe.invoices.create({
    customer: stripeCustomerId,
    discounts: discounts.length > 0 ? discounts : undefined,
    auto_advance: false,
    pending_invoice_items_behavior: "include",
    metadata,
    description,
  });
};


export const finalizeStripeInvoice = async (invoiceId: string) => {
  return await stripe.invoices.finalizeInvoice(invoiceId);
};

// Pay a Stripe invoice
export const payStripeInvoice = async (
  invoiceId: string,
  paymentMethodId?: string
) => {
 
  const invoice = await stripe.invoices.retrieve(invoiceId);

  if (invoice.status === 'paid') {
    return invoice;
  }

  if (paymentMethodId) {
    return await stripe.invoices.pay(invoiceId, {
      payment_method: paymentMethodId,
    });
  }
  return await stripe.invoices.pay(invoiceId);
};

// Void a Stripe invoice
export const voidStripeInvoice = async (invoiceId: string) => {
  return await stripe.invoices.voidInvoice(invoiceId);
};

// Retrieve a Stripe invoice
export const getStripeInvoice = async (invoiceId: string) => {
  return await stripe.invoices.retrieve(invoiceId, {
    expand: ["payment_intent"],
  });
};
