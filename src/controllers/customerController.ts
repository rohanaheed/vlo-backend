import { Request, Response } from 'express';
import { AppDataSource } from '../config/db';
import { Customer } from '../entity/Customer';
import { customerSchema } from '../utils/validators/inputValidator';
import { Status } from '../entity/Customer';
import bcrypt from 'bcryptjs';
import { Subscription } from "../entity/Subscription";

const customerRepo = AppDataSource.getRepository(Customer);
const subscriptionRepo = AppDataSource.getRepository(Subscription);

export const createCustomer = async (req: Request, res: Response): Promise<any> => {
  try {
    // Validate request body
    const { error, value } = customerSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    // Create customer instance
    const customer = new Customer();
    customer.firstName = value.firstName;
    customer.lastName = value.lastName;
    customer.businessName = value.businessName;
    customer.tradingName = value.tradingName;
    customer.note = value.note || '';
    customer.businessSize = value.businessSize;
    customer.businessEntity = value.businessEntity;
    customer.businessType = value.businessType;
    customer.phoneNumber = value.phoneNumber;
    customer.email = value.email;
    customer.password = await bcrypt.hash(value.password, 10); // Note: You should hash this password!
    customer.status = value.status as Status;
    customer.expirayDate = value.expirayDate || new Date(); // Default to current date
    customer.isDelete = false;
    customer.createdAt = new Date();
    customer.updatedAt = new Date();

    const savedCustomer = await customerRepo.save(customer);

    return res.status(201).json({
      success: true,
      data: savedCustomer,
      message: 'Customer created successfully'
    });

  } catch (error) {
    console.error('Error creating customer:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getCustomerStats = async (req: Request, res: Response): Promise<any> => {

  const totalCustomers = await customerRepo.count();
  const activeCustomers = await customerRepo.count({ where: { status: "Active" } });
  const licenseExpiredCustomers = await customerRepo.count({ where: { status: "License Expired" } });
  const inactiveCustomers = await customerRepo.count({
    where: [{ status: "Trial" }, { status: "Free" }, { status: "License Expired" }]
  });

  const totalSubscriptions = await subscriptionRepo.count();

  return res.json({
    totalCustomers,
    activeCustomers,
    inactiveCustomers,
    licenseExpiredCustomers,
    totalSubscriptions,
  });
};


export const getAllCustomers = async (req: Request, res: Response): Promise<any> => {

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;

  const [customers, total] = await customerRepo.findAndCount({
    skip: (page - 1) * limit,
    take: limit,
    order: {
      createdAt: "DESC",
    },
    relations: ["subscriptions"], // if you want to include related subscriptions
  });

  return res.json({
    data: customers,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    totalItems: total,
  });
};

export const updateCustomer = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { practiceArea } = req.body;
    const customer = await customerRepo.findOne({ where: { id: +id } });
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // Create customer instance
    const updateCustomer = new Customer();
    customer.practiceArea = practiceArea;
    customer.updatedAt = new Date();

    const savedCustomer = await customerRepo.save(updateCustomer);

    return res.status(201).json({
      success: true,
      data: savedCustomer,
      message: 'Customer updated successfully'
    });

  } catch (error) {
    console.error('Error updating customer:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};