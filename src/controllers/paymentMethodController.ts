import { Request, Response } from "express";
import { AppDataSource } from "../config/db";
import { PaymentMethod } from "../entity/PaymentMethod";
import * as crypto from 'crypto';
const algorithm = 'aes-256-cbc';
const secretKeyString = process.env.ENCRYPTION_KEY || 'your-secret-key-32-chars-long!!';
// Ensure key is exactly 32 bytes for AES-256
const secretKey = crypto.createHash('sha256').update(secretKeyString).digest();

const paymentRepo = AppDataSource.getRepository(PaymentMethod);

const encrypt = (text: string) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
};

/**
 * @openapi
 * /api/payments:
 *   post:
 *     summary: Create a new payment method
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentMethod
 *               - customerId
 *               - name
 *               - cardNumber
 *               - cardHolderName
 *               - cardExpiryDate
 *               - cardCvv
 *               - zipCode
 *               - country
 *             properties:
 *               paymentMethod:
 *                 type: string
 *               customerId:
 *                 type: integer
 *               name:
 *                 type: string
 *               cardNumber:
 *                 type: string
 *               cardHolderName:
 *                 type: string
 *               cardExpiryDate:
 *                 type: string
 *               cardCvv:
 *                 type: string
 *               zipCode:
 *                 type: string
 *               country:
 *                 type: string
 *               isDefault:
 *                 type: boolean
 *               isActive:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Payment method created successfully
 *       500:
 *         description: Internal server error
 */
export const createPayment = async (req: Request, res: Response): Promise<any> => {
  try {
    const {
      paymentMethod,
      customerId,
      name,
      cardNumber,
      cardHolderName,
      cardExpiryDate,
      cardCvv,
      zipCode,
      country,
      isDefault,
      isActive
    } = req.body;

    const userId = (req as any).user.id;

    // If this is set as default, unset other default payment methods for this customer
    if (isDefault) {
      await paymentRepo.update(
        { customerId, isDefault: true, isDelete: false },
        { isDefault: false }
      );
    }

    const newPaymentMethod = paymentRepo.create({
      paymentMethod,
      customerId,
      name,
      cardNumber: encrypt(cardNumber),
      cardHolderName,
      cardExpiryDate: encrypt(cardExpiryDate),
      cardCvv: encrypt(cardCvv),
      zipCode,
      country,
      isDefault: isDefault || false,
      isActive: isActive !== undefined ? isActive : true,
      isDelete: false
    });

    await paymentRepo.save(newPaymentMethod);

    return res.status(201).json({
      success: true,
      data: newPaymentMethod,
      message: 'Payment method created successfully'
    });

  } catch (error) {
    console.error('Error creating payment method:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * @openapi
 * /api/payments/customer/{customerId}:
 *   get:
 *     summary: Get all payment methods for a customer
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Customer ID
 *     responses:
 *       200:
 *         description: List of payment methods
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/PaymentMethod'
 *       500:
 *         description: Internal server error
 */
export const getCustomerPayments = async (req: Request, res: Response): Promise<any> => {
  try {
    const { customerId } = req.params;

    // Check if user has permission to view payments for this customer
    // For now, we'll allow super_admin to view all payments
    // In a real application, you might want to add customer-user relationship checks

    const payments = await paymentRepo.find({
      where: { 
        customerId,
        isDelete: false
      },
      order: { 
        isDefault: 'DESC',
        createdAt: 'DESC'
      }
    });

    // Mask sensitive card information
    const maskedPayments = payments.map(payment => ({
      ...payment,
      cardNumber: `****-****-****-${payment.cardNumber.slice(-4)}`,
      cardCvv: '***'
    }));

    return res.json({
      success: true,
      data: maskedPayments,
      message: 'Payment methods retrieved successfully'
    });

  } catch (error) {
    console.error('Error getting customer payments:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * @openapi
 * /api/payments/{id}:
 *   get:
 *     summary: Get payment method by ID
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Payment method ID
 *     responses:
 *       200:
 *         description: Payment method found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentMethod'
 *       404:
 *         description: Payment method not found
 *       500:
 *         description: Internal server error
 */
export const getPaymentById = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;

    const payment = await paymentRepo.findOne({
      where: { 
        id: +id,
        isDelete: false
      }
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment method not found"
      });
    }

    // Mask sensitive card information
    const maskedPayment = {
      ...payment,
      cardNumber: `****-****-****-${payment.cardNumber.slice(-4)}`,
      cardCvv: '***'
    };

    return res.json({
      success: true,
      data: maskedPayment,
      message: 'Payment method retrieved successfully'
    });

  } catch (error) {
    console.error('Error getting payment by ID:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * @openapi
 * /api/payments/{id}:
 *   put:
 *     summary: Update payment method
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Payment method ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               paymentMethod:
 *                 type: string
 *               name:
 *                 type: string
 *               cardNumber:
 *                 type: string
 *               cardHolderName:
 *                 type: string
 *               cardExpiryDate:
 *                 type: string
 *               cardCvv:
 *                 type: string
 *               zipCode:
 *                 type: string
 *               country:
 *                 type: string
 *               isDefault:
 *                 type: boolean
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Payment method updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentMethod'
 *       404:
 *         description: Payment method not found
 *       500:
 *         description: Internal server error
 */
export const updatePayment = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const {
      paymentMethod,
      name,
      cardNumber,
      cardHolderName,
      cardExpiryDate,
      cardCvv,
      zipCode,
      country,
      isDefault,
      isActive
    } = req.body;

    const payment = await paymentRepo.findOne({
      where: { 
        id: +id,
        isDelete: false
      }
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment method not found"
      });
    }

    // If this is set as default, unset other default payment methods for this customer
    if (isDefault && !payment.isDefault) {
      await paymentRepo.update(
        { customerId: payment.customerId, isDefault: true, isDelete: false },
        { isDefault: false }
      );
    }

    // Update payment fields
    const updateData: Partial<PaymentMethod> = {};
    
    if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;
    if (name !== undefined) updateData.name = name;
    if (cardNumber !== undefined) updateData.cardNumber = encrypt(cardNumber);
    if (cardHolderName !== undefined) updateData.cardHolderName = cardHolderName;
    if (cardExpiryDate !== undefined) updateData.cardExpiryDate = encrypt(cardExpiryDate);
    if (cardCvv !== undefined) updateData.cardCvv = encrypt(cardCvv);
    if (zipCode !== undefined) updateData.zipCode = zipCode;
    if (country !== undefined) updateData.country = country;
    if (isDefault !== undefined) updateData.isDefault = isDefault;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    Object.assign(payment, updateData);
    await paymentRepo.save(payment);

    // Mask sensitive information in response
    const maskedPayment = {
      ...payment,
      cardNumber: `****-****-****-${payment.cardNumber.slice(-4)}`,
      cardCvv: '***'
    };

    return res.json({
      success: true,
      data: maskedPayment,
      message: 'Payment method updated successfully'
    });

  } catch (error) {
    console.error('Error updating payment method:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Soft delete payment method
export const deletePayment = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;

    const payment = await paymentRepo.findOne({
      where: { 
        id: +id,
        isDelete: false
      }
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment method not found"
      });
    }

    // Set isDelete to true instead of actually deleting
    payment.isDelete = true;
    await paymentRepo.save(payment);

    return res.json({
      success: true,
      message: "Payment method deleted successfully"
    });

  } catch (error) {
    console.error('Error deleting payment method:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Set payment method as default
export const setDefaultPayment = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;

    const payment = await paymentRepo.findOne({
      where: { 
        id: +id,
        isDelete: false
      }
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment method not found"
      });
    }

    // Unset other default payment methods for this customer
    await paymentRepo.update(
      { customerId: payment.customerId, isDefault: true, isDelete: false },
      { isDefault: false }
    );

    // Set this payment method as default
    payment.isDefault = true;
    await paymentRepo.save(payment);

    return res.json({
      success: true,
      message: "Payment method set as default successfully"
    });

  } catch (error) {
    console.error('Error setting default payment method:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get default payment method for a customer
export const getDefaultPayment = async (req: Request, res: Response): Promise<any> => {
  try {
    const { customerId } = req.params;

    const payment = await paymentRepo.findOne({
      where: { 
        customerId,
        isDefault: true,
        isDelete: false
      }
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "No default payment method found for this customer"
      });
    }

    // Mask sensitive card information
    const maskedPayment = {
      ...payment,
      cardNumber: `****-****-****-${payment.cardNumber.slice(-4)}`,
      cardCvv: '***'
    };

    return res.json({
      success: true,
      data: maskedPayment,
      message: 'Default payment method retrieved successfully'
    });

  } catch (error) {
    console.error('Error getting default payment method:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
