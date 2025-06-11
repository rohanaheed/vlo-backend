import { Request, Response } from 'express';
import { AppDataSource } from '../config/db';
import { Customer } from '../entity/Customer';
import { customerSchema } from '../utils/validators/inputValidator';
import { Status } from '../entity/Customer';
import bcrypt from 'bcryptjs';

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
    customer.subscription = value.subscription;
    customer.note = value.note || '';
    customer.businessSize = value.businessSize;
    customer.businessEntity = value.businessEntity;
    customer.businessType = value.businessType;
    customer.phoneNumber = value.phoneNumber;
    customer.email = value.email;
    customer.password = await bcrypt.hash(value.password, 10); // Note: You should hash this password!
    customer.status = value.status as Status;
    customer.expirayDate = value.expirayDate || new Date(); // Default to current date

    // Save to database
    const customerRepository = AppDataSource.getRepository(Customer);
    const savedCustomer = await customerRepository.save(customer);

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