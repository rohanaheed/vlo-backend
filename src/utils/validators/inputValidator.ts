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
  title: Joi.string().valid('Mr', 'Mrs', 'Ms', 'Dr', 'Miss').optional(),
  firstName: Joi.string().required().max(50),
  middleName: Joi.string().allow('').optional().max(50),
  lastName: Joi.string().required().max(50),
  stage: Joi.string().required().max(50),
  churnRisk: Joi.string().required().max(50),
  businessName: Joi.string().required().max(100),
  tradingName: Joi.string().required().max(100),
  businessWebsite: Joi.string().optional(),
  referralCode: Joi.number().integer().optional(),
  note: Joi.string().allow('').optional(),
  businessSize: Joi.number().integer().min(1).required(),
  businessEntity: Joi.string().required(),
  businessType: Joi.string().required(),
  businessAddress: Joi.object({
    buildingName: Joi.string().required(),
    buildingNumber: Joi.string().required(),
    street: Joi.string().required(),
    town: Joi.string().required(),
    city: Joi.string().required(),
    county: Joi.string().allow('').optional(),
    country: Joi.string().required(),
    postalCode: Joi.string().required(),
  }).required(),
  phoneNumber: Joi.string().required().pattern(/^[0-9]{7,15}$/),
  phoneType: Joi.string().valid('Mobile', 'Work', 'Home').optional(),
  countryCode: Joi.string().optional().max(5),
  email: Joi.string().email().required(),
  emailType: Joi.string().valid('Work', 'Personal').optional(),
  password: Joi.string().min(8).required(),
  status: Joi.string().valid('Active', 'Trial', 'License Expired', 'Free', 'Inactive').default('Free'),
  expirayDate: Joi.date().iso().optional(),
  lastActive: Joi.date().iso().optional(),
  isDelete: Joi.boolean().optional().default(false),
  sendEmail: Joi.boolean().optional().default(false),
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
  currencyId: Joi.number().integer().optional(),
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

export const sendCodeSchema = Joi.object({
  email: Joi.string().email().required()
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
  BusinessPracticeAreaId: Joi.number().optional()
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

// HeadsUp validation schemas
export const headsUpSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  module: Joi.string().min(2).max(50).required(),
  enabled: Joi.boolean().optional().default(false),
  rule: Joi.string().min(2).max(500).required(),
  frequency: Joi.string().valid('daily', 'weekly', 'monthly', 'yearly').required(),
  timeOfDay: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
  timeZone: Joi.string().min(2).max(50).required(),
  status: Joi.string().valid('active', 'inactive').optional().default('active'),
  nextRunDate: Joi.date().iso().required(),
  lastRunDate: Joi.date().iso().required(),
  rowsInEmail: Joi.number().integer().min(0).optional().default(0),
  contentType: Joi.string().min(2).max(50).optional().default(''),
  resultsGrouped: Joi.string().min(2).max(100).optional().default(''),
  isDelete: Joi.boolean().optional().default(false),
  countOfExpiringSubscriptions: Joi.number().integer().min(0).optional().default(0),
  avgActivityLevel: Joi.number().integer().min(0).optional().default(0)
});

export const updateHeadsUpSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  module: Joi.string().min(2).max(50).optional(),
  enabled: Joi.boolean().optional(),
  rule: Joi.string().min(2).max(500).optional(),
  frequency: Joi.string().valid('daily', 'weekly', 'monthly', 'yearly').optional(),
  timeOfDay: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  timeZone: Joi.string().min(2).max(50).optional(),
  status: Joi.string().valid('active', 'inactive').optional(),
  nextRunDate: Joi.date().iso().optional(),
  lastRunDate: Joi.date().iso().optional(),
  rowsInEmail: Joi.number().integer().min(0).optional(),
  contentType: Joi.string().min(2).max(50).optional(),
  resultsGrouped: Joi.string().min(2).max(100).optional(),
  isDelete: Joi.boolean().optional(),
  countOfExpiringSubscriptions: Joi.number().integer().min(0).optional(),
  avgActivityLevel: Joi.number().integer().min(0).optional()
});

export const createFunnelMetricSchema = Joi.object({
  category: Joi.string().required(),
  metricType: Joi.string().required(),
  value: Joi.number().required(),
  date: Joi.date().iso().required(),
  source: Joi.string().required(),
  metadata: Joi.object().optional()
});

export const updateFunnelMetricSchema = Joi.object({
  category: Joi.string().optional(),
  metricType: Joi.string().optional(),
  value: Joi.number().optional(),
  date: Joi.date().iso().optional(),
  source: Joi.string().optional(),
  metadata: Joi.object().optional()
});

// Marketing Campaign Validators
export const campaignSchema = Joi.object({
  campaignName: Joi.string().min(2).max(255).required(),
  description: Joi.string().max(1000).optional(),
  campaignType: Joi.string().valid('Email', 'SMS', 'Social Media', 'Google Ads', 'WhatsApp', 'Telegram').required(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  budget: Joi.number().min(0).optional().default(0),
  status: Joi.string().valid('Draft', 'Active', 'Paused', 'Completed', 'Cancelled').optional().default('Draft'),
  audienceTargeting: Joi.string().max(500).optional(),
  content: Joi.string().max(2000).optional(),
  subjectLine: Joi.string().max(255).optional(),
  scheduleConfig: Joi.object().optional(),
  campaignSettings: Joi.object().optional(),
  businessId: Joi.number().integer().min(0).optional(),
  customerId: Joi.number().integer().min(0).optional(),
  currencyId: Joi.number().integer().min(0).optional(),
  packageId: Joi.number().integer().min(0).optional(),
  subscriptionId: Joi.number().integer().min(0).optional()
});

// Lead Validators
export const leadSchema = Joi.object({
  leadName: Joi.string().min(2).max(255).required(),
  email: Joi.string().email().optional(),
  phoneNumber: Joi.string().max(20).optional(),
  company: Joi.string().max(255).optional(),
  jobTitle: Joi.string().max(255).optional(),
  leadSource: Joi.string().valid('Website', 'Referral', 'Email Campaign', 'Social Media', 'Google Ads', 'Cold Call', 'Trade Show', 'Other').optional().default('Website'),
  status: Joi.string().valid('New', 'Contacted', 'Qualified', 'Unqualified', 'Converted', 'Lost').optional().default('New'),
  notes: Joi.string().max(1000).optional(),
  estimatedValue: Joi.number().min(0).optional().default(0),
  customFields: Joi.object().optional(),
  website: Joi.string().uri().optional(),
  linkedinUrl: Joi.string().uri().optional(),
  twitterHandle: Joi.string().max(50).optional(),
  address: Joi.string().max(500).optional(),
  city: Joi.string().max(100).optional(),
  state: Joi.string().max(100).optional(),
  country: Joi.string().max(100).optional(),
  postalCode: Joi.string().max(20).optional(),
  userId: Joi.number().integer().min(0).optional(),
  businessId: Joi.number().integer().min(0).optional(),
  customerId: Joi.number().integer().min(0).optional(),
  campaignId: Joi.number().integer().min(0).optional(),
  campaignChannelId: Joi.number().integer().min(0).optional(),
  emailCampaignId: Joi.number().integer().min(0).optional(),
  socialPostId: Joi.number().integer().min(0).optional(),
  smsCampaignId: Joi.number().integer().min(0).optional(),
  googleAdsId: Joi.number().integer().min(0).optional()
});

// Email Performance Validators
export const emailPerformanceSchema = Joi.object({
  campaignId: Joi.number().integer().positive().required(),
  campaignChannelId: Joi.number().integer().min(0).optional(),
  userId: Joi.number().integer().min(0).optional(),
  customerId: Joi.number().integer().min(0).optional(),
  currencyId: Joi.number().integer().min(0).optional(),
  date: Joi.date().iso().required(),
  campaignName: Joi.string().max(255).optional(),
  emailsSent: Joi.number().min(0).optional().default(0),
  totalOpened: Joi.number().min(0).optional().default(0),
  totalClicked: Joi.number().min(0).optional().default(0),
  totalBounced: Joi.number().min(0).optional().default(0),
  totalUnsubscribed: Joi.number().min(0).optional().default(0),
  openRate: Joi.number().min(0).max(100).optional().default(0),
  clickRate: Joi.number().min(0).max(100).optional().default(0),
  bounceRate: Joi.number().min(0).max(100).optional().default(0),
  unsubscribeRate: Joi.number().min(0).max(100).optional().default(0),
  uniqueOpens: Joi.number().min(0).optional().default(0),
  uniqueClicks: Joi.number().min(0).optional().default(0),
  uniqueOpenRate: Joi.number().min(0).max(100).optional().default(0),
  uniqueClickRate: Joi.number().min(0).max(100).optional().default(0),
  spamComplaints: Joi.number().min(0).optional().default(0),
  spamComplaintRate: Joi.number().min(0).max(100).optional().default(0),
  revenue: Joi.number().min(0).optional().default(0),
  conversions: Joi.number().min(0).optional().default(0),
  conversionRate: Joi.number().min(0).max(100).optional().default(0),
  deviceBreakdown: Joi.object().optional(),
  locationBreakdown: Joi.object().optional(),
  timeBreakdown: Joi.object().optional()
});

// Social Media Performance Validators
export const socialMediaPerformanceSchema = Joi.object({
  campaignId: Joi.number().integer().positive().required(),
  campaignChannelId: Joi.number().integer().min(0).optional(),
  userId: Joi.number().integer().min(0).optional(),
  customerId: Joi.number().integer().min(0).optional(),
  currencyId: Joi.number().integer().min(0).optional(),
  channelType: Joi.string().valid('Twitter', 'TikTok', 'YouTube', 'Instagram', 'LinkedIn', 'Facebook', 'Telegram').required(),
  postId: Joi.string().max(255).optional(),
  postContent: Joi.string().max(2000).optional(),
  date: Joi.date().iso().required(),
  impressions: Joi.number().min(0).optional().default(0),
  reach: Joi.number().min(0).optional().default(0),
  engagements: Joi.number().min(0).optional().default(0),
  likes: Joi.number().min(0).optional().default(0),
  comments: Joi.number().min(0).optional().default(0),
  shares: Joi.number().min(0).optional().default(0),
  retweets: Joi.number().min(0).optional().default(0),
  saves: Joi.number().min(0).optional().default(0),
  views: Joi.number().min(0).optional().default(0),
  watchTimeMinutes: Joi.number().min(0).optional().default(0),
  followersGained: Joi.number().min(0).optional().default(0),
  subscribersGained: Joi.number().min(0).optional().default(0),
  connectionsGained: Joi.number().min(0).optional().default(0),
  pageLikes: Joi.number().min(0).optional().default(0),
  forwards: Joi.number().min(0).optional().default(0),
  clicks: Joi.number().min(0).optional().default(0),
  profileViews: Joi.number().min(0).optional().default(0),
  websiteClicks: Joi.number().min(0).optional().default(0),
  engagementRate: Joi.number().min(0).max(100).optional().default(0),
  clickThroughRate: Joi.number().min(0).max(100).optional().default(0),
  reachRate: Joi.number().min(0).max(100).optional().default(0),
  impressionRate: Joi.number().min(0).max(100).optional().default(0),
  revenue: Joi.number().min(0).optional().default(0),
  conversions: Joi.number().min(0).optional().default(0),
  conversionRate: Joi.number().min(0).max(100).optional().default(0),
  demographicBreakdown: Joi.object().optional(),
  deviceBreakdown: Joi.object().optional(),
  locationBreakdown: Joi.object().optional(),
  timeBreakdown: Joi.object().optional(),
  hashtagPerformance: Joi.object().optional(),
  mentionPerformance: Joi.object().optional()
});

// SMS Performance Validators
export const smsPerformanceSchema = Joi.object({
  campaignId: Joi.number().integer().positive().required(),
  campaignChannelId: Joi.number().integer().min(0).optional(),
  userId: Joi.number().integer().min(0).optional(),
  customerId: Joi.number().integer().min(0).optional(),
  currencyId: Joi.number().integer().min(0).optional(),
  date: Joi.date().iso().required(),
  campaignName: Joi.string().max(255).optional(),
  smsSent: Joi.number().min(0).optional().default(0),
  delivered: Joi.number().min(0).optional().default(0),
  failed: Joi.number().min(0).optional().default(0),
  replies: Joi.number().min(0).optional().default(0),
  optOuts: Joi.number().min(0).optional().default(0),
  clicks: Joi.number().min(0).optional().default(0),
  conversions: Joi.number().min(0).optional().default(0),
  deliveryRate: Joi.number().min(0).max(100).optional().default(0),
  failureRate: Joi.number().min(0).max(100).optional().default(0),
  replyRate: Joi.number().min(0).max(100).optional().default(0),
  optOutRate: Joi.number().min(0).max(100).optional().default(0),
  clickThroughRate: Joi.number().min(0).max(100).optional().default(0),
  conversionRate: Joi.number().min(0).max(100).optional().default(0),
  cost: Joi.number().min(0).optional().default(0),
  revenue: Joi.number().min(0).optional().default(0),
  costPerSMS: Joi.number().min(0).optional().default(0),
  costPerDelivery: Joi.number().min(0).optional().default(0),
  costPerReply: Joi.number().min(0).optional().default(0),
  costPerConversion: Joi.number().min(0).optional().default(0),
  revenuePerSMS: Joi.number().min(0).optional().default(0),
  roi: Joi.number().optional().default(0),
  carrierBreakdown: Joi.object().optional(),
  countryBreakdown: Joi.object().optional(),
  regionBreakdown: Joi.object().optional(),
  timeBreakdown: Joi.object().optional(),
  messageType: Joi.string().max(50).optional(),
  messageLength: Joi.number().min(0).optional().default(0),
  keywordPerformance: Joi.object().optional(),
  linkPerformance: Joi.object().optional(),
  invalidNumber: Joi.number().min(0).optional().default(0),
  blockedNumber: Joi.number().min(0).optional().default(0),
  spamFiltered: Joi.number().min(0).optional().default(0),
  errorBreakdown: Joi.object().optional()
});

// Google Ads Performance Validators
export const googleAdsPerformanceSchema = Joi.object({
  campaignId: Joi.number().integer().positive().required(),
  campaignChannelId: Joi.number().integer().min(0).optional(),
  userId: Joi.number().integer().min(0).optional(),
  customerId: Joi.number().integer().min(0).optional(),
  currencyId: Joi.number().integer().min(0).optional(),
  date: Joi.date().iso().required(),
  campaignName: Joi.string().max(255).optional(),
  adGroupName: Joi.string().max(255).optional(),
  adId: Joi.string().max(255).optional(),
  keyword: Joi.string().max(255).optional(),
  impressions: Joi.number().min(0).optional().default(0),
  clicks: Joi.number().min(0).optional().default(0),
  conversions: Joi.number().min(0).optional().default(0),
  cost: Joi.number().min(0).optional().default(0),
  revenue: Joi.number().min(0).optional().default(0),
  ctr: Joi.number().min(0).max(100).optional().default(0),
  cpc: Joi.number().min(0).optional().default(0),
  cpm: Joi.number().min(0).optional().default(0),
  cpa: Joi.number().min(0).optional().default(0),
  conversionRate: Joi.number().min(0).max(100).optional().default(0),
  roas: Joi.number().optional().default(0),
  roi: Joi.number().optional().default(0),
  qualityScore: Joi.number().min(0).max(10).optional().default(0),
  avgCpc: Joi.number().min(0).optional().default(0),
  avgPosition: Joi.number().min(0).optional().default(0),
  searchImpressions: Joi.number().min(0).optional().default(0),
  searchClicks: Joi.number().min(0).optional().default(0),
  searchCtr: Joi.number().min(0).max(100).optional().default(0),
  searchCost: Joi.number().min(0).optional().default(0),
  displayImpressions: Joi.number().min(0).optional().default(0),
  displayClicks: Joi.number().min(0).optional().default(0),
  displayCtr: Joi.number().min(0).max(100).optional().default(0),
  displayCost: Joi.number().min(0).optional().default(0),
  videoViews: Joi.number().min(0).optional().default(0),
  videoClicks: Joi.number().min(0).optional().default(0),
  videoViewRate: Joi.number().min(0).max(100).optional().default(0),
  videoCost: Joi.number().min(0).optional().default(0),
  shoppingImpressions: Joi.number().min(0).optional().default(0),
  shoppingClicks: Joi.number().min(0).optional().default(0),
  shoppingCtr: Joi.number().min(0).max(100).optional().default(0),
  shoppingCost: Joi.number().min(0).optional().default(0),
  ageGroupBreakdown: Joi.object().optional(),
  genderBreakdown: Joi.object().optional(),
  locationBreakdown: Joi.object().optional(),
  deviceBreakdown: Joi.object().optional(),
  timeBreakdown: Joi.object().optional(),
  interestBreakdown: Joi.object().optional(),
  remarketingBreakdown: Joi.object().optional(),
  campaignType: Joi.string().max(100).optional(),
  biddingStrategy: Joi.string().max(100).optional(),
  networkType: Joi.string().max(100).optional(),
  budget: Joi.number().min(0).optional().default(0),
  dailyBudget: Joi.number().min(0).optional().default(0)
});

// Campaign Channel Validators
export const campaignChannelSchema = Joi.object({
  campaignId: Joi.number().integer().positive().required(),
  channelType: Joi.string().valid('Email', 'Twitter', 'TikTok', 'YouTube', 'WhatsApp', 'SMS', 'Instagram', 'LinkedIn', 'Facebook', 'Google Ads', 'Twilio').required(),
  channelName: Joi.string().max(255).optional(),
  channelUrl: Joi.string().uri().optional(),
  channelCredentials: Joi.object().optional(),
  isActive: Joi.boolean().optional().default(true),
  channelSettings: Joi.object().optional()
});

// Campaign Media Validators
export const campaignMediaSchema = Joi.object({
  campaignId: Joi.number().integer().positive().required(),
  campaignChannelId: Joi.number().integer().min(0).optional(),
  mediaUrl: Joi.string().uri().required(),
  mediaType: Joi.string().valid('image', 'video', 'document', 'audio', 'gif').optional().default('image'),
  mediaTitle: Joi.string().max(255).optional(),
  mediaDescription: Joi.string().max(1000).optional(),
  mediaSize: Joi.number().min(0).optional().default(0),
  mediaDuration: Joi.number().min(0).optional().default(0),
  thumbnailUrl: Joi.string().uri().optional(),
  altText: Joi.string().max(255).optional(),
  tags: Joi.array().items(Joi.string()).optional().default([]),
  isActive: Joi.boolean().optional().default(true)
});

// Bulk Operations Validators
export const bulkCampaignsSchema = Joi.object({
  campaigns: Joi.array().items(
    Joi.object({
      campaignName: Joi.string().min(2).max(255).required(),
      description: Joi.string().max(1000).optional(),
      campaignType: Joi.string().valid('Email', 'SMS', 'Social Media', 'Google Ads', 'WhatsApp', 'Telegram').required(),
      startDate: Joi.date().iso().optional(),
      endDate: Joi.date().iso().optional(),
      budget: Joi.number().min(0).optional().default(0),
      status: Joi.string().valid('Draft', 'Active', 'Paused', 'Completed', 'Cancelled').optional().default('Draft'),
      audienceTargeting: Joi.string().max(500).optional(),
      content: Joi.string().max(2000).optional(),
      subjectLine: Joi.string().max(255).optional(),
      scheduleConfig: Joi.object().optional(),
      campaignSettings: Joi.object().optional(),
      businessId: Joi.number().integer().min(0).optional(),
      customerId: Joi.number().integer().min(0).optional(),
      currencyId: Joi.number().integer().min(0).optional(),
      packageId: Joi.number().integer().min(0).optional(),
      subscriptionId: Joi.number().integer().min(0).optional()
    })
  ).min(1).max(50).required()
});

export const bulkLeadsSchema = Joi.object({
  leads: Joi.array().items(
    Joi.object({
      leadName: Joi.string().min(2).max(255).required(),
      email: Joi.string().email().optional(),
      phoneNumber: Joi.string().max(20).optional(),
      company: Joi.string().max(255).optional(),
      jobTitle: Joi.string().max(255).optional(),
      leadSource: Joi.string().valid('Website', 'Referral', 'Email Campaign', 'Social Media', 'Google Ads', 'Cold Call', 'Trade Show', 'Other').optional().default('Website'),
      status: Joi.string().valid('New', 'Contacted', 'Qualified', 'Unqualified', 'Converted', 'Lost').optional().default('New'),
      notes: Joi.string().max(1000).optional(),
      estimatedValue: Joi.number().min(0).optional().default(0),
      customFields: Joi.object().optional(),
      website: Joi.string().uri().optional(),
      linkedinUrl: Joi.string().uri().optional(),
      twitterHandle: Joi.string().max(50).optional(),
      address: Joi.string().max(500).optional(),
      city: Joi.string().max(100).optional(),
      state: Joi.string().max(100).optional(),
      country: Joi.string().max(100).optional(),
      postalCode: Joi.string().max(20).optional(),
      userId: Joi.number().integer().min(0).optional(),
      businessId: Joi.number().integer().min(0).optional(),
      customerId: Joi.number().integer().min(0).optional(),
      campaignId: Joi.number().integer().min(0).optional(),
      campaignChannelId: Joi.number().integer().min(0).optional(),
      emailCampaignId: Joi.number().integer().min(0).optional(),
      socialPostId: Joi.number().integer().min(0).optional(),
      smsCampaignId: Joi.number().integer().min(0).optional(),
      googleAdsId: Joi.number().integer().min(0).optional()
    })
  ).min(1).max(100).required()
});

export const bulkUpdateSchema = Joi.object({
  campaignIds: Joi.array().items(Joi.number().integer().positive()).min(1).max(100).required(),
  updateData: Joi.object().min(1).required()
});

export const bulkDeleteSchema = Joi.object({
  campaignIds: Joi.array().items(Joi.number().integer().positive()).min(1).max(100).required()
});

// Currency validation schemas
export const currencySchema = Joi.object({
  country: Joi.string().min(2).max(100).required(),
  currencyCode: Joi.string().min(2).max(10).required(),
  currencyName: Joi.string().min(2).max(100).required(),
  currencySymbol: Joi.string().min(1).max(10).required(),
  exchangeRate: Joi.number().min(0).optional().default(1),
  isCrypto: Joi.boolean().optional().default(false),
  USDPrice: Joi.number().min(0).optional().default(0)
});

export const updateCurrencySchema = Joi.object({
  country: Joi.string().min(2).max(100).optional(),
  currencyCode: Joi.string().min(2).max(10).optional(),
  currencyName: Joi.string().min(2).max(100).optional(),
  currencySymbol: Joi.string().min(1).max(10).optional(),
  exchangeRate: Joi.number().min(0).optional(),
  isCrypto: Joi.boolean().optional(),
  USDPrice: Joi.number().min(0).optional()
});

// Permission level values for UserGroup
const permissionLevelValues = ["Full Access", "Access Denied", "Data Entry", "Read Only"];

// Default permissions object schema for UserGroup
const defaultPermissionsSchema = Joi.object({
  clientsAndMatter: Joi.string().valid(...permissionLevelValues).required(),
  consultations: Joi.string().valid(...permissionLevelValues).required(),
  accounts: Joi.string().valid(...permissionLevelValues).required(),
  receiptBook: Joi.string().valid(...permissionLevelValues).required(),
  contactBook: Joi.string().valid(...permissionLevelValues).required(),
  logBook: Joi.string().valid(...permissionLevelValues).required(),
  reports: Joi.string().valid(...permissionLevelValues).required()
});

// Custom permission schema for dynamic modules
const modulePermissionSchema = Joi.object({
  module: Joi.string().min(2).max(100).required(),
  level: Joi.string().valid(...permissionLevelValues).required()
});

// Create UserGroup schema
export const userGroupSchema = Joi.object({
  title: Joi.string().min(2).max(100).required(),
  description: Joi.string().max(500).optional().allow(''),
  permissions: defaultPermissionsSchema.required(),
  customPermissions: Joi.array().items(modulePermissionSchema).optional(),
  isActive: Joi.boolean().optional().default(true)
});

// Update UserGroup schema
export const updateUserGroupSchema = Joi.object({
  title: Joi.string().min(2).max(100).optional(),
  description: Joi.string().max(500).optional().allow(''),
  permissions: defaultPermissionsSchema.optional(),
  customPermissions: Joi.array().items(modulePermissionSchema).optional(),
  isActive: Joi.boolean().optional()
});

// Custom permission schema for adding to a group
export const customPermissionSchema = Joi.object({
  module: Joi.string().min(2).max(100).required(),
  level: Joi.string().valid(...permissionLevelValues).required()
});

// User group assignment schema
export const assignUserGroupSchema = Joi.object({
  userGroupId: Joi.number().integer().positive().required()
});
