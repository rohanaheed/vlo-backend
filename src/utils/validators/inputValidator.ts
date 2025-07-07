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
  businessName: Joi.string().required().max(100),
  tradingName: Joi.string().required().max(100),
  subscription: Joi.string().required(),
  note: Joi.string().allow('').optional(),
  businessSize: Joi.number().integer().min(1).required(),
  businessEntity: Joi.string().required(),
  businessType: Joi.string().required(),
  phoneNumber: Joi.string().required().pattern(/^[0-9]{10,15}$/),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  status: Joi.string().valid('Active', 'Trial', 'License Expired', 'Free').default('Free'),
  expirayDate: Joi.date().iso().optional()
});

export const businessTypeSchema = Joi.object({
  name: Joi.string().min(2).required()
});

export const businessEntitySchema = Joi.object({
  name: Joi.string().min(2).required()
});

export const businessPracticeAreaSchema = Joi.object({
  name: Joi.string().min(2).required()
});

export const packageSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  description: Joi.string().min(10).max(500).required(),
  monthlyPrice: Joi.number().min(0).required(),
  annualPrice: Joi.number().min(0).required(),
  billingCycle: Joi.number().integer().min(1).required(),
  duration: Joi.number().integer().min(1).required(),
  maxEmployees: Joi.number().integer().min(1).required(),
  maxClients: Joi.number().integer().min(1).required(),
  isFree: Joi.boolean().required(),
  isPrivate: Joi.boolean().required(),
  isAutoRenewal: Joi.boolean().required(),
  isActive: Joi.boolean().required(),
  monthlyStatus: Joi.string().valid('active', 'inactive', 'pending').required(),
  annualStatus: Joi.string().valid('active', 'inactive', 'pending').required(),
  isDefault: Joi.boolean().required(),
  moduleInPackage: Joi.string().required()
});

export const autoRenewalSchema = Joi.object({
  isAutoRenewal: Joi.boolean().required()
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
  otp: Joi.string().length(6).pattern(/^[0-9]+$/).required(),
  newPassword: Joi.string().min(6).required()
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