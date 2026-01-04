import { Request, Response } from "express";
import { AppDataSource } from "../config/db";
import { Customer } from "../entity/Customer";
import { User } from "../entity/User";
import {
  customerSchema,
  sendCodeSchema,
  updateCustomerSchema,
  verifyOTPSchema,
} from "../utils/validators/inputValidator";
import { Status } from "../entity/Customer";
import bcrypt from "bcryptjs";
import {
  generateOTP,
  sendCompanyRegistrationEmail,
  sendCustomerEmailVerificationCode,
  sendCustomerLoginCredentials,
  sendVerificationEmail,
} from "../utils/emailUtils";
import { UserRole } from "../entity/User";
import { Transaction } from "../entity/Transaction";
import { Subscription } from "../entity/Subscription";
import { Package } from "../entity/Package";
import { Currency } from "../entity/Currency";
import { CustomerPackage } from "../entity/CustomerPackage";
import { MoreThanOrEqual, LessThanOrEqual, And, In } from "typeorm";
const customerRepo = AppDataSource.getRepository(Customer);
const userRepo = AppDataSource.getRepository(User);
const transactionRepo = AppDataSource.getRepository(Transaction);
const currencyRepo = AppDataSource.getRepository(Currency)
const subscriptionRepo = AppDataSource.getRepository(Subscription);
const packageRepo = AppDataSource.getRepository(Package);
const customerPackageRepo = AppDataSource.getRepository(CustomerPackage)

/**
 * @swagger
 * /api/customers:
 *   post:
 *     summary: Create a new customer
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CustomerInput'
 *     responses:
 *       201:
 *         description: Customer created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Customer'
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
export const createCustomer = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = (req as any).user.id;

    // Validate request body
    const { error, value } = customerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }
    const email = value.email.trim();
    const sendLoginCreds = value.sendEmail;
    // Check if a verified customer already exists
    const existingCustomer = await customerRepo.findOne({
      where: { email, isDelete: false },
    });

    if (!existingCustomer) {
      return res.status(400).json({
        success: false,
        message: "Please verify your email before creating a customer.",
      });
    }

    if (!existingCustomer.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: "Email is not verified. Please verify email first.",
      });
    }

    // If logo is provided as a file or base64, upload to S3 and get URL
    // if (value.logo) {
    //   const matches = value.logo.match(/^data:(.+);base64,(.*)$/);
    //   if (!matches) {
    //     return res.status(400).json({
    //       success: false,
    //       message: "Invalid base64 logo format.",
    //     });
    //   }

    //   const mimeType = matches[1];
    //   const base64Data = matches[2];
    //   const ext = mimeType.split("/")[1] ? `.${mimeType.split("/")[1]}` : "";
    //   const buffer = Buffer.from(base64Data, "base64");

    //   const key = `customers/${Date.now()}_${Math.random()
    //     .toString(36)
    //     .substring(2, 10)}${ext}`;

    //   const originalname = `logo${ext}`;

    //   const s3LogoUrl = await uploadFileToS3({
    //     bucket: process.env.LOGO_BUCKET || "",
    //     buffer,
    //     originalname,
    //     mimetype: mimeType,
    //     key,
    //   });

    //   value.logo = s3LogoUrl;
    // }

    // existing verified customer
    const customer = existingCustomer;

    customer.createdByUserId = userId;
    customer.title = value.title || "";
    customer.firstName = value.firstName;
    customer.middleName = value.middleName || "";
    customer.lastName = value.lastName;
    customer.stage = value.stage;
    customer.churnRisk = value.churnRisk;
    customer.businessName = value.businessName;
    customer.tradingName = value.tradingName;
    customer.note = value.note || "";
    customer.businessSize = value.businessSize;
    customer.businessEntity = value.businessEntity;
    customer.businessType = value.businessType;
    customer.businessWebsite = value.businessWebsite || "";
    customer.businessAddress = value.businessAddress;
    customer.referralCode = value.referralCode;
    customer.phoneNumber = value.phoneNumber;
    customer.phoneType = value.phoneType || "";
    customer.countryCode = value.countryCode || "";
    customer.emailType = value.emailType || "";
    customer.password = await bcrypt.hash(value.password, 10); // Note: You should hash this password!
    customer.practiceArea = value.practiceArea || [];
    customer.status = value.status as Status;
    customer.expiryDate = value.expiryDate || new Date(); // Default to current date
    customer.isDelete = false;
    customer.updatedAt = new Date();
    customer.lastActive = new Date();

    const country = value.businessAddress.country
    const currency = await currencyRepo.findOne({
      where: { country : country, isDelete : false }
    })
    if(!currency){
      return res.status(404).json({
        success:false,
        message:"Currency not found for the country"
      })
    }
    // Assign Currency ID to Customer
    customer.currencyId = currency.id;

    // Save the customer
    const savedCustomer = await customerRepo.save(customer);

    // Check if user already exists in the user table
    const existingUser = await userRepo.findOne({
      where: { email: customer.email, isDelete: false },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "A user with this email already exists.",
      });
    }
    // Also create a user record for this customer so they can log in
    const user = new User();
    user.name = savedCustomer.firstName + " " + savedCustomer.lastName;
    user.email = savedCustomer.email;
    user.password = savedCustomer.password; // already hashed above
    user.role = "customer" as UserRole;
    user.isDelete = false;
    user.createdAt = new Date();
    user.updatedAt = new Date();

    const savedUser = await userRepo.save(user);
    // Send email verification to user before allowing login
    const verificationEmailSent = await sendVerificationEmail(
      savedUser.email,
      savedUser.name,
      process.env.FRONTEND_VERIFY_EMAIL_URL ||
        "https://vhr-system.com/verify-email"
    );

    if (!verificationEmailSent) {
      console.warn(`Failed to send verification email to ${savedUser.email}`);
    }

    // Send registration email
    const customerName = `${savedCustomer.firstName} ${savedCustomer.lastName}`;
    const emailSent = await sendCompanyRegistrationEmail(
      savedCustomer.email,
      customerName,
      savedCustomer.businessName,
      process.env.FRONTEND_LOGIN_URL || "https://vhr-system.com/login"
    );

    if (!emailSent) {
      console.warn(
        `Failed to send registration email to ${savedCustomer.email}`
      );
    }
    if(sendLoginCreds){
      const userName = `${value.firstName} ${value.lastName}`;
      const email = value.email.trim();
      const password = value.password
      const loginCredsEmail = await sendCustomerLoginCredentials(
        email,
        userName,
        password
      );
      if(!loginCredsEmail){
        console.warn(
        `Failed to send crendentials email to ${savedCustomer.email}`
      );
      }
    }

    return res.status(201).json({
      success: true,
      data: savedCustomer,
      message: "Customer created successfully",
      emailSent,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const sendVerificationCode = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { error, value } = sendCodeSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }
    const validEmail = value.email;
    // Check if email already exists in customer table
    const existingCustomer = await customerRepo.findOne({
      where: {
        email: validEmail,
        isDelete: false,
      },
    });

    if (existingCustomer && existingCustomer.isEmailVerified) {
      return res.status(409).json({
        success: false,
        message: "This email is already registered as a customer",
      });
    }

    // Also check if email exists in user table
    const existingUser = await userRepo.findOne({
      where: {
        email: validEmail,
        isDelete: false,
      },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "This email is already registered in the system",
      });
    }

    // Generate verification code
    const verificationCode = generateOTP();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    const existingUnverifiedCustomer = await customerRepo.findOne({
      where: {
        email: validEmail,
        isEmailVerified: false,
      },
    });
    if (existingUnverifiedCustomer) {
      // Update existing unverified customer
      existingUnverifiedCustomer.otp = verificationCode;
      existingUnverifiedCustomer.otpExpiry = otpExpiry;
      await customerRepo.save(existingUnverifiedCustomer);
    } else {
      // Create new temporary customer record
      const tempCustomer = new Customer();
      tempCustomer.email = validEmail;
      tempCustomer.otp = verificationCode;
      tempCustomer.otpExpiry = otpExpiry;
      tempCustomer.isEmailVerified = false;

      await customerRepo.save(tempCustomer);
    }

    const emailSent = await sendCustomerEmailVerificationCode(
      validEmail,
      verificationCode
    );

    return res.status(201).json({
      success: true,
      message: "Email Verification Code Sent Successfully",
      emailSent: emailSent,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const verifyEmailCode = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { error, value } = verifyOTPSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }
    const validEmail = value.email.trim();
    const validCode = value.otp;
    // Check if OTP provided
    if (!validCode) {
      return res.status(400).json({
        success: false,
        message: "Verification Code Required",
      });
    }
    // Check if Customer email and otp exist
    const customer = await customerRepo.findOne({
      where: {
        email: validEmail,
        otp: validCode,
        isDelete: false,
      },
    });
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer Not Found",
      });
    }
    // Check OTP provided is Correct
    if (customer.otp !== validCode) {
      return res.status(400).json({
        success: false,
        message: "Invalid Verification Code",
      });
    }
    // Check OTP Expiry
    if (!customer.otpExpiry || customer.otpExpiry < new Date()) {
      return res.status(400).json({
        success: false,
        message: "Verification Code Expired",
      });
    }
    (customer.isEmailVerified = true),
      (customer.otp = null),
      (customer.otpExpiry = null);

    await customerRepo.save(customer);

    return res.status(201).json({
      success: true,
      message: "Customer Email Verified Sucessfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const checkCustomerExist = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { email } = req.body;
    const customerExist = await customerRepo.findOne({
      where: {
        email: email,
        isDelete: false,
      },
    });
    const userExist = await userRepo.findOne({
      where: {
        email: email,
        isDelete: false,
      },
    });
    if (customerExist || userExist) {
      return res.status(200).json({
        success: false,
        exists: true,
        message: "This Email is already Registered in the system",
      });
    } else {
      return res.status(200).json({
        success: true,
        exists: false,
        message: "Email is available",
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const selectCustomerPackage = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { customerId } = req.params;
    const { packageId } = req.body;

    const customer = await customerRepo.findOne({
      where: { id: Number(customerId), isDelete: false }
    });
    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    const pkg = await packageRepo.findOne({
      where: { id: Number(packageId), isDelete: false }
    });
    if (!pkg) {
      return res.status(404).json({ success: false, message: "Package not found" });
    }

    // Find existing customer package
    const existingCustomerPackage = await customerPackageRepo.findOne({
      where: { customerId: Number(customerId), isDelete: false }
    });

    if (existingCustomerPackage) {
      // Check if package is being changed
      const isPackageChanged = existingCustomerPackage.packageId !== Number(packageId);
      
      // Update existing record
      existingCustomerPackage.packageId = Number(packageId);
      
      // If package changed, clear all add-ons
      if (isPackageChanged) {
        existingCustomerPackage.addOns = [];
      }
      // If package not changed, keep existing add-ons
      
      await customerPackageRepo.save(existingCustomerPackage);
    } else {
      // Create new record if no package exists
      await customerPackageRepo.save({
        customerId: Number(customerId),
        packageId: Number(packageId),
        addOns: [],
        isDelete: false
      });
    }

    // Update customer's packageId reference
    customer.packageId = Number(packageId);
    await customerRepo.save(customer);

    return res.status(201).json({
      success: true,
      message: "Package selected successfully"
    });

  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const selectCustomerAddOns = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { customerId, packageId } = req.params;
    const { selectedAddOns } = req.body;

    const customerPackage = await customerPackageRepo.findOne({
      where: { customerId: Number(customerId), isDelete: false }
    });

    if (!customerPackage) {
      return res.status(400).json({
        success: false,
        message: "Select a package first"
      });
    }

    // Verify customer hasn't changed package
    if (customerPackage.packageId !== Number(packageId)) {
      return res.status(400).json({
        success: false,
        message: "Package mismatch. Please select the current package's add-ons."
      });
    }

    const pkg = await packageRepo.findOne({
      where: { id: customerPackage.packageId, isDelete: false }
    });

    if (!pkg) {
      return res.status(404).json({ success: false, message: "Package not found" });
    }

    // Validate and build new add-ons list
    const validAddOns = [];
    const selectedModuleFeatures = new Set();

    for (const addOn of selectedAddOns) {
      const match = pkg.extraAddOn.find(
        a => a.module === addOn.module && a.feature === addOn.feature
      );
      
      if (!match) continue;

      const key = `${match.module}:${match.feature}`;
      selectedModuleFeatures.add(key);

      validAddOns.push({
        module: match.module,
        feature: match.feature,
        monthlyPrice: match.monthlyPrice,
        yearlyPrice: match.yearlyPrice,
        discount: match.discount,
        description: match.description
      });
    }

    // Keep existing add-ons that are still in the package and not being replaced
    const existingAddOns = customerPackage.addOns || [];
    for (const existingAddOn of existingAddOns) {
      const key = `${existingAddOn.module}:${existingAddOn.feature}`;
      
      // Only keep if not in new selection and still valid in package
      if (!selectedModuleFeatures.has(key)) {
        const stillValid = pkg.extraAddOn.find(
          a => a.module === existingAddOn.module && a.feature === existingAddOn.feature
        );
        
        if (stillValid) {
          validAddOns.push(existingAddOn);
        }
      }
    }

    // Remove duplicates 
    const uniqueAddOns = Array.from(
      new Map(validAddOns.map(item => [`${item.module}:${item.feature}`, item])).values()
    );

    customerPackage.addOns = uniqueAddOns;
    await customerPackageRepo.save(customerPackage);

    return res.status(200).json({
      success: true,
      message: "Add-ons updated successfully",
      data: { addOns: uniqueAddOns }
    });

  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getCustomerOrderSummary = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { customerId } = req.params;

    // Customer
    const customer = await customerRepo.findOne({
      where: { id: Number(customerId), isDelete: false },
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // Currency
    const currency = await currencyRepo.findOne({
      where: { id: customer.currencyId },
    });

    // Active package
    const customerPackage = await customerPackageRepo.findOne({
      where: { customerId: Number(customerId), isDelete: false },
    });

    if (!customerPackage) {
      return res.status(404).json({
        success: false,
        message: "Package not selected",
      });
    }

    // Package
    const pkg = await packageRepo.findOne({
      where: { id: customerPackage.packageId },
    });

    if (!pkg) {
      return res.status(404).json({
        success: false,
        message: "Package not found",
      });
    }

    const exchangeRate = currency?.exchangeRate || 1;

    // Helper function to apply discount
    const applyDiscount = (price: number, discount: number): number => {
      return price - (price * discount) / 100;
    };

    // Convert package with discount calculation
    const packageMonthlyPrice = (pkg.priceMonthly ?? 0) * exchangeRate;
    const packageYearlyPrice = (pkg.priceYearly ?? 0) * exchangeRate;
    const packageDiscount = pkg.discount || 0;

    const packageMonthlyAfterDiscount = applyDiscount(packageMonthlyPrice, packageDiscount);
    const packageYearlyAfterDiscount = applyDiscount(packageYearlyPrice, packageDiscount);

    const convertedPackage = {
      packageName: pkg.name,
      seats: pkg.seats,
      monthlyPrice: packageMonthlyPrice.toFixed(2),
      yearlyPrice: packageYearlyPrice.toFixed(2),
      discount: packageDiscount,
      monthlyPriceAfterDiscount: packageMonthlyAfterDiscount.toFixed(2),
      yearlyPriceAfterDiscount: packageYearlyAfterDiscount.toFixed(2),
    };

    // Convert add-ons with discount calculation
    const convertedAddOns = customerPackage.addOns?.map((addOn) => {
      const monthlyPrice = (addOn.monthlyPrice ?? 0) * exchangeRate;
      const yearlyPrice = (addOn.yearlyPrice ?? 0) * exchangeRate;
      const discount = addOn.discount || 0;

      return {
        module: addOn.module,
        feature: addOn.feature,
        monthlyPrice: monthlyPrice.toFixed(2),
        yearlyPrice: yearlyPrice.toFixed(2),
        discount: discount,
        monthlyPriceAfterDiscount: applyDiscount(monthlyPrice, discount).toFixed(2),
        yearlyPriceAfterDiscount: applyDiscount(yearlyPrice, discount).toFixed(2),
        description: addOn.description,
      };
    }) || [];

    // Calculate add-ons totals (after discount)
    const addOnsMonthlyTotal = convertedAddOns
      .reduce((total, addOn) => total + parseFloat(addOn.monthlyPriceAfterDiscount), 0)
      .toFixed(2);
    
    const addOnsYearlyTotal = convertedAddOns
      .reduce((total, addOn) => total + parseFloat(addOn.yearlyPriceAfterDiscount), 0)
      .toFixed(2);

    // Calculate totals (package + add-ons, both after discounts)
    const totalPriceMonthly = (
      parseFloat(convertedPackage.monthlyPriceAfterDiscount) + 
      parseFloat(addOnsMonthlyTotal)
    ).toFixed(2);
    
    const totalPriceYearly = (
      parseFloat(convertedPackage.yearlyPriceAfterDiscount) + 
      parseFloat(addOnsYearlyTotal)
    ).toFixed(2);

    // Calculate total savings
    const totalMonthlyBeforeDiscount = (
      packageMonthlyPrice + 
      convertedAddOns.reduce((total, addOn) => total + parseFloat(addOn.monthlyPrice), 0)
    ).toFixed(2);
    
    const totalYearlyBeforeDiscount = (
      packageYearlyPrice + 
      convertedAddOns.reduce((total, addOn) => total + parseFloat(addOn.yearlyPrice), 0)
    ).toFixed(2);

    const totalMonthlySavings = (
      parseFloat(totalMonthlyBeforeDiscount) - parseFloat(totalPriceMonthly)
    ).toFixed(2);
    
    const totalYearlySavings = (
      parseFloat(totalYearlyBeforeDiscount) - parseFloat(totalPriceYearly)
    ).toFixed(2);

    return res.status(200).json({
      success: true,
      data: {
        currency: {
          code: currency?.currencyCode,
          symbol: currency?.currencySymbol,
        },
        package: convertedPackage,
        addOns: convertedAddOns,
        summary: {
          // Add-ons subtotal
          addOnsMonthlyTotal,
          addOnsYearlyTotal,
          // Grand totals (after all discounts)
          totalPriceMonthly,
          totalPriceYearly,
          // Before discount totals
          totalMonthlyBeforeDiscount,
          totalYearlyBeforeDiscount,
          // Total savings
          totalMonthlySavings,
          totalYearlySavings,
        },
      },
      message: "Customer order summary fetched successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * @swagger
 * /api/customers/stats:
 *   get:
 *     summary: Get customer statistics
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         description: Filter by customer status
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Filter by year
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *         description: Filter by month
 *     responses:
 *       200:
 *         description: Customer statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalCustomers:
 *                   type: integer
 *                 activeCustomers:
 *                   type: integer
 *                 inactiveCustomers:
 *                   type: integer
 *                 licenseExpiredCustomers:
 *                   type: integer
 *                 totalSubscriptions:
 *                   type: integer
 *                 totalTrials:
 *                   type: integer
 */

export const getCustomerDashboardStats = async (req: Request, res: Response) => {
  try {
    const now = new Date();

    // Start of week (Monday)
    const getStartOfWeek = (date: Date) => {
      const d = new Date(date);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      d.setDate(diff);
      d.setHours(0, 0, 0, 0);
      return d;
    };

    // Start of month
    const getStartOfMonth = (date: Date) => {
      const d = new Date(date);
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      return d;
    };

    const startOfThisWeek = getStartOfWeek(now);
    const startOfPreviousWeek = new Date(startOfThisWeek);
    startOfPreviousWeek.setDate(startOfThisWeek.getDate() - 7);

    const startOfThisMonth = getStartOfMonth(now);
    const startOfPreviousMonth = new Date(startOfThisMonth);
    startOfPreviousMonth.setMonth(startOfThisMonth.getMonth() - 1);

    // Calculate how many days have passed in current week and month
    const daysIntoWeek = Math.floor((now.getTime() - startOfThisWeek.getTime()) / (1000 * 60 * 60 * 24));
    const daysIntoMonth = now.getDate() - 1; 

    // End points for previous periods
    const endOfPreviousWeek = new Date(startOfPreviousWeek);
    endOfPreviousWeek.setDate(startOfPreviousWeek.getDate() + daysIntoWeek);
    endOfPreviousWeek.setHours(23, 59, 59, 999);

    const endOfPreviousMonth = new Date(startOfPreviousMonth);
    endOfPreviousMonth.setDate(startOfPreviousMonth.getDate() + daysIntoMonth);
    endOfPreviousMonth.setHours(23, 59, 59, 999);

    const calculateGrowth = (current: number, previous: number): number => {
      if (previous === 0) {
        return current > 0 ? 100 : 0;
      }
      return Math.round(((current - previous) / previous) * 100);
    };

    const baseWhere = { isDelete: false };
    
    // Compare equal time periods
    const countPeriod = async (
      repo: any, 
      where: any, 
      startCurrent: Date, 
      endCurrent: Date,
      startPrevious: Date,
      endPrevious: Date
    ) => {
      const previous = await repo.count({
        where: {
          ...where,
          createdAt: And(MoreThanOrEqual(startPrevious), LessThanOrEqual(endPrevious)), 
        },
      });

      const current = await repo.count({
        where: {
          ...where,
          createdAt: And(MoreThanOrEqual(startCurrent), LessThanOrEqual(endCurrent)),
        },
      });

      return { current, previous, growth: calculateGrowth(current, previous) };
    };

    // Total counts
    const totalCustomers = await customerRepo.count({ where: baseWhere });
    const activeCustomers = await customerRepo.count({ where: { ...baseWhere, status: "Active" } });
    const inactiveCustomers = await customerRepo.count({ where: { ...baseWhere, status: "Inactive" } });
    const licenseExpired = await customerRepo.count({ where: { ...baseWhere, status: "License Expired" } });
    const totalTrials = await customerRepo.count({ where: { ...baseWhere, status: "Trial" } });
    const totalSubscriptions = await subscriptionRepo.count({ where: { isDelete: false } });

    // Weekly growth
    const [
      totalCustPeriod,
      activeCustPeriod,
      inactiveCustPeriod,
      licenseExpiredPeriod,
      trialsPeriod,
      subscriptionsPeriod,
    ] = await Promise.all([
      countPeriod(customerRepo, baseWhere, startOfThisWeek, now, startOfPreviousWeek, endOfPreviousWeek),
      countPeriod(customerRepo, { ...baseWhere, status: "Active" }, startOfThisWeek, now, startOfPreviousWeek, endOfPreviousWeek),
      countPeriod(customerRepo, { ...baseWhere, status: "Inactive" }, startOfThisWeek, now, startOfPreviousWeek, endOfPreviousWeek),
      countPeriod(customerRepo, { ...baseWhere, status: "License Expired" }, startOfThisWeek, now, startOfPreviousWeek, endOfPreviousWeek),
      countPeriod(customerRepo, { ...baseWhere, status: "Trial" }, startOfThisWeek, now, startOfPreviousWeek, endOfPreviousWeek),
      countPeriod(subscriptionRepo, { isDelete: false }, startOfThisWeek, now, startOfPreviousWeek, endOfPreviousWeek),
    ]);

    // Monthly growth
    const [
      totalCustMonthPeriod,
      activeCustMonthPeriod,
      inactiveCustMonthPeriod,
      licenseExpiredMonthPeriod,
      trialsMonthPeriod,
      subscriptionsMonthPeriod,
    ] = await Promise.all([
      countPeriod(customerRepo, baseWhere, startOfThisMonth, now, startOfPreviousMonth, endOfPreviousMonth),
      countPeriod(customerRepo, { ...baseWhere, status: "Active" }, startOfThisMonth, now, startOfPreviousMonth, endOfPreviousMonth),
      countPeriod(customerRepo, { ...baseWhere, status: "Inactive" }, startOfThisMonth, now, startOfPreviousMonth, endOfPreviousMonth),
      countPeriod(customerRepo, { ...baseWhere, status: "License Expired" }, startOfThisMonth, now, startOfPreviousMonth, endOfPreviousMonth),
      countPeriod(customerRepo, { ...baseWhere, status: "Trial" }, startOfThisMonth, now, startOfPreviousMonth, endOfPreviousMonth),
      countPeriod(subscriptionRepo, { isDelete: false }, startOfThisMonth, now, startOfPreviousMonth, endOfPreviousMonth),
    ]);

    return res.json({
      totalCustomers: {
        count: totalCustomers,
        weeklyGrowth: totalCustPeriod.growth,
        monthlyGrowth: totalCustMonthPeriod.growth,
      },
      activeCustomers: {
        count: activeCustomers,
        weeklyGrowth: activeCustPeriod.growth,
        monthlyGrowth: activeCustMonthPeriod.growth,
      },
      inactiveCustomers: {
        count: inactiveCustomers,
        weeklyGrowth: inactiveCustPeriod.growth,
        monthlyGrowth: inactiveCustMonthPeriod.growth,
      },
      licenseExpired: {
        count: licenseExpired,
        weeklyGrowth: licenseExpiredPeriod.growth,
        monthlyGrowth: licenseExpiredMonthPeriod.growth,
      },
      totalTrials: {
        count: totalTrials,
        weeklyGrowth: trialsPeriod.growth,
        monthlyGrowth: trialsMonthPeriod.growth,
      },
      totalSubscriptions: {
        count: totalSubscriptions,
        weeklyGrowth: subscriptionsPeriod.growth,
        monthlyGrowth: subscriptionsMonthPeriod.growth,
      },
    });

  } catch (error) {
    console.error("Error getting customer stats:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error instanceof Error ? error.message : error,
    });
  }
};

/**
 * @swagger
 * /api/customers:
 *   get:
 *     summary: Get all customers (paginated)
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc, dsc]
 *         description: Sort order (asc or desc)
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *         description: Filter by email (partial match)
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter customers created after this date (inclusive)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter customers created before this date (inclusive)
 *       - in: query
 *         name: id
 *         schema:
 *           type: string
 *         description: Filter by customer id (partial or exact)
 *       - in: query
 *         name: stage
 *         schema:
 *           type: string
 *         description: Filter by customer stage
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by customer type
 *       - in: query
 *         name: churnRisk
 *         schema:
 *           type: string
 *         description: Filter by churn risk
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by customer status
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter customers created after this date (inclusive)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter customers created before this date (inclusive)
 *     responses:
 *       200:
 *         description: List of customers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Customer'
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 totalCount:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *                 totalItems:
 *                   type: integer
 */

export const getAllCustomers = async (req: Request, res: Response): Promise<any> => {
  try {
    // Input validation & sanitization
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));

    const allowedSortFields = ['createdAt', 'expiryDate', 'lastActive', 'email', 'id'];
    const sortBy = allowedSortFields.includes(req.query.sortBy as string) 
      ? (req.query.sortBy as string) 
      : 'createdAt';
    
    const orderParam = (req.query.order as string)?.toLowerCase() || "asc";
    const order: "ASC" | "DESC" = orderParam === "desc" || orderParam === "dsc" ? "DESC" : "ASC";

    // Filters
    const email = (req.query.email as string) || "";
    const id = req.query.id ? Number(req.query.id) : undefined;
    const stage = req.query.stage as string | undefined;
    const type = req.query.type as string | undefined;
    const churnRisk = req.query.churnRisk as string | undefined;
    const status = req.query.status as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    // Build query
    let qb = customerRepo
      .createQueryBuilder("customer")
      .where("customer.isDelete = false");

    if (email) {
      qb.andWhere("customer.email LIKE :email", { email: `%${email}%` });
    }

    if (id && !isNaN(id)) {
      qb.andWhere("customer.id = :id", { id });
    }

    if (stage) {
      qb.andWhere("customer.stage = :stage", { stage });
    }

    if (type) {
      qb.andWhere("customer.businessType = :type", { type });
    }

    if (churnRisk) {
      qb.andWhere("customer.churnRisk = :churnRisk", { churnRisk });
    }

    if (status) {
      qb.andWhere("customer.status = :status", { status });
    }

    // Date filters - allow independent start/end dates
    if (startDate) {
      try {
        const start = new Date(startDate);
        if (!isNaN(start.getTime())) {
          qb.andWhere("customer.createdAt >= :start", { start });
        }
      } catch (e) {
        // Invalid date, skip filter
      }
    }

    if (endDate) {
      try {
        const end = new Date(endDate);
        if (!isNaN(end.getTime())) {
          qb.andWhere("customer.createdAt <= :end", { end });
        }
      } catch (e) {
        // Invalid date, skip filter
      }
    }

    // Execute query with pagination
    const [customers, total] = await qb
      .orderBy(`customer.${sortBy}`, order)
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    // Fetch related subscriptions
    const customerIds = customers.map((c) => c.id);
    const subscriptions = customerIds.length
      ? await subscriptionRepo.find({
          where: { customerId: In(customerIds), isDelete: false },
        })
      : [];

    // Fetch related packages
    const packageIds = [...new Set(subscriptions.map((s) => s.customerPackageId))]; // Use Set to avoid duplicates
    const packages = packageIds.length
      ? await packageRepo.findBy({ id: In(packageIds) })
      : [];

    // Create lookup maps
    const subscriptionMap = new Map();
    subscriptions.forEach((s) => subscriptionMap.set(s.customerId, s));

    const packageMap = new Map();
    packages.forEach((p) => packageMap.set(p.id, p));

    // Map data with relations
    const data = customers.map((customer) => {
      const subscription = subscriptionMap.get(customer.id);
      const pkg = subscription ? packageMap.get(subscription.customerPackageId) : null;

      return {
        ...customer,
        subscription: subscription
          ? {
              id: subscription.id,
              status: subscription.status,
              billingCycle: subscription.billingCycle,
              price: subscription.amount,
              isPaid: subscription.isPaid,
            }
          : null,
        package: pkg
          ? {
              id: pkg.id,
              name: pkg.name,
              type: pkg.type,
              price: {
                monthly: pkg.priceMonthly,
                yearly: pkg.priceYearly,
              },
            }
          : null,
      };
    });

    return res.json({
      data,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
      },
      filters: {
        email: email || null,
        id: id || null,
        stage: stage || null,
        type: type || null,
        churnRisk: churnRisk || null,
        status: status || null,
        startDate: startDate || null,
        endDate: endDate || null,
      }
    });
  } catch (error) {
    console.error("Error getting all customers:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * @swagger
 * /api/customers/deleted:
 *   get:
 *     summary: Get all deleted customers with pagination and filters
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *         description: Filter by customer email (partial match)
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter deleted customers from this date (ISO format)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter deleted customers up to this date (ISO format)
 *     responses:
 *       200:
 *         description: List of deleted customers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Customer'
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 totalCount:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *                 totalItems:
 *                   type: integer
 *       500:
 *         description: Internal server error
 */
export const getDeletedCustomers = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    // Pagination (safe)
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));

    const email = (req.query.email as string) || "";
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    const orderParam = (req.query.order as string)?.toLowerCase() || "desc";
    const order: "ASC" | "DESC" =
      orderParam === "asc" ? "ASC" : "DESC";

    const query = customerRepo
      .createQueryBuilder("customer")
      .where("customer.isDelete = true");

    // Email filter
    if (email) {
      query.andWhere("customer.email LIKE :email", {
        email: `%${email}%`,
      });
    }

    // Date filters (validated)
    if (startDate) {
      const start = new Date(startDate);
      if (!isNaN(start.getTime())) {
        query.andWhere("customer.deletedAt >= :start", { start });
      }
    }

    if (endDate) {
      const end = new Date(endDate);
      if (!isNaN(end.getTime())) {
        query.andWhere("customer.deletedAt <= :end", { end });
      }
    }

    // Query execution
    const [customers, totalItems] = await query
      .orderBy("customer.deletedAt", order)
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    // Total deleted (unfiltered)
    const totalCount = await customerRepo.count({
      where: { isDelete: true },
    });

    return res.status(200).json({
      success: true,
      data: customers,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalItems / limit),
        totalItems,
        totalCount,
      },
      filters: {
        email: email || null,
        startDate: startDate || null,
        endDate: endDate || null,
      },
    });
  } catch (err) {
    console.error("Get deleted customers error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * @swagger
 * /api/customers/{id}:
 *   put:
 *     summary: Update customer's practiceArea
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Customer ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - practiceArea
 *             properties:
 *               practiceArea:
 *                 type: string
 *                 description: The new practice area for the customer
 *     responses:
 *       201:
 *         description: Customer updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Customer'
 *       404:
 *         description: Customer not found
 *       500:
 *         description: Internal server error
 */
export const updateCustomer = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    const {error,value} = updateCustomerSchema.validate(req.body)
    if(error){
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      })
    }
    const customer = await customerRepo.findOne({ where: { id: Number(id), isDelete: false } });
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    if (value.practiceArea && Array.isArray(value.practiceArea)) {
      // Remove duplicates and filter out empty values
      const practiceAreaArray = value.practiceArea as string[];
      const filteredPracticeArea = practiceAreaArray.filter((item: string) =>
        item && typeof item === 'string' && item.trim() !== ''
      );
      customer.practiceArea = [...new Set(filteredPracticeArea)];
    }
    customer.updatedAt = new Date();

    const savedCustomer = await customerRepo.save(customer);

    return res.status(201).json({
      success: true,
      data: savedCustomer,
      message: "Customer updated successfully",
    });
  } catch (error) {
    console.error("Error updating customer:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const deleteCustomer = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;

    const customer = await customerRepo.findOne({ where: { id: +id, isDelete: false } });
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }
    

    customer.isDelete = true;
    customer.deletedAt = new Date();
    await customerRepo.save(customer);

    const user = await userRepo.findOne({
      where: { email: customer.email, isDelete: false },
    });

    if (user) {
      user.isDelete = true;
      await userRepo.save(user);
    }

    return res.status(200).json({
      success: true,
      message: "Customer deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting customer:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

/**
 * @openapi
 * /api/customers/{id}:
 *   get:
 *     summary: Get customer by ID
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Customer ID
 *     responses:
 *       200:
 *         description: Customer details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Customer'
 *       404:
 *         description: Customer not found
 *       403:
 *         description: Access denied
 */
export const getCustomerById = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    // Find customer by ID
    const customer = await customerRepo.findOne({
      where: {
        id: +id,
        isDelete: false,
      },
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // Check if user has permission to view this customer
    // Super admin can view all customers, regular users can only view their own customers
    const userRole = (req as any).user.role;
    if (userRole !== "super_admin" && customer.createdByUserId !== userId) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only view your own customers.",
      });
    }

    // Remove sensitive information before sending response
    const customerData = {
      id: customer.id,
      userId: customer.createdByUserId,
      firstName: customer.firstName,
      lastName: customer.lastName,
      businessName: customer.businessName,
      tradingName: customer.tradingName,
      note: customer.note,
      businessSize: customer.businessSize,
      businessEntity: customer.businessEntity,
      businessType: customer.businessType,
      businessAddress: customer.businessAddress,
      phoneNumber: customer.phoneNumber,
      email: customer.email,
      practiceArea: customer.practiceArea,
      status: customer.status,
      expiryDate: customer.expiryDate,
      isDelete: customer.isDelete,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    };

    return res.json({
      success: true,
      data: customerData,
      message: "Customer details retrieved successfully",
    });
  } catch (error) {
    console.error("Error getting customer by ID:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * @openapi
 * /api/customers/{customerId}/send-registration-email:
 *   post:
 *     summary: Send registration email to customer
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Customer ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               loginUrl:
 *                 type: string
 *                 description: Custom login URL
 *     responses:
 *       200:
 *         description: Registration email sent successfully
 *       404:
 *         description: Customer not found
 *       403:
 *         description: Access denied
 *       500:
 *         description: Internal server error
 */
export const sendRegistrationEmail = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { customerId } = req.params;
    const { loginUrl } = req.body; // Optional custom login URL

    // Find customer by ID
    const customer = await customerRepo.findOne({
      where: {
        id: +customerId,
        isDelete: false,
      },
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // Check if user has permission to send email for this customer
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;
    if (userRole !== "super_admin" && customer.createdByUserId !== userId) {
      return res.status(403).json({
        success: false,
        message:
          "Access denied. You can only send emails for your own customers.",
      });
    }

    // Prepare customer name
    const customerName = `${customer.firstName} ${customer.lastName}`;

    // Send registration email
    const emailSent = await sendCompanyRegistrationEmail(
      customer.email,
      customerName,
      customer.businessName,
      loginUrl ||
        process.env.FRONTEND_LOGIN_URL ||
        "https://vhr-system.com/login"
    );

    if (!emailSent) {
      return res.status(500).json({
        success: false,
        message: "Failed to send registration email. Please try again.",
      });
    }

    return res.json({
      success: true,
      message: `Registration email sent successfully to ${customer.email}`,
      data: {
        customerId: customer.id,
        customerName: customerName,
        businessName: customer.businessName,
        email: customer.email,
        sentAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Error sending registration email:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * @swagger
 * /api/customers/active-per-year:
 *   get:
 *     summary: Get count of active customers per year (last 3 years)
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active customer stats for the last 3 years
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 currentYear:
 *                   type: integer
 *                   description: The most recent year in the data
 *                 activeCustomers:
 *                   type: integer
 *                   description: Number of active customers in the current year
 *                 percentageChange:
 *                   type: number
 *                   format: float
 *                   description: Percentage change in active customers compared to previous year
 *                 yearlyData:
 *                   type: array
 *                   description: List of yearly active customer counts (sorted ascending by year)
 *                   items:
 *                     type: object
 *                     properties:
 *                       year:
 *                         type: integer
 *                         description: Year
 *                       count:
 *                         type: integer
 *                         description: Number of active customers in that year
 */

export const getActiveCustomersPerYear = async (req: Request, res: Response): Promise<any> => {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();

    const percentGrowth = (prev: number, curr: number) => {
      if (prev === 0 && curr === 0) return 0;
      if (prev === 0) return 100;
      return Number((((curr - prev) / prev) * 100).toFixed(2));
    };

    const applyGrowth = (data: any[]) => {
      let prev = 0;
      return data.map(d => {
        const growth = percentGrowth(prev, d.y);
        prev = d.y;
        return { ...d, growth };
      });
    };

    const currentThreeYears = [currentYear - 2, currentYear - 1, currentYear]; // e.g., [2023, 2024, 2025]
    const previousThreeYears = [currentYear - 5, currentYear - 4, currentYear - 3]; // e.g., [2020, 2021, 2022]
    const monthLabels = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    
    const datasets: Record<number, any> = {};
    const currentPeriodTotals: number[] = [];
    const previousPeriodTotals: number[] = [];

    // Fetch data for current 3 years (2023, 2024, 2025)
    for (const year of currentThreeYears) {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59);

      const raw = await customerRepo
        .createQueryBuilder("customer")
        .select("MONTH(customer.createdAt)", "month")
        .addSelect("COUNT(*)", "count")
        .where("customer.isDelete = false")
        .andWhere("customer.status = :status", { status: "Active" })
        .andWhere("customer.createdAt BETWEEN :start AND :end", { start: startDate, end: endDate })
        .groupBy("MONTH(customer.createdAt)")
        .orderBy("MONTH(customer.createdAt)", "ASC")
        .getRawMany();

      const monthData = monthLabels.map((m, i) => {
        const record = raw.find(r => Number(r.month) === i + 1);
        return { x: m, y: record ? Number(record.count) : 0 };
      });

      const monthDataWithGrowth = applyGrowth(monthData);
      const yearTotal = monthDataWithGrowth.reduce((s, d) => s + d.y, 0);
      currentPeriodTotals.push(yearTotal);

      datasets[year] = {
        label: year.toString(),
        total: yearTotal,
        data: monthDataWithGrowth,
        yearOverYearGrowth: 0
      };
    }

    // Fetch totals for previous 3 years (2020, 2021, 2022) for comparison
    for (const year of previousThreeYears) {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59);

      const count = await customerRepo
        .createQueryBuilder("customer")
        .where("customer.isDelete = false")
        .andWhere("customer.status = :status", { status: "Active" })
        .andWhere("customer.createdAt BETWEEN :start AND :end", { start: startDate, end: endDate })
        .getCount();

      previousPeriodTotals.push(count);
    }

    // Calculate year-over-year growth (comparing each year with previous year)
    // 2024 vs 2023, 2025 vs 2024
    for (let i = 1; i < currentThreeYears.length; i++) {
      datasets[currentThreeYears[i]].yearOverYearGrowth = percentGrowth(
        currentPeriodTotals[i - 1], 
        currentPeriodTotals[i]
      );
    }

    // Total active customers in current 3-year period
    const totalCurrentPeriod = currentPeriodTotals.reduce((sum, total) => sum + total, 0);
    
    // Total active customers in previous 3-year period
    const totalPreviousPeriod = previousPeriodTotals.reduce((sum, total) => sum + total, 0);

    // Combined growth: comparing last 3 years (2023-2025) with previous 3 years (2020-2022)
    const combinedThreeYearGrowth = percentGrowth(totalPreviousPeriod, totalCurrentPeriod);

    // Growth from first year to last year in current period (2023 vs 2025)
    const currentPeriodGrowth = percentGrowth(
      currentPeriodTotals[0], 
      currentPeriodTotals[currentPeriodTotals.length - 1]
    );

    return res.status(200).json({
      view: "yearly",
      summary: {
        currentPeriod: {
          years: currentThreeYears,
          totalActiveCustomers: totalCurrentPeriod,
          yearlyBreakdown: currentThreeYears.map((year, idx) => ({
            year,
            total: currentPeriodTotals[idx]
          })),
          growthFromFirstToLast: currentPeriodGrowth // 2023 to 2025
        },
        previousPeriod: {
          years: previousThreeYears,
          totalActiveCustomers: totalPreviousPeriod,
          yearlyBreakdown: previousThreeYears.map((year, idx) => ({
            year,
            total: previousPeriodTotals[idx]
          }))
        },
        combinedGrowthPercentage: combinedThreeYearGrowth // (2023-2025) vs (2020-2022)
      },
      datasets
    });

  } catch (error) {
    console.error("Error in getActiveCustomersPerYear:", error);
    return res.status(500).json({ 
      message: "Failed to fetch active customer analytics" 
    });
  }
};
/**
 * @swagger
 * /api/customers/total-per-year:
 *   get:
 *     summary: Get total customers per year, quarter, month, week, or day
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: view
 *         schema:
 *           type: string
 *           enum: [yearly, quarterly, monthly, weekly, daily]
 *           default: yearly
 *         description: Aggregation view (yearly, quarterly, monthly, weekly, daily)
 *       - in: query
 *         name: compareYears
 *         schema:
 *           type: string
 *           example: "2023,2024"
 *         description: Comma-separated list of years to compare (e.g. 2023,2024)
 *     responses:
 *       200:
 *         description: Total customers per selected period(s)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 datasets:
 *                   type: object
 *                   additionalProperties:
 *                     type: object
 *                     properties:
 *                       label:
 *                         type: string
 *                         description: Year label (e.g. "2023")
 *                       data:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             x:
 *                               type: string
 *                               description: Period label (month, quarter, day, etc.)
 *                             y:
 *                               type: integer
 *                               description: Customer count for the period
 *       500:
 *         description: Internal server error
 */

export const getTotalCustomersPerYear = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const view = (req.query.view as string)?.toLowerCase() || "yearly";
    const now = new Date();
    const currentYear = now.getFullYear();

    const percentGrowth = (prev: number, curr: number) => {
      if (prev === 0 && curr === 0) return 0;
      if (prev === 0) return 100;
      return Number((((curr - prev) / prev) * 100).toFixed(2));
    };

    const applyGrowth = (data: any[]) => {
      let prev = 0;
      return data.map(d => {
        const growth = percentGrowth(prev, d.y);
        prev = d.y;
        return { ...d, growth };
      });
    };

    const calculateCombinedGrowth = (data: any[]) => {
      const firstValue = data[0]?.y || 0;
      const lastValue = data[data.length - 1]?.y || 0;
      return percentGrowth(firstValue, lastValue);
    };

    // YEARLY VIEW
    if (view === "yearly") {
      const years = [currentYear - 2, currentYear - 1, currentYear];
      const monthLabels = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      const datasets: Record<number, any> = {};
      const totalsPerYear: number[] = [];

      for (const year of years) {
        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year, 11, 31, 23, 59, 59);

        const raw = await customerRepo
          .createQueryBuilder("customer")
          .select("MONTH(customer.createdAt)", "month")
          .addSelect("COUNT(*)", "count")
          .where("customer.isDelete = false")
          .andWhere("customer.createdAt BETWEEN :start AND :end", {
            start: startDate,
            end: endDate,
          })
          .groupBy("MONTH(customer.createdAt)")
          .orderBy("MONTH(customer.createdAt)", "ASC")
          .getRawMany();

        const monthData = monthLabels.map((m, i) => {
          const record = raw.find(r => Number(r.month) === i + 1);
          return { x: m, y: record ? Number(record.count) : 0 };
        });

        const monthDataWithGrowth = applyGrowth(monthData);
        const total = monthDataWithGrowth.reduce((s, d) => s + d.y, 0);
        totalsPerYear.push(total);

        datasets[year] = {
          label: year.toString(),
          total,
          data: monthDataWithGrowth,
          growthPercentage: 0,
        };
      }

      // Calculate year-over-year growth
      for (let i = 1; i < years.length; i++) {
        datasets[years[i]].growthPercentage = percentGrowth(
          totalsPerYear[i - 1],
          totalsPerYear[i]
        );
      }

      const totalCustomersThreeYears = totalsPerYear.reduce((s, t) => s + t, 0);
      const combinedGrowthThreeYears = percentGrowth(
        totalsPerYear[0],
        totalsPerYear[totalsPerYear.length - 1]
      );

      return res.status(200).json({
        view: "yearly",
        totalCustomersLastThreeYears: totalCustomersThreeYears,
        combinedGrowthPercentageThreeYears: combinedGrowthThreeYears,
        datasets,
      });
    }

    // 24 HOURS VIEW
    if (view === "24hours" || view === "daily") {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);

      const hourlyMap = new Map<string, number>();

      // Initialize all 24 hours
      for (let i = 23; i >= 0; i--) {
        const d = new Date(endDate.getTime() - i * 60 * 60 * 1000);
        const label = d.toLocaleTimeString("en-US", {
          hour: "numeric",
          hour12: true
        });
        hourlyMap.set(label, 0);
      }

      const customers = await customerRepo
        .createQueryBuilder("customer")
        .select(["customer.createdAt"])
        .where("customer.isDelete = false")
        .andWhere("customer.createdAt BETWEEN :start AND :end", {
          start: startDate,
          end: endDate
        })
        .getMany();

      for (const customer of customers) {
        const hourLabel = new Date(customer.createdAt).toLocaleTimeString(
          "en-US",
          { hour: "numeric", hour12: true }
        );
        hourlyMap.set(
          hourLabel,
          (hourlyMap.get(hourLabel) || 0) + 1
        );
      }

      const data = Array.from(hourlyMap.entries()).map(([x, y]) => ({ x, y }));
      const dataWithGrowth = applyGrowth(data);
      const totalCustomers24Hours = dataWithGrowth.reduce((s, d) => s + d.y, 0);

      return res.status(200).json({
        view,
        totalCustomersLast24Hours: totalCustomers24Hours,
        data: dataWithGrowth
      });
    }

    // OTHER VIEWS (Monthly, Quarterly, Weekly)
    let labels: string[] = [];
    let groupExpr = "";
    let startDate: Date;
    let endDate: Date;
    let periodStartDate: Date;
    let periodEndDate: Date;

    const currentMonth = now.getMonth();

    // Calculate current week number
    const currentWeekResult = await customerRepo
      .createQueryBuilder("customer")
      .select("WEEK(:now)", "week")
      .setParameter("now", now)
      .getRawOne();
    const currentWeek = currentWeekResult?.week ? Number(currentWeekResult.week) : 1;

    const currentQuarter = Math.floor(currentMonth / 3) + 1;

    switch (view) {
      case "quarterly":
        labels = ["Q1","Q2","Q3","Q4"];
        groupExpr = "QUARTER(customer.createdAt)";
        startDate = new Date(currentYear, 0, 1);
        endDate = new Date(currentYear, 11, 31, 23, 59, 59);
        // Current quarter dates
        periodStartDate = new Date(currentYear, (currentQuarter - 1) * 3, 1);
        periodEndDate = new Date(currentYear, currentQuarter * 3, 0, 23, 59, 59);
        break;

      case "monthly":
        labels = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        groupExpr = "MONTH(customer.createdAt)";
        startDate = new Date(currentYear, 0, 1);
        endDate = new Date(currentYear, 11, 31, 23, 59, 59);
        // Current month dates
        periodStartDate = new Date(currentYear, currentMonth, 1);
        periodEndDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);
        break;

      case "weekly":
        labels = Array.from({ length: 52 }, (_, i) => `W${i + 1}`);
        groupExpr = "WEEK(customer.createdAt)";
        startDate = new Date(currentYear, 0, 1);
        endDate = new Date(currentYear, 11, 31, 23, 59, 59);
        // Current week dates (approximation)
        periodStartDate = new Date(now.getTime() - now.getDay() * 24 * 60 * 60 * 1000);
        periodStartDate.setHours(0, 0, 0, 0);
        periodEndDate = new Date(periodStartDate.getTime() + 6 * 24 * 60 * 60 * 1000);
        periodEndDate.setHours(23, 59, 59, 999);
        break;

      default:
        return res.status(400).json({ message: "Invalid view" });
    }

    // Get full year data
    const raw = await customerRepo
      .createQueryBuilder("customer")
      .select(groupExpr, "bucket")
      .addSelect("COUNT(*)", "count")
      .where("customer.isDelete = false")
      .andWhere("customer.createdAt BETWEEN :start AND :end", { 
        start: startDate, 
        end: endDate 
      })
      .groupBy(groupExpr)
      .orderBy(groupExpr, "ASC")
      .getRawMany();

    const series = labels.map((label, idx) => {
      const record = raw.find(r => Number(r.bucket) === idx + 1);
      return { x: label, y: record ? Number(record.count) : 0 };
    });

    const seriesWithGrowth = applyGrowth(series);
    const totalCustomersCurrentYear = seriesWithGrowth.reduce((s, d) => s + d.y, 0);
    const combinedGrowth = calculateCombinedGrowth(seriesWithGrowth);

    // Get current period data
    const periodCount = await customerRepo
      .createQueryBuilder("customer")
      .where("customer.isDelete = false")
      .andWhere("customer.createdAt BETWEEN :start AND :end", { 
        start: periodStartDate, 
        end: periodEndDate 
      })
      .getCount();

    let periodLabel = "";
    if (view === "monthly") {
      periodLabel = labels[currentMonth];
    } else if (view === "quarterly") {
      periodLabel = `Q${currentQuarter}`;
    } else if (view === "weekly") {
      periodLabel = `W${currentWeek}`;
    }

    return res.status(200).json({
      view,
      totalCustomersCurrentYear,
      combinedGrowthPercentageCurrentYear: combinedGrowth,
      currentPeriod: {
        label: periodLabel,
        totalCustomers: periodCount
      },
      data: seriesWithGrowth,
    });

  } catch (error) {
    console.error("getTotalCustomersPerYear error:", error);
    return res.status(500).json({ message: "Failed to fetch customer analytics" });
  }
};

/**
 * @swagger
 * /api/customers/revenue-trend:
 *   get:
 *     summary: Get revenue trend per year (with growth)
 *     description: Returns the total number of customers for each year (or other time view), including growth percentage and datasets for charting.
 *     tags:
 *       - Customers
 *     parameters:
 *       - in: query
 *         name: view
 *         schema:
 *           type: string
 *           enum: [yearly, quarterly, monthly, weekly, 24hours]
 *         description: The time view for grouping results (default is yearly)
 *       - in: query
 *         name: compareYears
 *         schema:
 *           type: string
 *         description: Comma-separated list of years to compare (e.g., "2023,2024")
 *     responses:
 *       200:
 *         description: Total customers and growth data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalRevenue:
 *                   type: integer
 *                   description: Total number of customers for the latest year
 *                 growthPercentage:
 *                   type: number
 *                   format: float
 *                   description: Growth percentage compared to previous year
 *                 datasets:
 *                   type: object
 *                   additionalProperties:
 *                     type: object
 *                     properties:
 *                       label:
 *                         type: string
 *                       data:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             x:
 *                               type: string
 *                             y:
 *                               type: integer
 *       500:
 *         description: Error fetching revenue trend per year
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 error:
 *                   type: string
 */
export const getRevenueTrend = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const view = (req.query.view as string)?.toLowerCase() || "yearly";
    const now = new Date();
    const currentYear = now.getFullYear();

    const percentGrowth = (prev: number, curr: number) => {
      if (prev === 0 && curr === 0) return 0;
      if (prev === 0) return 100;
      return Number((((curr - prev) / prev) * 100).toFixed(2));
    };

    const applyGrowth = (data: { x: string; y: number }[]) => {
      let prev = 0;
      return data.map(d => {
        const growth = percentGrowth(prev, d.y);
        prev = d.y;
        return { ...d, growth };
      });
    };

    const calculateCombinedGrowth = (data: any[]) => {
      const firstValue = data[0]?.y || 0;
      const lastValue = data[data.length - 1]?.y || 0;
      return percentGrowth(firstValue, lastValue);
    };

    // 24 HOURS VIEW
    if (view === "24hours" || view === "daily") {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);

      const hourlyMap = new Map<string, number>();

      // Initialize all 24 hours
      for (let i = 23; i >= 0; i--) {
        const d = new Date(endDate.getTime() - i * 60 * 60 * 1000);
        const label = d.toLocaleTimeString("en-US", {
          hour: "numeric",
          hour12: true
        });
        hourlyMap.set(label, 0);
      }

      const transactions = await transactionRepo
        .createQueryBuilder("t")
        .select(["t.amount", "t.transactionDate"])
        .where("t.isDeleted = false")
        .andWhere("t.status = 'completed'")
        .andWhere("t.transactionDate BETWEEN :s AND :e", {
          s: startDate,
          e: endDate
        })
        .getMany();

      for (const tx of transactions) {
        const hourLabel = new Date(tx.transactionDate).toLocaleTimeString(
          "en-US",
          { hour: "numeric", hour12: true }
        );
        hourlyMap.set(
          hourLabel,
          (hourlyMap.get(hourLabel) || 0) + Number(tx.amount)
        );
      }

      const data = Array.from(hourlyMap.entries()).map(([x, y]) => ({ x, y }));
      const dataWithGrowth = applyGrowth(data);
      const totalRevenue24Hours = dataWithGrowth.reduce((s, d) => s + d.y, 0);

      return res.status(200).json({
        view,
        totalRevenueLast24Hours: totalRevenue24Hours,
        transactionCount: transactions.length,
        data: dataWithGrowth
      });
    }

    // YEARLY VIEW
    if (view === "yearly") {
      const years = [currentYear - 2, currentYear - 1, currentYear];
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      const datasets: Record<number, any> = {};
      const totals: number[] = [];

      for (const year of years) {
        const start = new Date(year, 0, 1);
        const end = new Date(year, 11, 31, 23, 59, 59);

        const raw = await transactionRepo
          .createQueryBuilder("t")
          .select("MONTH(t.transactionDate)", "bucket")
          .addSelect("SUM(t.amount)", "revenue")
          .where("t.isDeleted = false")
          .andWhere("t.status = 'completed'")
          .andWhere("t.transactionDate BETWEEN :s AND :e", { s: start, e: end })
          .groupBy("bucket")
          .getRawMany();

        const series = months.map((m, i) => {
          const r = raw.find(x => Number(x.bucket) === i + 1);
          return { x: m, y: r ? Number(r.revenue) : 0 };
        });

        const data = applyGrowth(series);
        const total = data.reduce((s, d) => s + d.y, 0);
        totals.push(total);

        datasets[year] = {
          label: String(year),
          total,
          data,
          growthPercentage: 0
        };
      }

      // Calculate year-over-year growth
      for (let i = 1; i < years.length; i++) {
        datasets[years[i]].growthPercentage = percentGrowth(
          totals[i - 1],
          totals[i]
        );
      }

      const totalRevenueThreeYears = totals.reduce((s, t) => s + t, 0);
      const combinedGrowthThreeYears = percentGrowth(
        totals[0],
        totals[totals.length - 1]
      );

      return res.status(200).json({
        view,
        totalRevenueLastThreeYears: totalRevenueThreeYears,
        combinedGrowthPercentageThreeYears: combinedGrowthThreeYears,
        datasets
      });
    }

    // OTHER VIEWS (Monthly, Quarterly, Weekly)
    let labels: string[] = [];
    let groupExpr = "";
    let startDate!: Date;
    let endDate!: Date;
    let periodStartDate!: Date;
    let periodEndDate!: Date;

    const currentMonth = now.getMonth();

    // Calculate current week
    const currentWeekResult = await transactionRepo
      .createQueryBuilder("t")
      .select("WEEK(:now)", "week")
      .setParameter("now", now)
      .getRawOne();
    const currentWeek = currentWeekResult?.week ? Number(currentWeekResult.week) : 1;

    const currentQuarter = Math.floor(currentMonth / 3) + 1;

    switch (view) {
      case "monthly":
        labels = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        groupExpr = "MONTH(t.transactionDate)";
        startDate = new Date(currentYear, 0, 1);
        endDate = new Date(currentYear, 11, 31, 23, 59, 59);
        // Current month dates
        periodStartDate = new Date(currentYear, currentMonth, 1);
        periodEndDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);
        break;

      case "quarterly":
        labels = ["Q1","Q2","Q3","Q4"];
        groupExpr = "QUARTER(t.transactionDate)";
        startDate = new Date(currentYear, 0, 1);
        endDate = new Date(currentYear, 11, 31, 23, 59, 59);
        // Current quarter dates
        periodStartDate = new Date(currentYear, (currentQuarter - 1) * 3, 1);
        periodEndDate = new Date(currentYear, currentQuarter * 3, 0, 23, 59, 59);
        break;

      case "weekly":
        labels = Array.from({ length: 52 }, (_, i) => `W${i + 1}`);
        groupExpr = "WEEK(t.transactionDate)";
        startDate = new Date(currentYear, 0, 1);
        endDate = new Date(currentYear, 11, 31, 23, 59, 59);
        // Current week dates (approximation)
        periodStartDate = new Date(now.getTime() - now.getDay() * 24 * 60 * 60 * 1000);
        periodStartDate.setHours(0, 0, 0, 0);
        periodEndDate = new Date(periodStartDate.getTime() + 6 * 24 * 60 * 60 * 1000);
        periodEndDate.setHours(23, 59, 59, 999);
        break;

      default:
        return res.status(400).json({ message: "Invalid view" });
    }

    // Get full year data
    const raw = await transactionRepo
      .createQueryBuilder("t")
      .select(groupExpr, "bucket")
      .addSelect("SUM(t.amount)", "revenue")
      .where("t.isDeleted = false")
      .andWhere("t.status = 'completed'")
      .andWhere("t.transactionDate BETWEEN :s AND :e", {
        s: startDate,
        e: endDate
      })
      .groupBy("bucket")
      .getRawMany();

    const series = labels.map((label, i) => {
      const r = raw.find(x => Number(x.bucket) === i + 1);
      return { x: label, y: r ? Number(r.revenue) : 0 };
    });

    const data = applyGrowth(series);
    const totalRevenueCurrentYear = data.reduce((s, d) => s + d.y, 0);
    const combinedGrowth = calculateCombinedGrowth(data);

    // Get current period revenue
    const periodResult = await transactionRepo
      .createQueryBuilder("t")
      .select("SUM(t.amount)", "revenue")
      .where("t.isDeleted = false")
      .andWhere("t.status = 'completed'")
      .andWhere("t.transactionDate BETWEEN :s AND :e", {
        s: periodStartDate,
        e: periodEndDate
      })
      .getRawOne();

    const periodRevenue = periodResult?.revenue ? Number(periodResult.revenue) : 0;

    let periodLabel = "";
    if (view === "monthly") {
      periodLabel = labels[currentMonth];
    } else if (view === "quarterly") {
      periodLabel = `Q${currentQuarter}`;
    } else if (view === "weekly") {
      periodLabel = `W${currentWeek}`;
    }

    return res.status(200).json({
      view,
      totalRevenueCurrentYear,
      combinedGrowthPercentageCurrentYear: combinedGrowth,
      currentPeriod: {
        label: periodLabel,
        totalRevenue: periodRevenue
      },
      data
    });

  } catch (error) {
    console.error("getRevenueTrend error:", error);
    return res.status(500).json({ message: "Failed to fetch revenue analytics" });
  }
};