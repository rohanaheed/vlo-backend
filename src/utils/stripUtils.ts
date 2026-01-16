import { stripe } from "../config/stripe";
import { AppDataSource } from "../config/db";
import { Customer } from "../entity/Customer";

const customerRepo = AppDataSource.getRepository(Customer);

/* ======================================================
   CUSTOMER
====================================================== */

export const getOrCreateStripeCustomer = async (customer: {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  stripeCustomerId?: string | null;
}) => {
  // If customer already has a Stripe ID, try to retrieve it
  if (customer.stripeCustomerId) {
    const existingCustomer = await stripe.customers.retrieve(customer.stripeCustomerId);

    // Check if customer was deleted in Stripe
    if ('deleted' in existingCustomer && existingCustomer.deleted) {
      // Customer was deleted, create a new one
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

  // Save stripeCustomerId to the database
  await customerRepo.update(customer.id, {
    stripeCustomerId: stripeCustomer.id,
  });

  return stripeCustomer;
};

/* ======================================================
   PRODUCT (PACKAGE / ADDON)
====================================================== */

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

/* ======================================================
   PRICES (CREATE NEW + ARCHIVE OLD)
====================================================== */

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

/**
 * Archive/deactivate an existing price.
 */
export const archiveStripePrice = async (priceId: string | null | undefined) => {
  if (!priceId) return;

  try {
    await stripe.prices.update(priceId, { active: false });
  } catch (err) {
    console.warn(`Could not archive price ${priceId}:`, err);
  }
};

/**
 * Find existing active prices for a product by interval (month/year)
 * Returns the most recent active price with isCurrent metadata
 */
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

    // Find price matching the interval, prefer one with isCurrent metadata
    const matchingPrices = prices.data.filter(
      (p) => p.recurring?.interval === interval
    );

    if (matchingPrices.length === 0) return null;

    // Prefer price marked as current
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

/**
 * Find existing coupon for an addon by metadata
 */
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

    // Prefer coupon marked as current
    const currentCoupon = matchingCoupons.find(
      (c) => c.metadata?.isCurrent === "true"
    );

    if (currentCoupon) {
      return { id: currentCoupon.id, percent_off: currentCoupon.percent_off };
    }

    // Otherwise return the most recently created matching coupon
    const sortedCoupons = matchingCoupons.sort((a, b) => b.created - a.created);
    return { id: sortedCoupons[0].id, percent_off: sortedCoupons[0].percent_off };
  } catch (err) {
    console.warn(`Could not find coupon for addon ${addonKey}:`, err);
    return null;
  }
};

/**
 * Archive/deactivate a Stripe product.
 */
export const archiveStripeProduct = async (productId: string | null | undefined) => {
  if (!productId) return;

  try {
    await stripe.products.update(productId, { active: false });
  } catch (err) {
    console.warn(`Could not archive product ${productId}:`, err);
  }
};

/* ======================================================
   COUPONS (CREATE NEW + DELETE OLD)
====================================================== */

/**
 * Delete/archive an existing coupon.
 * Note: Coupons can be deleted in Stripe, but this will fail if
 * the coupon is currently applied to an active subscription.
 */
export const archiveStripeCoupon = async (couponId: string | null | undefined) => {
  if (!couponId) return;

  try {
    await stripe.coupons.del(couponId);
  } catch (err) {
    // Coupon might already be deleted or in use by active subscription
    console.warn(`Could not delete coupon ${couponId}:`, err);
  }
};

/**
 * Creates a coupon in Stripe. Optionally deletes the old coupon first.
 * Product association is tracked via metadata.
 */
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

  // Delete old coupon if exists
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

/* ======================================================
   SUBSCRIPTIONS
====================================================== */

/**
 * Create a Stripe subscription with multiple items and optional discounts
 * Supports package with addOns, each can have their own coupon
 */
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
  // Filter valid coupon IDs
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

/**
 * Update an existing Stripe subscription with new items and discounts
 */
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

  // Filter valid coupon IDs
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

/**
 * Cancel a Stripe subscription
 */
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

/**
 * Retrieve a Stripe subscription
 */
export const getStripeSubscription = async (subscriptionId: string) => {
  return await stripe.subscriptions.retrieve(subscriptionId);
};

/**
 * Pause a Stripe subscription (set to past_due behavior)
 */
export const pauseStripeSubscription = async (subscriptionId: string) => {
  return await stripe.subscriptions.update(subscriptionId, {
    pause_collection: {
      behavior: "mark_uncollectible",
    },
  });
};

/**
 * Resume a paused Stripe subscription
 */
export const resumeStripeSubscription = async (subscriptionId: string) => {
  return await stripe.subscriptions.update(subscriptionId, {
    pause_collection: "",
  });
};

/* ======================================================
   INVOICES (ONE-TIME INVOICE FOR DASHBOARD TRACKING)
====================================================== */

/**
 * Create invoice items (line items) for a customer
 * These will be automatically included in the next invoice
 */

/**
 * Create multiple invoice items at once (package + addOns)
 * Note: When using 'amount', quantity is not allowed by Stripe API.
 * The amount should already be the total (unit price * quantity if needed).
 */
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

/**
 * Create a Stripe invoice (draft state)
 * pending_invoice_items_behavior: 'include' ensures all pending items are attached
 */
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
  // Filter valid coupon IDs
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

/**
 * Finalize a Stripe invoice (make it ready for payment)
 */
export const finalizeStripeInvoice = async (invoiceId: string) => {
  return await stripe.invoices.finalizeInvoice(invoiceId);
};

/**
 * Pay a Stripe invoice using a specific payment method
 * Checks if invoice is already paid to avoid errors
 */
export const payStripeInvoice = async (
  invoiceId: string,
  paymentMethodId?: string
) => {
  // First retrieve the invoice to check its status
  const invoice = await stripe.invoices.retrieve(invoiceId);

  // If already paid, return the invoice as-is
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

/**
 * Void a Stripe invoice
 */
export const voidStripeInvoice = async (invoiceId: string) => {
  return await stripe.invoices.voidInvoice(invoiceId);
};

/**
 * Retrieve a Stripe invoice
 */
export const getStripeInvoice = async (invoiceId: string) => {
  return await stripe.invoices.retrieve(invoiceId, {
    expand: ["payment_intent"],
  });
};
