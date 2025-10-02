import Joi from "joi";

export const signupSchema = Joi.object({
  name: Joi.string().min(3).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid("user", "super_admin").optional()
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

export const customerSchema = Joi.object({
  firstName: Joi.string().required().max(50),
  lastName: Joi.string().required().max(50),
  logo: Joi.string().optional(),
  businessName: Joi.string().required().max(100),
  tradingName: Joi.string().required().max(100),
  note: Joi.string().allow('').optional(),
  businessSize: Joi.number().integer().min(1).required(),
  businessEntity: Joi.string().required(),
  businessType: Joi.string().required(),
  phoneNumber: Joi.string().required().pattern(/^[0-9]{10,15}$/),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  status: Joi.string().valid('Active', 'Trial', 'License Expired', 'Free').default('Free'),
  expirayDate: Joi.date().iso().optional(),
  createdByUserId: Joi.number().integer().positive().required(),
  isDelete: Joi.boolean().optional().default(false),
});

export const updateCustomerSchema = Joi.object({
  practiceArea: Joi.string().required(),
});

export const businessTypeSchema = Joi.object({
  name: Joi.string().min(2).required()
});

export const businessEntitySchema = Joi.object({
  name: Joi.string().min(2).required()
});

export const businessPracticeAreaSchema = Joi.object({
  title: Joi.string().min(2).required(),
  code: Joi.string().min(2).required()
});

export const packageSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  description: Joi.string().min(2).max(500).required(),
  type: Joi.string().valid("Free", "Trial", "Public Limited Company", "Paid").optional(),
  seats: Joi.number().integer().min(0).optional(),
  maxEmployee: Joi.number().integer().min(0).optional(),
  storageSize: Joi.number().integer().min(0).optional(),
  storageUnit: Joi.string().optional(),
  isPrivate: Joi.boolean().optional(),
  isRecommended: Joi.boolean().optional(),
  priceMonthly: Joi.number().min(0).optional(),
  priceYearly: Joi.number().min(0).optional(),
  discount: Joi.number().min(0).optional(),
  trialPeriod: Joi.number().min(0).optional(),
  notificationBeforeDays: Joi.number().min(0).optional(),
  trialMessage: Joi.string().optional(),
  status: Joi.number().integer().optional(),
  billingCycle: Joi.string().valid("Monthly", "Annual").optional(),
  isActive: Joi.boolean().optional(),
  includedFeatures: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      isEnabled: Joi.boolean().optional()
    })
  ).optional(),
  integrations: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      isEnabled: Joi.boolean().optional()
    })
  ).optional(),
  extraAddOn: Joi.array().items(
    Joi.object({
      module: Joi.string().required(),
      feature: Joi.string().optional(),
      monthlyPrice: Joi.number().min(0).optional(),
      yearlyPrice: Joi.number().min(0).optional(),
      discount: Joi.number().min(0).optional(),
      description: Joi.string().optional()
    })
  ).optional(),
  communicationTools: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      isEnabled: Joi.boolean().optional().default(true)
    })
  ).optional(),
  cloudStorage: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      isEnabled: Joi.boolean().optional().default(true)
    })
  ).optional(),
  socialMediaConnectors: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      isEnabled: Joi.boolean().optional().default(true)
    })
  ).optional()
});

export const updatePackageSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  description: Joi.string().min(10).max(500).optional(),
  type: Joi.string().valid('Free', 'Trial', 'Public Limited Company', 'Paid').optional(),
  seats: Joi.number().integer().min(0).optional(),
  maxEmployee: Joi.number().integer().min(0).optional(),
  storageSize: Joi.number().integer().min(0).optional(),
  storageUnit: Joi.string().optional(),
  isPrivate: Joi.boolean().optional(),
  isRecommended: Joi.boolean().optional(),
  priceMonthly: Joi.number().min(0).optional(),
  priceYearly: Joi.number().min(0).optional(),
  discount: Joi.number().min(0).optional(),
  trialPeriod: Joi.number().min(0).optional(),
  trialMessage: Joi.string().optional(),
  notificationBeforeDays: Joi.number().min(0).optional(),
  status: Joi.number().integer().optional(),
  billingCycle: Joi.string().valid('Monthly', 'Annual').optional(),
  isActive: Joi.boolean().optional(),
  includedFeatures: Joi.array().items(
    Joi.object({
      name: Joi.string().optional(),
      isEnabled: Joi.boolean().optional()
    })
  ).optional(),
  integrations: Joi.array().items(
    Joi.object({
      name: Joi.string().optional(),
      isEnabled: Joi.boolean().optional()
    })
  ).optional(),
  communicationTools: Joi.array().items(
    Joi.object({
      name: Joi.string().optional(),
      isEnabled: Joi.boolean().optional()
    })
  ).optional(),
  cloudStorage: Joi.array().items(
    Joi.object({
      name: Joi.string().optional(),
      isEnabled: Joi.boolean().optional()
    })
  ).optional(),
  socialMediaConnectors: Joi.array().items(
    Joi.object({
      name: Joi.string().optional(),
      isEnabled: Joi.boolean().optional()
    })
  ).optional(),
  extraAddOn: Joi.array().items(
    Joi.object({
      module: Joi.string().optional(),
      feature: Joi.string().optional(),
      monthlyPrice: Joi.number().min(0).optional(),
      yearlyPrice: Joi.number().min(0).optional(),
      discount: Joi.number().min(0).optional(),
      description: Joi.string().optional()
    })
  ).optional()
});

export const subscriptionSchema = Joi.object({
  type: Joi.string().required(),
  name: Joi.string().required(),
  maxEmployees: Joi.number().integer().min(1).required(),
  maxStorage: Joi.number().integer().min(1).required(),
  storageUnit: Joi.string().valid("MB", "GB", "TB").required(),
  isPrivate: Joi.boolean().required(),
  isRecommended: Joi.boolean().required(),
  price: Joi.string().required(),
  planDuration: Joi.string().required(),
  currency: Joi.string().required(),
  modules: Joi.array().items(Joi.string()).required(),
  additionalInformation: Joi.string().allow(""),
  briefBenifitLine: Joi.string().required()
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required()
});

export const verifyOTPSchema = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string().length(6).pattern(/^[0-9]+$/).required()
});

export const resetPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
  newPassword: Joi.string().min(6).required()
});

export const verifyUserSchema = Joi.object({
  email: Joi.number().integer().positive().required()
});

export const registrationEmailSchema = Joi.object({
  loginUrl: Joi.string().uri().optional()
});

export const paymentSchema = Joi.object({
  paymentMethod: Joi.string().required(),
  customerId: Joi.string().required(),
  name: Joi.string().min(2).max(100).required(),
  cardNumber: Joi.string().pattern(/^[0-9]{13,19}$/).required(),
  cardHolderName: Joi.string().min(2).max(100).required(),
  cardExpiryDate: Joi.string().pattern(/^(0[1-9]|1[0-2])\/([0-9]{2})$/).required(),
  cardCvv: Joi.string().pattern(/^[0-9]{3,4}$/).required(),
  zipCode: Joi.string().min(3).max(10).required(),
  country: Joi.string().min(2).max(50).required(),
  isDefault: Joi.boolean().optional(),
  isActive: Joi.boolean().optional()
});

export const updatePaymentSchema = Joi.object({
  paymentMethod: Joi.string().optional(),
  name: Joi.string().min(2).max(100).optional(),
  cardNumber: Joi.string().pattern(/^[0-9]{13,19}$/).optional(),
  cardHolderName: Joi.string().min(2).max(100).optional(),
  cardExpiryDate: Joi.string().pattern(/^(0[1-9]|1[0-2])\/([0-9]{2})$/).optional(),
  cardCvv: Joi.string().pattern(/^[0-9]{3,4}$/).optional(),
  zipCode: Joi.string().min(3).max(10).optional(),
  country: Joi.string().min(2).max(50).optional(),
  isDefault: Joi.boolean().optional(),
  isActive: Joi.boolean().optional()
});

export const invoiceSchema = Joi.object({
  invoiceNumber: Joi.string().min(3).max(50).required(),
  amount: Joi.number().positive().precision(2).required(),
  status: Joi.string().valid(
    'draft', 'sent', 'paid', 'overdue', 'cancelled', 
    'partialyPaid', 'disputed', 'reminder', 'resend', 
    'void', 'viewed', 'unpaid'
  ).default('draft'),
  paymentStatus: Joi.string().valid('pending', 'paid', 'failed', 'refunded').default('pending'),
  plan: Joi.string().min(2).max(100).required(),
  customerId: Joi.number().integer().positive().required(),
  currencyId: Joi.number().integer().positive().required(),
  orderId: Joi.number().integer().positive().required()
});

export const updateInvoiceSchema = Joi.object({
  invoiceNumber: Joi.string().min(3).max(50).optional(),
  amount: Joi.number().positive().precision(2).optional(),
  status: Joi.string().valid(
    'draft', 'sent', 'paid', 'overdue', 'cancelled', 
    'partialyPaid', 'disputed', 'reminder', 'resend', 
    'void', 'viewed', 'unpaid'
  ).optional(),
  paymentStatus: Joi.string().valid('pending', 'paid', 'failed', 'refunded').optional(),
  plan: Joi.string().min(2).max(100).optional(),
  customerId: Joi.number().integer().positive().optional(),
  currencyId: Joi.number().integer().positive().optional(),
  orderId: Joi.number().integer().positive().optional()
});

export const creditNoteSchema = Joi.object({
  creditNoteNumber: Joi.string().min(3).max(50).required(),
  amount: Joi.number().positive().precision(2).required(),
  customerId: Joi.number().integer().positive().required(),
  invoiceId: Joi.number().integer().positive().required(),
  currencyId: Joi.number().integer().positive().required(),
  status: Joi.string().valid(
    'draft', 'sent', 'paid', 'overdue', 'cancelled', 
    'partialyPaid', 'disputed', 'reminder', 'resend', 
    'void', 'viewed', 'unpaid'
  ).default('draft')
});

export const updateCreditNoteSchema = Joi.object({
  creditNoteNumber: Joi.string().min(3).max(50).optional(),
  amount: Joi.number().positive().precision(2).optional(),
  customerId: Joi.number().integer().positive().optional(),
  invoiceId: Joi.number().integer().positive().optional(),
  currencyId: Joi.number().integer().positive().optional(),
  status: Joi.string().valid(
    'draft', 'sent', 'paid', 'overdue', 'cancelled', 
    'partialyPaid', 'disputed', 'reminder', 'resend', 
    'void', 'viewed', 'unpaid'
  ).optional()
});

export const noteSchema = Joi.object({
  title: Joi.string().min(1).max(255).required(),
  content: Joi.string().min(1).required(),
  customerId: Joi.number().integer().positive().required(),
  type: Joi.string().min(1).max(100).required()
});

export const updateNoteSchema = Joi.object({
  title: Joi.string().min(1).max(255).optional(),
  content: Joi.string().min(1).optional(),
  customerId: Joi.number().integer().positive().optional(),
  type: Joi.string().min(1).max(100).optional()
});

export const matterSchema = Joi.object({
  customerId: Joi.number().integer().min(1).required(),
  description: Joi.string().allow('').optional(),
  fee: Joi.number().min(0).required(),
  caseWorker: Joi.string().allow('').optional(),
  supervisor: Joi.string().allow('').optional(),
  issueDate: Joi.date().iso().optional(),
});

export const updateMatterSchema = Joi.object({
  customerId: Joi.number().integer().min(1).optional(),
  description: Joi.string().allow('').optional(),
  fee: Joi.number().min(0).optional(),
  caseWorker: Joi.string().allow('').optional(),
  supervisor: Joi.string().allow('').optional(),
  issueDate: Joi.date().iso().optional(),
});

// Installment validation schemas
export const installmentSchema = Joi.object({
  amount: Joi.number().positive().precision(2).required(),
  dueDate: Joi.date().iso().required(),
  status: Joi.string().valid('unpaid', 'paid', 'overdue').default('unpaid'),
  paidDate: Joi.date().iso().allow(null),
  invoiceId: Joi.number().integer().positive().required()
});

export const updateInstallmentSchema = Joi.object({
  amount: Joi.number().positive().precision(2).optional(),
  dueDate: Joi.date().iso().optional(),
  status: Joi.string().valid('unpaid', 'paid', 'overdue').optional(),
  paidDate: Joi.date().iso().allow(null).optional(),
  invoiceId: Joi.number().integer().positive().optional()
});

// TimeBill validation schemas
export const timeBillSchema = Joi.object({
  customerId: Joi.number().integer().min(1),
  matterId: Joi.number().integer().min(1),
  entryId: Joi.number().integer().min(1),
  caseWorker: Joi.string().allow(),
  matter: Joi.string().allow(),
  costDescription: Joi.string().allow(),
  unit: Joi.string().allow(),
  duration: Joi.string().allow(),
  status: Joi.string().allow(),
  hourlyRate: Joi.string().allow(),
  activity: Joi.string().allow(),
  type: Joi.string().allow(),
  category: Joi.string().allow(),
  subCategory: Joi.string().allow()
});

export const updateTimeBillSchema = Joi.object({
  customerId: Joi.number().integer().min(1),
  matterId: Joi.number().integer().min(1),
  entryId: Joi.number().integer().min(1),
  caseWorker: Joi.string().allow(),
  matter: Joi.string().allow(),
  costDescription: Joi.string().allow(),
  unit: Joi.string().allow(),
  duration: Joi.string().allow(),
  status: Joi.string().allow()
});

export const createPackageModuleSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  includedFeatures: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      price: Joi.number().min(0).required(),
      isEnabled: Joi.boolean().required(),
      billingCycle: Joi.string().valid('Monthly', 'Annual').required()
    })
  ).required()
});

export const updatePackageModuleSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  includedFeatures: Joi.array().items(
    Joi.object({
      name: Joi.string().optional(),
      price: Joi.number().min(0).optional(),
      isEnabled: Joi.boolean().optional(),
      billingCycle: Joi.string().valid('Monthly', 'Annual').optional()
    })
  ).optional()
});


export const createSubscriptionSchema = Joi.object({
  packageId: Joi.number().integer().min(1).required(),
  customerId: Joi.number().integer().min(1).required()
});

export const updateSubscriptionSchema = Joi.object({
  packageId: Joi.number().integer().min(1).optional(),
  customerId: Joi.number().integer().min(1).optional()
});

export const subcategorySchema = Joi.object({
  title: Joi.string().min(2).max(100).required(),
  BusinessPracticeAreaId: Joi.number().integer().min(1).required()
});

export const updateSubcategorySchema = Joi.object({
  title: Joi.string().min(2).max(100).required(),
});

export const createCustomFieldGroupSchema = Joi.object({
  title: Joi.string().min(2).max(100).required(),
  subcategoryId: Joi.number().integer().min(1).required(),
  linkedTo: Joi.string().min(2).max(100).required()
});

export const updateCustomFieldGroupSchema = Joi.object({
  title: Joi.string().min(2).max(100),
  subcategoryId: Joi.number().integer().min(1).required(),
  linkedTo: Joi.string().min(2).max(100)
});



