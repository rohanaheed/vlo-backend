import { Request, Response } from "express";
import { AppDataSource } from "../config/db";
import { Package } from "../entity/Package";
import { PackageModule } from "../entity/PackageModule";
import { Customer } from "../entity/Customer";
import { Currency } from "../entity/Currency";
import { CustomerPackage } from "../entity/CustomerPackage";
import { createStripeProduct, findStripeAddOnProduct, updateStripeProduct, createStripePrice, createStripeCoupon, archiveStripeCoupon, archiveStripePrice, archiveStripeProduct, findExistingPrice, findExistingCoupon } from "../utils/stripUtils";
import { stripe } from "../config/stripe";

const packageRepo = AppDataSource.getRepository(Package);
const packageModuleRepo = AppDataSource.getRepository(PackageModule);
const customerRepo = AppDataSource.getRepository(Customer);
const customerPackageRepo = AppDataSource.getRepository(CustomerPackage);
const currencyRepo = AppDataSource.getRepository(Currency);

// Get or Create Addon In Stripe
export const getOrCreateGlobalAddon = async ({
  module,
  feature,
  description,
  monthlyPrice,
  yearlyPrice,
  discount,
  currency,
}: {
  module: string;
  feature?: string;
  description?: string;
  monthlyPrice?: number;
  yearlyPrice?: number;
  discount?: number;
  currency: string;
}) => {
  const addonKey = feature ? `${module}::${feature}` : module;

  // Product
  let product = await findStripeAddOnProduct(module, feature);

  if (!product) {
    product = await createStripeProduct({
      name: feature ? `${module} - ${feature}` : module,
      description,
      metadata: {
        addonKey,
        module,
        feature: feature || "",
        type: "addon",
      },
    });
  }

  // Prices
  let monthlyPriceObj = null;
  if (monthlyPrice !== undefined) {
    monthlyPriceObj = await findExistingPrice(product.id, "month");
    if (!monthlyPriceObj) {
      monthlyPriceObj = await createStripePrice({
        productId: product.id,
        amount: monthlyPrice,
        currency,
        interval: "month",
        metadata: { type: "addon", addonKey, interval: "month" },
      });
    }
  }

  let yearlyPriceObj = null;
  if (yearlyPrice !== undefined) {
    yearlyPriceObj = await findExistingPrice(product.id, "year");
    if (!yearlyPriceObj) {
      yearlyPriceObj = await createStripePrice({
        productId: product.id,
        amount: yearlyPrice,
        currency,
        interval: "year",
        metadata: { type: "addon", addonKey, interval: "year" },
      });
    }
  }

  // Coupon
  let couponObj = null;
  if (discount && discount > 0) {
    couponObj = await findExistingCoupon(addonKey);
    if (!couponObj) {
      couponObj = await createStripeCoupon({
        discount,
        metadata: {
          addonKey,
          module,
          feature: feature || "",
          type: "addon",
          productId: product.id,
        },
      });
    }
  }

  return {
    stripeProductId: product.id,
    stripeMonthlyPriceId: monthlyPriceObj?.id || null,
    stripeYearlyPriceId: yearlyPriceObj?.id || null,
    stripeCouponId: couponObj?.id || null,
  };
};

/**
 * @openapi
 * /api/packages:
 *   post:
 *     summary: Create a new package
 *     tags:
 *       - Packages
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *             properties:
 *               name:
 *                 type: string
 *                 description: Package name
 *               description:
 *                 type: string
 *                 description: Package description
 *               type:
 *                 type: string
 *                 enum:
 *                   - Free
 *                   - Trial
 *                   - Public Limited Company
 *                   - Paid
 *                 description: Package type
 *               seats:
 *                 type: integer
 *                 description: Number of seats
 *               maxEmployee:
 *                 type: integer
 *                 description: Maximum number of employees
 *               storageSize:
 *                 type: integer
 *                 description: Storage size
 *               storageUnit:
 *                 type: string
 *                 description: Storage unit (e.g., GB, MB)
 *               isPrivate:
 *                 type: boolean
 *                 description: Whether the package is private
 *               isRecommended:
 *                 type: boolean
 *                 description: Whether the package is recommended
 *               priceMonthly:
 *                 type: number
 *                 description: Monthly price
 *               priceYearly:
 *                 type: number
 *                 description: Yearly price
 *               discount:
 *                 type: number
 *                 description: Discount amount
 *               trialPeriod:
 *                 type: integer
 *                 description: Trial period in days
 *               trialMessage:
 *                 type: string
 *                 description: Trial message
 *               notificationBeforeDays:
 *                 type: integer
 *                 description: Days before notification
 *               currencyId:
 *                 type: integer
 *                 description: Currency ID
 *               status:
 *                 type: integer
 *                 description: Status code
 *               billingCycle:
 *                 type: string
 *                 enum:
 *                   - Monthly
 *                   - Annual
 *                 description: Billing cycle
 *               isActive:
 *                 type: boolean
 *                 description: Whether the package is active
 *               integrations:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     isEnabled:
 *                       type: boolean
 *               cloudStorage:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     isEnabled:
 *                       type: boolean
 *               extraAddOn:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     module:
 *                       type: string
 *                     feature:
 *                       type: string
 *                     monthlyPrice:
 *                       type: number
 *                     yearlyPrice:
 *                       type: number
 *                     discount:
 *                       type: number
 *                     description:
 *                       type: string
 *                 description: List of extra add-ons
 *               includedFeatures:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     isEnabled:
 *                       type: boolean
 *                 description: List of included features
 *               communicationTools:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     isEnabled:
 *                       type: boolean
 *                 description: List of communication tools
 *               socialMediaConnectors:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     isEnabled:
 *                       type: boolean
 *                 description: List of social media connectors
 *     responses:
 *       201:
 *         description: Package created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Package'
 *       409:
 *         description: Package with this name already exists
 */
// Create a new package
export const createPackage = async (req: Request, res: Response): Promise<any> => {
  try {
    const {
    name,
    description,
    type,
    seats,
    maxEmployee,
    storageSize,
    storageUnit,
    isPrivate,
    isRecommended,
    priceMonthly,
    priceYearly,
    discount,
    trialPeriod,
    trialMessage,
    notificationBeforeDays,
    status,
    billingCycle,
    isActive,
    includedFeatures,
    integrations,
    communicationTools,
    cloudStorage,
    socialMediaConnectors,
    extraAddOn,
    currencyId,
  } = req.body;

  // Check if package with same name already exists
  const existing = await packageRepo.findOneBy({ name, isDelete: false });
  if (existing) {
    return res.status(409).json({ message: "Package with this name already exists" });
  }

  // Check if currency exist
  const currency = await currencyRepo.findOne({ where: { id: currencyId, isDelete: false } });
  if (!currency) {
    return res.status(404).json({ message: "Currency not found" });
  }

  const newPackage = packageRepo.create({
    name,
    description,
    type,
    seats,
    maxEmployee,
    storageSize,
    storageUnit,
    isPrivate,
    isRecommended,
    priceMonthly,
    priceYearly,
    discount,
    trialPeriod,
    trialMessage,
    notificationBeforeDays,
    status,
    billingCycle,
    isActive,
    includedFeatures,
    integrations,
    communicationTools,
    cloudStorage,
    socialMediaConnectors,
    extraAddOn,
    isDelete: false,
    currencyId
  });

  await packageRepo.save(newPackage);

  if( type === "Paid"){
    const stripeProduct = await createStripeProduct({
    name: newPackage.name,
    description: newPackage.description,
    metadata: { 
      packageId: String(newPackage.id),
      billingCycle: newPackage.billingCycle,
      type: newPackage.type
     }
  });

  newPackage.stripeProductId = stripeProduct.id;

  // Package Prices
  const monthlyPrice = await createStripePrice({
    productId: stripeProduct.id,
    amount: newPackage.priceMonthly,
    currency: currency.currencyCode,
    interval: "month",
     metadata: {
        type: "package",
        packageId: String(newPackage.id),
        interval: "month",
      }
  });

  const yearlyPrice = await createStripePrice({
    productId: stripeProduct.id,
    amount: newPackage.priceYearly,
    currency: currency.currencyCode,
    interval: "year",
    metadata: {
        type: "package",
        packageId: String(newPackage.id),
        interval: "year",
      }
  });

  newPackage.stripeMonthlyPriceId = monthlyPrice.id;
  newPackage.stripeYearlyPriceId = yearlyPrice.id;

  // Package Discounts
 if (newPackage.discount > 0) {
    const coupon = await createStripeCoupon({
      discount: newPackage.discount,
      metadata: {
        type: "package",
        packageId: String(newPackage.id),
        productId: stripeProduct.id,
      },
    });
    newPackage.stripeCouponId = coupon?.id || null;
  }
  // Extra Addons
  if (newPackage.extraAddOn?.length) {
  for (const addOn of newPackage.extraAddOn) {
    const stripeRefs = await getOrCreateGlobalAddon({
      module: addOn.module,
      feature: addOn.feature,
      description: addOn.description,
      monthlyPrice: addOn.monthlyPrice,
      yearlyPrice: addOn.yearlyPrice,
      discount: addOn.discount,
      currency: currency.currencyCode,
    });

    Object.assign(addOn, stripeRefs);
  }
}

  await packageRepo.save(newPackage);
  }
  
  return res.status(201).json({
    success : true,
    data: newPackage,
    message: "Package Created Sucessfully"
  });

  } catch (error) {
    res.status(500).json({
      success: false,
       message: "Internal server error", 
       error: error instanceof Error ? error.message : error 
  });
  }
};

/**
 * @openapi
 * /api/packages:
 *   get:
 *     summary: Get all packages (excluding soft deleted ones)
 *     tags: [Packages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of packages
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Package'
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *                 totalItems:
 *                   type: integer
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 */
// Get all packages (excluding soft deleted ones)
export const getAllPackages = async (req: Request, res: Response): Promise<any> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const [packages, total] = await packageRepo.findAndCount({
      where: { isDelete: false },
      order: { createdAt: "DESC" },
      skip: (page - 1) * limit,
      take: limit
    });

    const totalPages = Math.ceil(total / limit);

    return res.json({
      success: true,
      data: packages,
      page,
      limit,
      totalPages,
      totalItems: total
    });
  } catch (error) {
    console.error('Error fetching packages:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * @openapi
 * /api/packages/{id}:
 *   get:
 *     summary: Get package by ID
 *     tags: [Packages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Package ID
 *     responses:
 *       200:
 *         description: Package found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Package'
 *       404:
 *         description: Package not found
 */
// Get package by ID
export const getPackageById = async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;
  const packageItem = await packageRepo.findOne({
    where: { id: Number(id), isDelete: false }
  });

  if (!packageItem) {
    return res.status(404).json({ message: "Package not found" });
  }

  return res.json(packageItem);
};

/**
 * @openapi
 * /api/packages/{id}:
 *   put:
 *     summary: Update package
 *     tags: [Packages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Package ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 description: Package name
 *               description:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 500
 *                 description: Package description
 *               type:
 *                 type: string
 *                 enum: [Free, Trial, Public Limited Company, Paid]
 *                 description: Package type
 *               seats:
 *                 type: integer
 *                 description: Number of seats
 *               maxEmployee:
 *                 type: integer
 *                 description: Maximum number of employees
 *               storageSize:
 *                 type: integer
 *                 description: Storage size
 *               storageUnit:
 *                 type: string
 *                 description: Storage unit (e.g., GB, MB)
 *               isPrivate:
 *                 type: boolean
 *                 description: Whether the package is private
 *               isRecommended:
 *                 type: boolean
 *                 description: Whether the package is recommended
 *               priceMonthly:
 *                 type: number
 *                 description: Monthly price
 *               priceYearly:
 *                 type: number
 *                 description: Yearly price
 *               discount:
 *                 type: number
 *                 description: Discount amount
 *               trialPeriod:
 *                 type: integer
 *                 description: Trial period in days
 *               trialMessage:
 *                 type: string
 *                 description: Trial message
 *               notificationBeforeDays:
 *                 type: integer
 *                 description: Days before notification
 *               status:
 *                 type: integer
 *                 description: Status code
 *               billingCycle:
 *                 type: string
 *                 enum: [Monthly, Annual]
 *                 description: Billing cycle
 *               isActive:
 *                 type: boolean
 *                 description: Whether the package is active
 *               includedFeatures:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     isEnabled:
 *                       type: boolean
 *                 description: List of included features
 *               integrations:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     isEnabled:
 *                       type: boolean
 *                 description: List of integrations
 *               communicationTools:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     isEnabled:
 *                       type: boolean
 *                 description: List of communication tools
 *               cloudStorage:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     isEnabled:
 *                       type: boolean
 *                 description: List of cloud storage options
 *               socialMediaConnectors:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     isEnabled:
 *                       type: boolean
 *                 description: List of social media connectors
 *               extraAddOn:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     module:
 *                       type: string
 *                     feature:
 *                       type: string
 *                     monthlyPrice:
 *                       type: number
 *                     yearlyPrice:
 *                       type: number
 *                     discount:
 *                       type: number
 *                     description:
 *                       type: string
 *                 description: List of extra add-ons
 */

export const updatePackage = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;

  const packageItem = await packageRepo.findOne({
    where: { id: Number(id), isDelete: false }
  });

  if (!packageItem) {
    return res.status(404).json({ message: "Package not found" });
  }

  // Check if name is being changed and if it conflicts with existing package
  if (req.body.name && req.body.name !== packageItem.name) {
    const existing = await packageRepo.findOneBy({ name: req.body.name, isDelete: false });
    if (existing) {
      return res.status(409).json({ message: "Package with this name already exists" });
    }
  }

  // Get Old Values
  const oldPriceMonthly = packageItem.priceMonthly;
  const oldPriceYearly = packageItem.priceYearly;
  const oldDiscount = packageItem.discount;
  const oldCouponId = packageItem.stripeCouponId;

  // Update Package
  const updateData: Partial<Package> = {};
  const allowedFields: (keyof Package)[] = [
    "name",
    "type",
    "description",
    "seats",
    "maxEmployee",
    "storageSize",
    "storageUnit",
    "isPrivate",
    "isRecommended",
    "priceMonthly",
    "priceYearly",
    "discount",
    "trialPeriod",
    "trialMessage",
    "notificationBeforeDays",
    "status",
    "billingCycle",
    "isActive",
    "includedFeatures",
    "integrations",
    "communicationTools",
    "cloudStorage",
    "socialMediaConnectors",
    "extraAddOn"
  ];

  for (const field of allowedFields) {
    if ((req.body as any)[field] !== undefined) {
      (updateData as any)[field] = (req.body as any)[field];
    }
  }

  Object.assign(packageItem, updateData);
  await packageRepo.save(packageItem);

  if (packageItem.type === "Paid") {
    const currency = await currencyRepo.findOne({
      where: { id: packageItem.currencyId, isDelete: false }
    });

    if (!currency) {
      return res.status(404).json({ message: "Currency not found" });
    }

    // Update Package Product in Stripe
    if (packageItem.stripeProductId) {
      await updateStripeProduct({
        productId: packageItem.stripeProductId,
        name: packageItem.name,
        description: packageItem.description,
        metadata: {
          packageId: String(packageItem.id),
          billingCycle: packageItem.billingCycle,
          type: packageItem.type
        }
      });
    }

    // Update Prices If Changed
    const monthlyPriceChanged = req.body.priceMonthly !== undefined && req.body.priceMonthly !== oldPriceMonthly;
    if (monthlyPriceChanged && packageItem.stripeProductId) {
      const price = await createStripePrice({
        productId: packageItem.stripeProductId,
        amount: packageItem.priceMonthly,
        currency: currency.currencyCode,
        interval: "month",
        oldPriceId: packageItem.stripeMonthlyPriceId,
        metadata: { type: "package", packageId: String(packageItem.id), interval: "month" }
      });
      packageItem.stripeMonthlyPriceId = price.id;
    }

    const yearlyPriceChanged = req.body.priceYearly !== undefined && req.body.priceYearly !== oldPriceYearly;
    if (yearlyPriceChanged && packageItem.stripeProductId) {
      const price = await createStripePrice({
        productId: packageItem.stripeProductId,
        amount: packageItem.priceYearly,
        currency: currency.currencyCode,
        interval: "year",
        oldPriceId: packageItem.stripeYearlyPriceId,
        metadata: { type: "package", packageId: String(packageItem.id), interval: "year" }
      });
      packageItem.stripeYearlyPriceId = price.id;
    }

    // Update Discount If Changed
    const discountChanged = req.body.discount !== undefined && req.body.discount !== oldDiscount;
    if (discountChanged) {
      if (packageItem.discount > 0) {
        const coupon = await createStripeCoupon({
          discount: packageItem.discount,
          oldCouponId: oldCouponId,
          metadata: { type: "package", packageId: String(packageItem.id), productId: packageItem.stripeProductId || "" },
        });
        packageItem.stripeCouponId = coupon?.id || null;
      } else {
        // Discount removed
        if (oldCouponId) {
          await archiveStripeCoupon(oldCouponId);
        }
        packageItem.stripeCouponId = null;
      }
    }

  // Update Extra Addons
  if (packageItem.extraAddOn?.length) {
    for (const addOn of packageItem.extraAddOn) {
      const stripeRefs = await getOrCreateGlobalAddon({
        module: addOn.module,
        feature: addOn.feature,
        description: addOn.description,
        monthlyPrice: addOn.monthlyPrice,
        yearlyPrice: addOn.yearlyPrice,
        discount: addOn.discount,
        currency: currency.currencyCode,
      });

      Object.assign(addOn, stripeRefs);
     }
   }

 }

  await packageRepo.save(packageItem);

  return res.status(200).json({
    success: true,
    data: packageItem,
    message : "Package Updated Sucessfully"
  })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message : "Internal Server Error",
      error: error instanceof Error ? error.message : error 
    })
  }
};

/**
 * @openapi
 * /api/packages/{id}:
 *   delete:
 *     summary: Soft delete package
 *     tags: [Packages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Package ID
 *     responses:
 *       200:
 *         description: Package soft deleted successfully
 *       404:
 *         description: Package not found
 */
// Soft delete package
export const deletePackage = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;

    const packageItem = await packageRepo.findOne({
      where: { id: Number(id), isDelete: false }
    });

    if (!packageItem) {
      return res.status(404).json({ message: "Package not found" });
    }

    // Only process Stripe logic if package type is "Paid"
    if (packageItem.type === "Paid") {
      let ActiveSubscription = false;

      if (packageItem.stripeMonthlyPriceId || packageItem.stripeYearlyPriceId) {
        const pricesToCheck = [
          packageItem.stripeMonthlyPriceId,
          packageItem.stripeYearlyPriceId,
        ].filter(Boolean) as string[];

        for (const priceId of pricesToCheck) {
          const subs = await stripe.subscriptions.list({
            price: priceId,
            status: "active",
            limit: 1,
          });

          if (subs.data.length > 0) {
            ActiveSubscription = true;
            break;
          }
        }
      }

      // Archive Stripe resources ONLY if no active subscriptions
      if (!ActiveSubscription) {
        // Archive package coupon
        if (packageItem.stripeCouponId) {
          await archiveStripeCoupon(packageItem.stripeCouponId);
        }

        // Archive package prices
        if (packageItem.stripeMonthlyPriceId) {
          await archiveStripePrice(packageItem.stripeMonthlyPriceId);
        }
        if (packageItem.stripeYearlyPriceId) {
          await archiveStripePrice(packageItem.stripeYearlyPriceId);
        }

        // Archive package product
        if (packageItem.stripeProductId) {
          await archiveStripeProduct(packageItem.stripeProductId);
        }
      }
    }

    // Set isDelete to true instead of actually deleting
    packageItem.isDelete = true;
    await packageRepo.save(packageItem);

    return res.json({
      success: true,
      message: "Package soft deleted successfully"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error instanceof Error ? error.message : error
    });
  }
};

/**
 * @openapi
 * /api/packages/active/list:
 *   get:
 *     summary: Get active packages only
 *     tags: [Packages]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of active packages
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Package'
 */
// Get active packages only
export const getActivePackages = async (req: Request, res: Response): Promise<any> => {
  try {
    // Defensive: ensure no NaN or undefined in query
    const packages = await packageRepo.find({
      where: {
        isActive: true,
        isDelete: false
      }
    });
    return res.json(packages);
  } catch (error) {
    // Log error for debugging
    console.error("Error fetching active packages:", error);
    return res.status(500).json({ message: "Failed to fetch active packages", error: error instanceof Error ? error.message : error });
  }
};

/**
 * @openapi
 * /api/packages/free/list:
 *   get:
 *     summary: Get free packages (price = 0)
 *     tags: [Packages]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of free packages
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Package'
 */
// Get free packages (price = 0)
export const getFreePackages = async (req: Request, res: Response): Promise<any> => {
  const packages = await packageRepo.find({
    where: { type: "Free", isActive: true, isDelete: false },
    order: { createdAt: "DESC" }
  });
  return res.json(packages);
};

/**
 * @openapi
 * /api/packages/paid/list:
 *   get:
 *     summary: Get paid packages (price > 0)
 *     tags: [Packages]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of paid packages
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Package'
 */
// Get paid packages (price > 0)
export const getPaidPackages = async (req: Request, res: Response): Promise<any> => {
  const packages = await packageRepo.find({
    where: { type: "Paid", isActive: true, isDelete: false },
    order: { createdAt: "DESC" }
  });
  return res.json(packages);
};

/**
 * @openapi
 * /api/packages/billing-cycle/{cycle}:
 *   get:
 *     summary: Get packages by billing cycle
 *     tags: [Packages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cycle
 *         required: true
 *         schema:
 *           type: string
 *           enum: [Monthly, Annual]
 *         description: Billing cycle
 *     responses:
 *       200:
 *         description: List of packages for the specified billing cycle
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Package'
 */
// Get packages by billing cycle
export const getPackagesByBillingCycle = async (req: Request, res: Response): Promise<any> => {
  const { cycle } = req.params;
  
  if (cycle !== 'Monthly' && cycle !== 'Annual') {
    return res.status(400).json({ message: "Invalid billing cycle. Must be 'Monthly' or 'Annual'" });
  }

  const packages = await packageRepo.find({
    where: { billingCycle: cycle, isActive: true, isDelete: false },
    order: { createdAt: "DESC" }
  });
  return res.json(packages);
};

export const getPackagesForCustomer = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { customerId } = req.params;

    const customer = await customerRepo.findOne({
      where: { id: Number(customerId), isDelete: false }
    });
    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    const currency = await currencyRepo.findOne({
      where: { id: customer.currencyId }
    });
    if (!currency) {
      return res.status(404).json({ success: false, message: "Currency not found" });
    }

    const packages = await packageRepo.find({
      where: { isActive: true, isDelete: false }
    });

    if (!packages.length) {
      return res.status(404).json({ success: false, message: "No packages found" });
    }
    const data = packages.map(pkg => ({
         id : pkg.id,
        name : pkg.name,
        type : pkg.type,
        description : pkg.description,
        seats : pkg.seats,
        maxEmployee : pkg.maxEmployee,
        storageSize : pkg.storageSize,
        storageUnit : pkg.storageUnit,
        isPrivate : pkg.isPrivate,
        isRecommended : pkg.isRecommended,
        priceMonthly : Number((pkg.priceMonthly * currency.exchangeRate).toFixed(2)),
        priceYearly : Number((pkg.priceYearly * currency.exchangeRate).toFixed(2)),
        discount : pkg.discount,
        trialPeriod : pkg.trialPeriod,
        trialMessage : pkg.trialMessage,
        notificationBeforeDays : pkg.notificationBeforeDays,
        status : pkg.status,
        billingCycle : pkg.billingCycle,
        isActive : pkg.isActive,
        includedFeatures : pkg.includedFeatures,
        integrations : pkg.integrations,
        communicationTools : pkg.communicationTools,
        cloudStorage : pkg.cloudStorage,
        socialMediaConnectors : pkg.socialMediaConnectors,
        extraAddOns : pkg.extraAddOn,
        currency : currency.currencyCode,
        currencySymbol : currency.currencySymbol
    }));

    return res.status(200).json({
      success: true,
      data,
      message: "Packages fetched successfully"
    });

  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getCustomerSelectedPackage = async (req: Request, res: Response): Promise<any> => {
  try {
    const { customerId } = req.params;

    // Get Customer
    const customer = await customerRepo.findOne({
      where: { id: Number(customerId) }
    });
    // Get Customer Selected Package
    const customerPackage = await customerPackageRepo.findOne({
      where: { customerId: Number(customerId), isDelete: false }
    });

    if (!customer || !customerPackage?.packageId) {
      return res.status(404).json({
        success: false,
        message: "Package not selected"
      });
    }

    // Get Currency
    const currency = await currencyRepo.findOne({
      where: { id: customer.currencyId }
    });

    if (!currency) {
      return res.status(404).json({
        success: false,
        message: "Currency not found"
      });
    }

    // Get Package
    const pkg = await packageRepo.findOne({
      where: { id: customerPackage.packageId }
    });

    if (!pkg) {
      return res.status(404).json({
        success: false,
        message: "Package not found"
      });
    }

    // Convert Prices
    const selectedPackage = {
      id: pkg.id,
      name: pkg.name,
      billingCycle: pkg.billingCycle,
      monthlyPrice: Number((pkg.priceMonthly * currency.exchangeRate).toFixed(2)),
      yearlyPrice: Number((pkg.priceYearly * currency.exchangeRate).toFixed(2)),
      currencyCode: currency.currencyCode,
      currencySymbol: currency.currencySymbol
    };

    return res.status(200).json({
      success: true,
      data: selectedPackage,
      message: "Customer selected package fetched successfully"
    });

  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message
    });
  }
};

export const getAddOnsForSelectedPackage = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { customerId } = req.params;

    const customerPackage = await customerPackageRepo.findOne({
      where: { 
        customerId: Number(customerId), 
        isDelete: false
       }
    });

    if (!customerPackage) {
      return res.status(400).json({
        success: false,
        message: "Please select a package first"
      });
    }

    const customer = await customerRepo.findOne({
      where: { id: Number(customerId), isDelete: false }
    });

    const currency = await currencyRepo.findOne({
      where: { id: customer?.currencyId }
    });

    const pkg = await packageRepo.findOne({
      where: { id: customerPackage.packageId }
    });

    if (!pkg || !currency) {
      return res.status(404).json({ success: false, message: "Data not found" });
    }

    const addOns = (pkg.extraAddOn || []).map(addOn => ({
      module: addOn.module,
      feature: addOn.feature,
      description: addOn.description,
      monthlyPrice: Number((addOn.monthlyPrice || 0) * currency.exchangeRate).toFixed(2),
      yearlyPrice: Number((addOn.yearlyPrice || 0) * currency.exchangeRate).toFixed(2),
      discount: addOn.discount || 0,
      currencyCode: currency.currencyCode,
      currencySymbol: currency.currencySymbol
    }));

    return res.status(200).json({
      success: true,
      data: addOns,
      message: "Available add-ons fetched"
    });

  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * @openapi
 * components:
 *   schemas:
 *     PackageModule:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @openapi
 * /api/packages/module:
 *   post:
 *     summary: Create a new package module
 *     tags: [PackageModule]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               includedFeatures:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     price:
 *                       type: number
 *                       minimum: 0
 *                     isEnabled:
 *                       type: boolean
 *                     billingCycle:
 *                       type: string
 *                       enum: [Monthly, Annual]
 *     responses:
 *       201:
 *         description: Package module created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PackageModule'
 *       400:
 *         description: Invalid input
 */
export const createPackageModule = async (req: Request, res: Response): Promise<any> => {
  try {
    const { name, includedFeatures } = req.body;

    if (!name) {
      return res.status(400).json({ message: "name is required" });
    }

    // Validate includedFeatures if provided
    if (includedFeatures && !Array.isArray(includedFeatures)) {
      return res.status(400).json({ message: "includedFeatures must be an array" });
    }

    const newModule = packageModuleRepo.create({
      name,
      includedFeatures: includedFeatures,
      isDelete: false
    });

    await packageModuleRepo.save(newModule);
    return res.status(201).json(newModule);
  } catch (err: any) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

/**
 * @openapi
 * /api/packages/module:
 *   get:
 *     summary: Get all package modules
 *     tags: [PackageModule]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of package modules
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/PackageModule'
 */
export const getAllPackageModules = async (req: Request, res: Response): Promise<any> => {
  try {
    const modules = await packageModuleRepo.find({ order: { createdAt: "DESC" } });
    return res.json(modules);
  } catch (err: any) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

/**
 * @openapi
 * /api/packages/module/{id}:
 *   get:
 *     summary: Get a package module by ID
 *     tags: [PackageModule]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Package module ID
 *     responses:
 *       200:
 *         description: Package module found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PackageModule'
 *       404:
 *         description: Package module not found
 */
export const getPackageModuleById = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const module = await packageModuleRepo.findOne({ where: { id: Number(id) } });
    if (!module) {
      return res.status(404).json({ message: "Package module not found" });
    }
    return res.json(module);
  } catch (err: any) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

/**
 * @openapi
 * /api/packages/module/{id}:
 *   put:
 *     summary: Update a package module
 *     tags: [PackageModule]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Package module ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Package module updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PackageModule'
 *       404:
 *         description: Package module not found
 */
export const updatePackageModule = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const module = await packageModuleRepo.findOne({ where: { id: Number(id) } });
    if (!module) {
      return res.status(404).json({ message: "Package module not found" });
    }
    if (name !== undefined) module.name = name;
    await packageModuleRepo.save(module);
    return res.json(module);
  } catch (err: any) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

/**
 * @openapi
 * /api/packages/module/{id}:
 *   delete:
 *     summary: Delete a package module
 *     tags: [PackageModule]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Package module ID
 *     responses:
 *       200:
 *         description: Package module deleted successfully
 *       404:
 *         description: Package module not found
 */
export const deletePackageModule = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const module = await packageModuleRepo.findOne({ where: { id: Number(id) } });
    if (!module) {
      return res.status(404).json({ message: "Package module not found" });
    }
    await packageModuleRepo.remove(module);
    return res.json({ message: "Package module deleted successfully" });
  } catch (err: any) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

/**
 * @openapi
 * /api/packages/module/{id}/feature/{featureName}:
 *   patch:
 *     summary: Update a single includedFeature in a package module
 *     tags: [PackageModule]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Package module ID
 *       - in: path
 *         name: featureName
 *         required: true
 *         schema:
 *           type: string
 *         description: Name of the feature to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *               isEnabled:
 *                 type: boolean
 *               billingCycle:
 *                 type: string
 *                 enum: [Monthly, Annual]
 *     responses:
 *       200:
 *         description: Feature updated successfully
 *       404:
 *         description: Package module or feature not found
 *       500:
 *         description: Server error
 */
export const updateIncludedFeature = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id, featureName } = req.params;
    const updateData = req.body;

    const module = await packageModuleRepo.findOne({ where: { id: Number(id) } });

    if (!module) {
      return res.status(404).json({ message: "Package module not found" });
    }

    if (!Array.isArray(module.includedFeatures)) {
      return res.status(404).json({ message: "No included features found in this module" });
    }

    const featureIndex = module.includedFeatures.findIndex(
      (f: any) => f.name === featureName
    );

    if (featureIndex === -1) {
      return res.status(404).json({ message: "Feature not found in includedFeatures" });
    }

    // Only update the provided fields
    module.includedFeatures[featureIndex] = {
      ...module.includedFeatures[featureIndex],
      ...updateData,
    };

    await packageModuleRepo.save(module);

    return res.json({
      message: "Feature updated successfully",
      updatedFeature: module.includedFeatures[featureIndex],
    });
  } catch (err: any) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};
