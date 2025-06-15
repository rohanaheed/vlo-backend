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