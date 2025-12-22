import { Request, Response } from "express";
import { AppDataSource } from "../config/db";
import { PaymentMethod } from "../entity/PaymentMethod";
import * as crypto from 'crypto';

const paymentRepo = AppDataSource.getRepository(PaymentMethod);

const algorithm = 'aes-256-cbc';
const secretKey = crypto.createHash('sha256').update(process.env.ENCRYPTION_KEY || '32-char-secret-key!!').digest();

const encrypt = (text: string) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
};

const decrypt = (encryptedText: string) => {
  const [ivHex, encrypted] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(algorithm, secretKey, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

const maskCard = (cardNumber: string) => {
  try {
    const decrypted = decrypt(cardNumber);
    return `${decrypted.slice(0,4)}-****-****-****`;
  } catch {
    return '****-****-****-****';
  }
};

// ================= CREATE PAYMENT METHOD =================
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
      isDefault
    } = req.body;

    // Validation
    if (!paymentMethod || !customerId || !cardNumber || !cardHolderName) {
      return res.status(400).json({
        success: false,
        message: "Required fields missing: paymentMethod, customerId, cardNumber, cardHolderName"
      });
    }

    if (isDefault) {
      // Unset other default methods for this customer
      await paymentRepo.update(
        { customerId: String(customerId), isDefault: true, isDelete: false },
        { isDefault: false }
      );
    }

    // Check If Customer already has a same payment method 
    const existing = await paymentRepo.findOne({
      where: {
        customerId: String(customerId),
        paymentMethod,
        isDelete: false
      }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Payment method already exists. Please update it instead."
      });
    }

    const newPayment = paymentRepo.create({
      paymentMethod,
      customerId: String(customerId),
      name,
      cardNumber: encrypt(cardNumber),
      cardHolderName,
      cardExpiryDate: encrypt(cardExpiryDate),
      cardCvv: encrypt(cardCvv),
      zipCode,
      country,
      isDefault: isDefault || false,
      isActive: true,
      isDelete: false
    });

    await paymentRepo.save(newPayment);

    const masked = { 
      ...newPayment, 
      cardNumber: maskCard(newPayment.cardNumber), 
      cardCvv: '***',
      cardExpiryDate: '**/**'
    };

    return res.status(201).json({
      success: true,
      data: masked,
      message: 'Payment method created successfully'
    });
  } catch (error) {
    console.error('Error creating payment method:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ================= GET ALL PAYMENT METHODS FOR CUSTOMER =================
export const getCustomerPayments = async (req: Request, res: Response): Promise<any> => {
  try {
    const { customerId } = req.params;
    
    const payments = await paymentRepo.find({
      where: { customerId, isDelete: false, isActive: true },
      order: { isDefault: 'DESC', createdAt: 'DESC' }
    });

    const maskedPayments = payments.map(p => ({
      ...p,
      cardNumber: maskCard(p.cardNumber),
      cardExpiryDate: '**/**'
    }));

    return res.status(200).json({
      success: true,
      data: maskedPayments,
      message: 'Payment methods retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting payments:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ================= GET PAYMENT METHOD BY ID =================
export const getPaymentById = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const payment = await paymentRepo.findOne({ 
      where: { id: +id, isDelete: false } 
    });
    
    if (!payment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Payment method not found' 
      });
    }

    const masked = { 
      ...payment, 
      cardNumber: maskCard(payment.cardNumber), 
      cardCvv: '***',
      cardExpiryDate: '**/**'
    };

    return res.status(200).json({ 
      success: true, 
      data: masked, 
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

// ================= UPDATE PAYMENT METHOD =================
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
      isDefault 
    } = req.body;

    if (!id) {
      return res.status(400).json({ 
        success: false, 
        message: 'Payment method ID is required' 
      });
    }
      
    const payment = await paymentRepo.findOne({ 
      where: { id: +id, isDelete: false } 
    });

    if (!payment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Payment method not found' 
      });
    }

    if (isDefault && !payment.isDefault) {
      await paymentRepo.update({ 
        customerId: payment.customerId, 
        isDefault: true, 
        isDelete: false 
      }, { isDefault: false });
    }

    if (paymentMethod !== undefined) payment.paymentMethod = paymentMethod;
    if (name !== undefined) payment.name = name;
    if (cardNumber !== undefined) payment.cardNumber = encrypt(cardNumber);
    if (cardHolderName !== undefined) payment.cardHolderName = cardHolderName;
    if (cardExpiryDate !== undefined) payment.cardExpiryDate = encrypt(cardExpiryDate);
    if (cardCvv !== undefined) payment.cardCvv = encrypt(cardCvv);
    if (zipCode !== undefined) payment.zipCode = zipCode;
    if (country !== undefined) payment.country = country;
    if (isDefault !== undefined) payment.isDefault = isDefault;
    payment.isActive = true;

    await paymentRepo.save(payment);

    const masked = { 
      ...payment, 
      cardNumber: maskCard(payment.cardNumber), 
      cardCvv: '***',
      cardExpiryDate: '**/**'
    };

    return res.status(200).json({ 
      success: true, 
      data: masked, 
      message: 'Payment method updated successfully' 
    });

  } catch (error) {
    console.error('Error updating payment:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// ================= DELETE PAYMENT METHOD =================
export const deletePayment = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const payment = await paymentRepo.findOne({ 
      where: { id: +id, isDelete: false } 
    });
    
    if (!payment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Payment method not found' 
      });
    }

    payment.isDelete = true;
    payment.isActive = false;
    await paymentRepo.save(payment);

    return res.json({ 
      success: true, 
      message: 'Payment method deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting payment:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// ================= SET DEFAULT PAYMENT METHOD =================
export const setDefaultPayment = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const payment = await paymentRepo.findOne({ 
      where: { id: +id, isDelete: false } 
    });
    
    if (!payment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Payment method not found' 
      });
    }

    await paymentRepo.update({ 
      customerId: payment.customerId, 
      isDefault: true, 
      isDelete: false 
    }, { isDefault: false });
    
    payment.isDefault = true;
    await paymentRepo.save(payment);

    return res.json({ 
      success: true, 
      message: 'Payment method set as default successfully' 
    });
  } catch (error) {
    console.error('Error setting default payment:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// ================= GET DEFAULT PAYMENT METHOD =================
export const getDefaultPayment = async (req: Request, res: Response): Promise<any> => {
  try {
    const { customerId } = req.params;
    const payment = await paymentRepo.findOne({ 
      where: { 
        customerId, 
        isDefault: true, 
        isDelete: false,
        isActive: true 
      } 
    });
    
    if (!payment) {
      return res.status(404).json({ 
        success: false, 
        message: 'No default payment method found' 
      });
    }

    const masked = { 
      ...payment, 
      cardNumber: maskCard(payment.cardNumber),
      cardCvv: '***',
      cardExpiryDate: '**/**'
    };
    
    return res.json({ 
      success: true, 
      data: masked, 
      message: 'Default payment method retrieved successfully' 
    });
  } catch (error) {
    console.error('Error getting default payment:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};