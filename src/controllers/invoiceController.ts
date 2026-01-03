import { Request, Response } from 'express';
import { AppDataSource } from '../config/db';
import { Invoice } from '../entity/Invioce';
import { Customer } from '../entity/Customer';
import { Currency } from '../entity/Currency';
import { Order } from '../entity/Order';
import { FinancialStatement } from '../entity/FinancialStatement';
import { invoiceSchema, updateInvoiceSchema } from '../utils/validators/inputValidator';
import { Between } from 'typeorm';
import { uploadFileToS3, removeFileFromS3 } from '../utils/s3Utils';
import path from 'path';
import { generateInvoicePDF, generateFinancialStatementPDF } from '../utils/pdfUtils';
import { sendCustomerInvoiceEmail, sendInvoiceReminderEmail } from '../utils/emailUtils';
import { User } from '../entity/User';

const invoiceRepo = AppDataSource.getRepository(Invoice);
const customerRepo = AppDataSource.getRepository(Customer);
const currencyRepo = AppDataSource.getRepository(Currency);
const orderRepo = AppDataSource.getRepository(Order);
const financialRepo = AppDataSource.getRepository(FinancialStatement);
const userRepo = AppDataSource.getRepository(User);

// Convert Invoice to Customer Currency
const convertInvoiceToCustomerCurrency = async (invoice: any, customerCurrencyId: number): Promise<any> => {
  const currency = await currencyRepo.findOne({ where: { id: customerCurrencyId, isDelete: false } });
  const exchangeRate = Number(currency?.exchangeRate || 1);

  const convertedInvoice = { ...invoice };

  convertedInvoice.subTotal = Number((invoice.subTotal * exchangeRate).toFixed(2));
  convertedInvoice.vat = Number((invoice.vat * exchangeRate).toFixed(2));
  convertedInvoice.discountValue = Number((invoice.discountValue * exchangeRate).toFixed(2));
  convertedInvoice.total = Number((invoice.total * exchangeRate).toFixed(2));
  convertedInvoice.outstandingBalance = Number((invoice.outstandingBalance * exchangeRate).toFixed(2));
  convertedInvoice.amount = Number((invoice.amount * exchangeRate).toFixed(2));

  // Convert items
  if (invoice.items && Array.isArray(invoice.items)) {
    convertedInvoice.items = invoice.items.map((item: any) => ({
      ...item,
      amount: Number(((item.amount || 0) * exchangeRate).toFixed(2)),
      subTotal: Number(((item.subTotal || 0) * exchangeRate).toFixed(2))
    }));
  }

  return convertedInvoice;
};

// Calculate Totals in Base Currency
const calculateInvoiceTotals = (invoice: Invoice): void => {
  let calculatedSubTotal = 0;
  let calculatedVat = 0;

  if (invoice.items && invoice.items.length > 0) {
    invoice.items = invoice.items.map(item => {
      const quantity = Number(item.quantity) || 0;
      const amountInBaseCurrency = Number(item.amount) || 0;
      const vatRateString = item.vatRate || "0";
      const vatRateNumeric = Number(vatRateString.toString().replace('%', ''));

      // Calculate item subtotal
      const itemSubTotal = quantity * amountInBaseCurrency;

      // Calculate VAT
      const itemVatAmount = (itemSubTotal * vatRateNumeric) / 100;

      calculatedSubTotal += itemSubTotal;
      calculatedVat += itemVatAmount;

      return {
        ...item,
        amount: amountInBaseCurrency,
        subTotal: itemSubTotal,
        vatRate: vatRateString
      };
    });
  }

  invoice.subTotal = calculatedSubTotal;
  invoice.vat = calculatedVat;

  let totalBeforeDiscount = calculatedSubTotal + calculatedVat;

  let discountAmount = 0;
  const discountTypeString = invoice.discountType || "0";
  const discountTypeNumeric = Number(discountTypeString.toString().replace('%', ''));
  const discountType = discountTypeNumeric/100

  if (invoice.isDiscount && discountType ) {
    discountAmount = totalBeforeDiscount * discountType;
    invoice.discountValue = discountAmount;
  }

  invoice.total = totalBeforeDiscount - discountAmount;
  invoice.outstandingBalance = invoice.total;
  invoice.amount = invoice.total;
};

/**
 * @swagger
 * /api/invoices:
 *   post:
 *     summary: Create a new invoice
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - invoiceNumber
 *               - amount
 *               - plan
 *               - customerId
 *               - currencyId
 *               - orderId
 *             properties:
 *               invoiceNumber:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 50
 *               amount:
 *                 type: number
 *                 minimum: 0
 *               status:
 *                 type: string
 *                 enum: [draft, sent, paid, overdue, cancelled, partialyPaid, disputed, reminder, resend, void, viewed, unpaid]
 *                 default: draft
 *               paymentStatus:
 *                 type: string
 *                 enum: [pending, paid, failed, refunded]
 *               plan:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *               customerId:
 *                 type: integer
 *                 minimum: 1
 *               currencyId:
 *                 type: integer
 *                 minimum: 1
 *               orderId:
 *                 type: integer
 *                 minimum: 1
 *     responses:
 *       201:
 *         description: Invoice created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Invoice'
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation error
 *       404:
 *         description: Customer, Currency, or Order not found
 *       500:
 *         description: Internal server error
 */
export const createInvoice = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).user.id;
    // req type to include files property for multiple file uploads
    const reqWithFiles = req as Request & {
      files?: { buffer: Buffer, originalname: string, mimetype: string }[]
    };

    // Validate request body
    const { error, value } = invoiceSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    // Check Customer Exists
    const customer = await customerRepo.findOne({ where: { email: value.customerEmail, isDelete: false } });
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Check Currency Exists
    const currency = await currencyRepo.findOne({ where: { id: customer.currencyId, isDelete: false } });
    if (!currency) {
      return res.status(404).json({
        success: false,
        message: 'Currency not found'
      });
    }

    // Check Invoice Number Exists
    const invoiceNumber = `INV-${Math.floor(Math.random() * 90000) + 10000}`;

    const existingInvoice = await invoiceRepo.findOne({
      where: { invoiceNumber: invoiceNumber , status: 'draft', isDelete: false }
    });
    if (existingInvoice) {
      return res.status(400).json({
        success: false,
        message: 'Invoice number or Invoice with Status Draft already exists'
      });
    }

    // Create invoice
    const invoice = new Invoice();
    invoice.invoiceNumber = invoiceNumber;
    invoice.status = value.status || "draft";
    invoice.paymentStatus = value.paymentStatus || "pending";
    invoice.plan = value.plan || "";
    invoice.items = value.items || [];
    invoice.customerId = customer.id || 0;
    invoice.matterId = value.matterId || "";
    invoice.customerName = value.customerName;
    invoice.customerEmail = value.customerEmail;
    invoice.clientAddress = value.clientAddress || "";
    invoice.caseDescription = value.caseDescription || "";
    invoice.userId = userId;
    invoice.currencyId = currency.id;
    invoice.orderId = value.orderId || 0;
    invoice.dueDate = value.dueDate || null;
    invoice.IssueDate = value.IssueDate || null;
    invoice.referenceNumber = value.referenceNumber || "";
    invoice.priority = value.priority || "";
    invoice.isDiscount = value.isDiscount || false;
    invoice.discountType = value.discountType || "";
    invoice.recurring = value.recurring || "";
    invoice.recurringInterval = value.recurringInterval || "";
    invoice.recurringCount = value.recurringCount || 0;
    invoice.bankAccountId = value.bankAccountId || 0;
    invoice.notes = value.notes || "";
    invoice.paidDate = value.paidDate || null;
    invoice.isPaidBy = value.isPaidBy || false;
    invoice.includeFinancialStatement = value.includeFinancialStatement || false;
    invoice.includeRegulatoryInfo = value.includeRegulatoryInfo || false;
    invoice.scheduledDate = value.scheduledDate || null;
    invoice.isScheduled = value.isScheduled || false;
    invoice.isDelete = false;
    if(value.includeFinancialStatement){
      const financialStatement = await financialRepo.findOne({ where: { customerId:customer.id, isDelete: false } })
      if(financialStatement){
        invoice.financialStatementId = financialStatement.id;
      }
    }
    // Calculations
    calculateInvoiceTotals(invoice);

    // Handle multiple invoice file uploads to S3 if files are present
    const uploadedFileUrls: string[] = [];
    if (reqWithFiles.files && reqWithFiles.files.length > 0) {
      for (const file of reqWithFiles.files) {
        if (file.buffer && file.originalname && file.mimetype) {
          const ext = path.extname(file.originalname);
          const key = `invoices/${Date.now()}_${Math.random().toString(36).substring(2, 10)}${ext}`;
          const s3Url = await uploadFileToS3({
            bucket: process.env.INVOICE_BUCKET || '',
            buffer: file.buffer,
            originalname: file.originalname,
            mimetype: file.mimetype,
            key: key
          });
          uploadedFileUrls.push(s3Url);
        }
      }
    }
    invoice.invoiceFile = uploadedFileUrls.length > 0 ? uploadedFileUrls : null;

    const savedInvoice = await invoiceRepo.save(invoice);

     const shouldSendEmail = true;

    if (shouldSendEmail) {
      // Validate customer email
      if (!customer.email) {
        return res.status(400).json({
          success: false,
          message: 'Customer email is required to send invoice'
        });
      }
      const user = await userRepo.findOne({ where: { id: userId, isDelete: false } }); 
      if(!user){
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Update status
      savedInvoice.status = "sent";
      await invoiceRepo.save(savedInvoice);

      const customerInfo = {
        name: value.customerName,
        email: value.customerEmail,
        phone: `${customer.countryCode}${customer.phoneNumber}`,
        address: customer.businessAddress
      };

      // Generate invoice PDF
      const pdfBytes = await generateInvoicePDF({
        invoice: savedInvoice,
        customer: customerInfo,
        currency,
        user
      });

      let financialStatementPdfBytes: Uint8Array | undefined;

      if (savedInvoice.includeFinancialStatement) {
        const financialStatement = await financialRepo.findOne({
          where: { id: savedInvoice.financialStatementId, isDelete: false }
        });

        if (financialStatement) {
          financialStatementPdfBytes = await generateFinancialStatementPDF({
            financialStatement,
            customer: {
              name: financialStatement.customerName,
              email: financialStatement.customerEmail
            },
            currency
          });
        }
      }

      // Send email
      const emailSent = await sendCustomerInvoiceEmail(
        {
          name: customerInfo.name,
          email: customer.email
        },
        {
          invoiceNumber: savedInvoice.invoiceNumber,
          outstandingBalance: savedInvoice.outstandingBalance,
          paymentStatus: savedInvoice.paymentStatus,
          createdAt: savedInvoice.createdAt,
          dueDate: savedInvoice.dueDate
        },
        pdfBytes,
        {
          currencySymbol: currency?.currencySymbol || '£',
          currencyCode: currency?.currencyCode || 'GBP',
          exchangeRate: currency?.exchangeRate || 1
        },
        financialStatementPdfBytes
      );

      if (!emailSent) {
        return res.status(500).json({
          success: false,
          message: "Invoice created but failed to send email"
        });
      }

      return res.status(201).json({
        success: true,
        data: savedInvoice,
        message: `Invoice created and sent successfully to ${customer.email}`
      });
    }


  } catch (error) {
    console.error('Error creating invoice:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getInvoiceForPayment = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { invoiceId } = req.params;

    // Get Invoice
    const invoice = await invoiceRepo.findOne({
      where: { id: Number(invoiceId), isDelete: false }
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: "Invoice not found" });
    }

    // Get Customer
    const customer = await customerRepo.findOne({
      where: { id: invoice.customerId, isDelete: false }
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    // Get Currency
    const currency = await currencyRepo.findOne({
      where: { id: invoice.currencyId, isDelete: false }
    });

    if (!currency) {
      return res.status(404).json({ success: false, message: "Currency not found" });
    }

    // Convert invoice from base currency to customer currency
    const exchangeRate = Number(currency.exchangeRate || 1);
    const convertedInvoice = await convertInvoiceToCustomerCurrency(invoice, invoice.currencyId);

    // Convert invoice items to payment display format
    const items = convertedInvoice.items?.map((item: any) => ({
      description: item.description || "",
      quantity: item.quantity || 1,
      amount: item.amount || 0,
      subTotal: item.subTotal || 0,
      discount: item.discount || 0,
      discountType: item.discountType || "",
      vatRate: item.vatRate || "",
      vatType: item.vatType || ""
    })) || [];

    return res.status(200).json({
      success: true,
      invoiceNumber: convertedInvoice.invoiceNumber,
      invoiceId: convertedInvoice.id,
      status: convertedInvoice.status,
      paymentStatus: convertedInvoice.paymentStatus,
      dueDate: convertedInvoice.dueDate,
      issueDate: convertedInvoice.IssueDate,

      customer: {
        id: customer.id,
        name: `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || customer.businessName,
        email: customer.email,
        countryCode: customer.countryCode,
        phoneNumber: customer.phoneNumber,
        address: convertedInvoice.clientAddress
      },

      items,

      summary: {
        subTotal: convertedInvoice.subTotal,
        vat: convertedInvoice.vat,
        discount: convertedInvoice.discountValue || 0,
        discountType: convertedInvoice.discountType || "",
        total: convertedInvoice.total,
        outstandingBalance: convertedInvoice.outstandingBalance,
        amount: convertedInvoice.amount
      },

      currency: {
        id: currency.id,
        code: currency.currencyCode,
        symbol: currency.currencySymbol,
        exchangeRate: currency.exchangeRate
      }
    });

  } catch (error) {
    console.error("getInvoiceForPayment error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};


// Send Invoice Email
export const sendInvoice = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { invoiceId, customerId } = req.params;

    const invoice = await invoiceRepo.findOne({
      where: { id: Number(invoiceId) ,customerId: Number(customerId), isDelete: false },
      order: { createdAt: "DESC" }
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found"
      });
    }

    // Get Email Data
    const customer = await customerRepo.findOne({
      where: { id: Number(customerId), isDelete: false }
    });

    if (!customer || !customer.email) {
      return res.status(400).json({
        success: false,
        message: "Customer email not found"
      });
    }

    const order = await orderRepo.findOne({
      where: { id: invoice.orderId, isDelete: false }
    });

    const currency = await currencyRepo.findOne({
      where: { id: invoice.currencyId, isDelete: false }
    });

     const user = await userRepo.findOne({ where: { id: invoice.userId, isDelete: false } }); 
      if(!user){
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
    // Customer Info
    const customerInfo = {
      name: `${customer.firstName || ''} ${customer.lastName || ''}`.trim(),
      email: customer.email,
      phone: `${customer.countryCode}${customer.phoneNumber}`,
      address: customer.businessAddress
    };

    // Generate invoice PDF
    const pdfBytes = await generateInvoicePDF({
      invoice,
      customer: customerInfo,
      order,
      currency,
      user
    });

    // Generate financial statement PDF if included
    let financialStatementPdfBytes: Uint8Array | undefined;

    if (invoice.includeFinancialStatement && invoice.financialStatementId) {
      const financialStatement = await financialRepo.findOne({
        where: { id: invoice.financialStatementId, isDelete: false }
      });

      if (financialStatement) {
        financialStatementPdfBytes = await generateFinancialStatementPDF({
          financialStatement,
          customer: {
            name: financialStatement.customerName,
            email: financialStatement.customerEmail
          },
          currency
        });
      }
    }

    // Send email with PDF attachment
    const emailSent = await sendCustomerInvoiceEmail(
      {
        name: customerInfo.name,
        email: customer.email
      },
      {
        invoiceNumber: invoice.invoiceNumber,
        outstandingBalance: invoice.outstandingBalance,
        paymentStatus: invoice.paymentStatus,
        createdAt: invoice.createdAt,
        dueDate: invoice.dueDate
      },
      pdfBytes,
      {
        currencySymbol: currency?.currencySymbol || '£',
        currencyCode: currency?.currencyCode || 'GBP',
        exchangeRate: currency?.exchangeRate || 1
      },
      financialStatementPdfBytes
    );

    if (!emailSent) {
      return res.status(500).json({
        success: false,
        message: "Failed to send invoice email"
      });
    }

    // Update invoice status to sent
    invoice.status = "sent";
    await invoiceRepo.save(invoice);

    return res.status(200).json({
      success: true,
      data: invoice,
      message: `Invoice sent successfully to ${customer.email}`
    });
  } catch (error) {
    console.error("Error sending invoice:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send invoice: " + (error as Error).message
    });
  }
};

// Download Invoice
export const downloadInvoicePDF = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { invoiceId, customerId } = req.params;

    const invoice = await invoiceRepo.findOne({
      where: { id: Number(invoiceId), customerId: Number(customerId), isDelete: false },
      order: { createdAt: "DESC" }
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found"
      });
    }

    // Get Download Pdf Data
    const customer = await customerRepo.findOne({
      where: { id: Number(customerId), isDelete: false }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found"
      });
    }

    const order = await orderRepo.findOne({
      where: { id: invoice.orderId, isDelete: false }
    });

    const currency = await currencyRepo.findOne({
      where: { id: invoice.currencyId, isDelete: false }
    });

     const user = await userRepo.findOne({ where: { id: invoice.userId, isDelete: false } }); 
      if(!user){
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
    // Customer Info
    const customerInfo = {
      name: `${customer.firstName || ''} ${customer.lastName || ''}`,
      email: customer.email,
      phone: `${customer.countryCode}${customer.phoneNumber}`,
      address: customer.businessAddress
    };

    // Generate PDF
    const pdfBytes = await generateInvoicePDF({
      invoice,
      customer: customerInfo,
      order,
      currency,
      user
    });

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`
    );
    res.setHeader('Content-Length', pdfBytes.length);

    // Send PDF buffer
    return res.send(Buffer.from(pdfBytes));
  } catch (error) {
    console.error("Error downloading invoice:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate invoice PDF: " + (error as Error).message
    });
  }
};


// Cancel Invoice
export const cancelInvoice = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { invoiceId } = req.params;
    const { reason } = req.body;

    const invoice = await invoiceRepo.findOne({
      where: { id: Number(invoiceId), isDelete: false }
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found"
      });
    }

    if (invoice.paymentStatus === "paid") {
      return res.status(400).json({
        success: false,
        message: "Cannot cancel paid invoice. Please process a refund instead."
      });
    }

    invoice.status = "cancelled";
    invoice.paymentStatus = "cancelled";
    invoice.outstandingBalance = 0;
    await invoiceRepo.save(invoice);

    // Update Order
    const order = await orderRepo.findOne({
      where: { id: invoice.orderId, isDelete: false }
    });

    if (order) {
      order.status = "cancelled";
      if (reason) {
        order.note = (order.note || '') + `\n[Cancelled: ${reason}]`;
      }
      await orderRepo.save(order);
    }

    return res.status(200).json({
      success: true,
      data: { invoice, order },
      message: "Invoice cancelled successfully"
    });
  } catch (error) {
    console.error("Error cancelling invoice:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to cancel invoice: " + (error as Error).message
    });
  }
};
/**
 * @swagger
 * /api/invoices:
 *   get:
 *     summary: Get all invoices (paginated)
 *     tags: [Invoices]
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
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by invoice status
 *       - in: query
 *         name: paymentStatus
 *         schema:
 *           type: string
 *         description: Filter by payment status
 *       - in: query
 *         name: customerId
 *         schema:
 *           type: integer
 *         description: Filter by customer ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by start date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by end date
 *     responses:
 *       200:
 *         description: List of invoices
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
 *                     $ref: '#/components/schemas/Invoice'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     totalItems:
 *                       type: integer
 *       500:
 *         description: Internal server error
 */
export const getAllInvoices = async (req: Request, res: Response): Promise<any> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;
    const paymentStatus = req.query.paymentStatus as string;
    const customerId = req.query.customerId ? parseInt(req.query.customerId as string) : null;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    // Build where conditions
    const whereConditions: any = { isDelete: false };

    if (status) {
      whereConditions.status = status;
    }

    if (paymentStatus) {
      whereConditions.paymentStatus = paymentStatus;
    }

    if (customerId) {
      whereConditions.customerId = customerId;
    }

    if (startDate && endDate) {
      whereConditions.createdAt = Between(new Date(startDate), new Date(endDate));
    }

    const [invoices, total] = await invoiceRepo.findAndCount({
      where: whereConditions,
      skip: (page - 1) * limit,
      take: limit,
      order: {
        createdAt: "DESC"
      }
    });

    // // Convert all invoices from base currency to customer currency
    // const convertedInvoices = await Promise.all(
    //   invoices.map(invoice => convertInvoiceToCustomerCurrency(invoice, invoice.currencyId))
    // );

    const totalPages = Math.ceil(total / limit);

    return res.json({
      success: true,
      data: invoices,
      pagination: {
        page,
        limit,
        totalPages,
        totalItems: total
      }
    });

  } catch (error) {
    console.error('Error fetching invoices:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/invoices/{id}:
 *   get:
 *     summary: Get invoice by ID
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Invoice ID
 *     responses:
 *       200:
 *         description: Invoice details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Invoice'
 *       404:
 *         description: Invoice not found
 *       500:
 *         description: Internal server error
 */
export const getInvoiceById = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;

    const invoice = await invoiceRepo.findOne({
      where: { id: parseInt(id), isDelete: false }
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // // Convert from base currency to customer currency
    // const convertedInvoice = await convertInvoiceToCustomerCurrency(invoice, invoice.currencyId);

    return res.json({
      success: true,
      data: invoice,
      message: "Invoice Fetched"
    });

  } catch (error) {
    console.error('Error fetching invoice:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/invoices/{id}:
 *   put:
 *     summary: Update invoice by ID
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Invoice ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               invoiceNumber:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 50
 *               amount:
 *                 type: number
 *                 minimum: 0
 *               status:
 *                 type: string
 *                 enum: [draft, sent, paid, overdue, cancelled, partialyPaid, disputed, reminder, resend, void, viewed, unpaid]
 *               paymentStatus:
 *                 type: string
 *                 enum: [pending, paid, failed, refunded]
 *               plan:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *               customerId:
 *                 type: integer
 *                 minimum: 1
 *               currencyId:
 *                 type: integer
 *                 minimum: 1
 *               orderId:
 *                 type: integer
 *                 minimum: 1
 *     responses:
 *       200:
 *         description: Invoice updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Invoice'
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation error
 *       404:
 *         description: Invoice not found
 *       500:
 *         description: Internal server error
 */
export const updateInvoice = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    // Extend req type to include files property for multiple file uploads
    const reqWithFiles = req as Request & {
      files?: { buffer: Buffer, originalname: string, mimetype: string }[]
    };
    // Validate request body
    const { error, value } = updateInvoiceSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }
    // Check if invoice exists
    const existingInvoice = await invoiceRepo.findOne({
      where: { id: parseInt(id), isDelete: false }
    });
    if (!existingInvoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }
    // Check if new invoice number already exists
    if (value.invoiceNumber && value.invoiceNumber !== existingInvoice.invoiceNumber) {
      const duplicateInvoice = await invoiceRepo.findOne({
        where: { invoiceNumber: value.invoiceNumber, isDelete: false }
      });
      if (duplicateInvoice) {
        return res.status(400).json({
          success: false,
          message: 'Invoice number already exists'
        });
      }
    }
    // Validate
      const customer = await customerRepo.findOne({ where: { id: value.customerEmail, isDelete: false } });
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }
      const currency = await currencyRepo.findOne({ where: { id: customer.currencyId } });
      if (!currency) {
        return res.status(404).json({
          success: false,
          message: 'Currency not found'
        });
      }
    // if (value.orderId) {
    //   const order = await orderRepo.findOne({ where: { id: value.orderId } });
    //   if (!order) {
    //     return res.status(404).json({
    //       success: false,
    //       message: 'Order not found'
    //     });
    //   }
    // }
    // Handle invoice file replacement in S3 if new files are present
    if (reqWithFiles.files && reqWithFiles.files.length > 0) {
      // If there are existing files, remove them from S3
      if (existingInvoice.invoiceFile && Array.isArray(existingInvoice.invoiceFile)) {
        for (const fileUrl of existingInvoice.invoiceFile) {
          // Extract S3 key from URL
          const urlParts = fileUrl.split('.amazonaws.com/');
          if (urlParts.length === 2) {
            const s3Key = urlParts[1];
            await removeFileFromS3(process.env.INVOICE_BUCKET || '', s3Key);
          }
        }
      }
      // Upload new files
      const uploadedFileUrls: string[] = [];
      for (const file of reqWithFiles.files) {
        if (file.buffer && file.originalname && file.mimetype) {
          const ext = path.extname(file.originalname);
          const key = `invoices/${Date.now()}_${Math.random().toString(36).substring(2, 10)}${ext}`;
          const s3Url = await uploadFileToS3({
            bucket: process.env.INVOICE_BUCKET || '',
            buffer: file.buffer,
            originalname: file.originalname,
            mimetype: file.mimetype,
            key: key
          });
          uploadedFileUrls.push(s3Url);
        }
      }
      value.invoiceFile = uploadedFileUrls.length > 0 ? uploadedFileUrls : null;
    }
    // Update invoice
    Object.assign(existingInvoice, value);
    existingInvoice.updatedAt = new Date();
    if(value.includeFinancialStatement){
      const financialStatement = await financialRepo.findOne({ where: { customerId:customer.id, isDelete: false } })
      if(financialStatement){
        existingInvoice.financialStatementId = financialStatement.id;
      }
    }
    // Calculations in base currency
    calculateInvoiceTotals(existingInvoice);

    const updatedInvoice = await invoiceRepo.save(existingInvoice);
    return res.json({
      success: true,
      data: updatedInvoice,
      message: 'Invoice updated successfully'
    });
  } catch (error) {
    console.error('Error updating invoice:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/invoices/{id}:
 *   delete:
 *     summary: Delete invoice by ID (soft delete)
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Invoice ID
 *     responses:
 *       200:
 *         description: Invoice deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: Invoice not found
 *       500:
 *         description: Internal server error
 */
export const deleteInvoice = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const invoice = await invoiceRepo.findOne({
      where: { id: parseInt(id), isDelete: false }
    });
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }
    // Delete invoice files from S3 if exist
    if (invoice.invoiceFile && Array.isArray(invoice.invoiceFile)) {
      for (const fileUrl of invoice.invoiceFile) {
        const urlParts = fileUrl.split('.amazonaws.com/');
        if (urlParts.length === 2) {
          const s3Key = urlParts[1];
          await removeFileFromS3(process.env.INVOICE_BUCKET || '', s3Key);
        }
      }
    }
    // Soft delete
    invoice.isDelete = true;
    invoice.updatedAt = new Date();
    await invoiceRepo.save(invoice);
    return res.json({
      success: true,
      message: 'Invoice deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/invoices/stats:
 *   get:
 *     summary: Get invoice statistics
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               startDate:
 *                 type: string
 *                 format: date
 *                 description: Start date for filtering (inclusive, optional)
 *               endDate:
 *                 type: string
 *                 format: date
 *                 description: End date for filtering (inclusive, optional)
 *     responses:
 *       200:
 *         description: Invoice statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalInvoices:
 *                       type: integer
 *                     totalAmount:
 *                       type: number
 *                     totalOutstanding:
 *                       type: number
 *                     unsent:
 *                       type: integer
 *                     draft:
 *                       type: integer
 *                     sent:
 *                       type: integer
 *                     partial:
 *                       type: integer
 *                     overdue:
 *                       type: integer
 *                     paid:
 *                       type: integer
 *       500:
 *         description: Internal server error
 */
export const getInvoiceStats = async (req: Request, res: Response): Promise<any> => {
  try {
    // Get date filter from request body, fallback to current month
    let { startDate, endDate } = req.body || {};
    let filterStart: Date, filterEnd: Date;
    if (startDate && endDate) {
      filterStart = new Date(startDate);
      filterEnd = new Date(endDate);
      // Set end time to end of day
      filterEnd.setHours(23, 59, 59, 999);
    } else {
      const now = new Date();
      filterStart = new Date(now.getFullYear(), now.getMonth(), 1);
      filterEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    // Common filter for date range and not deleted
    const dateFilter = {
      isDelete: false,
      createdAt: Between(filterStart, filterEnd)
    };

    // Status counts
    const [
      totalInvoices,
      draftInvoices,
      sentInvoices,
      partialInvoices,
      overdueInvoices,
      paidInvoices,
      unsentInvoices
    ] = await Promise.all([
      invoiceRepo.count({ where: dateFilter }),
      invoiceRepo.count({ where: { ...dateFilter, status: 'draft' } }),
      invoiceRepo.count({ where: { ...dateFilter, status: 'sent' } }),
      invoiceRepo.count({ where: { ...dateFilter, status: 'partialyPaid' } }),
      invoiceRepo.count({ where: { ...dateFilter, status: 'overdue' } }),
      invoiceRepo.count({ where: { ...dateFilter, status: 'paid' } }),
      invoiceRepo.count({ where: [
        { ...dateFilter, status: 'draft' },
        { ...dateFilter, status: 'reminder' }
      ] })
    ]);

    // Get all invoices for this date range
    const invoices = await invoiceRepo.find({ where: dateFilter });

    // Calculate totalAmount and totalOutstanding
    const totalAmount = invoices.reduce((sum, invoice) => sum + invoice.amount, 0);
    const totalOutstanding = invoices
      .filter(inv => ['unpaid', 'partialyPaid', 'overdue'].includes(inv.status))
      .reduce((sum, inv) => sum + inv.amount, 0);

    return res.json({
      success: true,
      data: {
        totalInvoices,
        totalAmount: parseFloat(totalAmount.toFixed(2)),
        totalOutstanding: parseFloat(totalOutstanding.toFixed(2)),
        unsent: unsentInvoices,
        draft: draftInvoices,
        sent: sentInvoices,
        partial: partialInvoices,
        overdue: overdueInvoices,
        paid: paidInvoices
      }
    });
  } catch (error) {
    console.error('Error fetching invoice stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/invoices/customer/{customerId}:
 *   get:
 *     summary: Get invoices by customer ID
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Customer ID
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
 *     responses:
 *       200:
 *         description: Customer invoices
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
 *                     $ref: '#/components/schemas/Invoice'
 *                 pagination:
 *                   type: object
 *       404:
 *         description: Customer not found
 *       500:
 *         description: Internal server error
 */
export const getInvoicesByCustomer = async (req: Request, res: Response): Promise<any> => {
  try {
    const { customerId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    // Check if customer exists
    const customer = await customerRepo.findOne({ where: { id: parseInt(customerId), isDelete: false } });
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const [invoices, total] = await invoiceRepo.findAndCount({
      where: { customerId: parseInt(customerId), isDelete: false },
      skip: (page - 1) * limit,
      take: limit,
      order: {
        createdAt: "DESC"
      },
    });

    // Convert Invoice to Customer Currency
    const convertedInvoices = await Promise.all(
      invoices.map(invoice => convertInvoiceToCustomerCurrency(invoice, invoice.currencyId))
    );

    const totalPages = Math.ceil(total / limit);

    return res.json({
      success: true,
      data: convertedInvoices,
      pagination: {
        page,
        limit,
        totalPages,
        totalItems: total
      }
    });

  } catch (error) {
    console.error('Error fetching customer invoices:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};


/**
 * @swagger
 * /api/invoices/{id}/mark-bad:
 *   put:
 *     summary: Mark an invoice as bad
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Invoice ID
 *     responses:
 *       200:
 *         description: Invoice marked as bad successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Invoice'
 *                 message:
 *                   type: string
 *       404:
 *         description: Invoice not found
 *       500:
 *         description: Internal server error
 */
export const markInvoiceAsBad = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const invoice = await invoiceRepo.findOne({ where: { id: parseInt(id), isDelete: false } });
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    invoice.status = 'bad';
    invoice.markedBadOn = new Date();

    const updatedInvoice = await invoiceRepo.save(invoice);

    return res.json({
      success: true,
      data: updatedInvoice,
      message: 'Invoice marked as bad successfully'
    });
  } catch (error) {
    console.error('Error marking invoice as bad:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/invoices/vat-stats:
 *   get:
 *     summary: Get VAT statistics
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering (inclusive, optional)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering (inclusive, optional)
 *     responses:
 *       200:
 *         description: VAT statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalVatCollected:
 *                       type: number
 *                     totalVatPaid:
 *                       type: number
 *                     netVatOwed:
 *                       type: number
 *                     invoicesFiled:
 *                       type: integer
 *                     creditNotesApplied:
 *                       type: number
 *                 message:
 *                   type: string
 *       500:
 *         description: Internal server error
 */
export const getVatStats = async (req: Request, res: Response): Promise<any> => {
  try {
    // Get date filter from query params, fallback to current month
    let { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
    let filterStart: Date, filterEnd: Date;
    if (startDate && endDate) {
      filterStart = new Date(startDate);
      filterEnd = new Date(endDate);
      filterEnd.setHours(23, 59, 59, 999);
    } else {
      const now = new Date();
      filterStart = new Date(now.getFullYear(), now.getMonth(), 1);
      filterEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    // Common filter for date range and not deleted
    const dateFilter = {
      isDelete: false,
      createdAt: Between(filterStart, filterEnd)
    };

    // Get current logged in user (assumes req.user is set by auth middleware)
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized: User not found" });
    }

    // Get all invoices for this date range and user
    const invoices = await invoiceRepo.find({ where: { ...dateFilter, userId } });

    // Get all credit notes for this date range and user
    const creditNoteRepo = AppDataSource.getRepository(require('../entity/CreditNotes').CreditNotes);
    const creditNotes = await creditNoteRepo.find({ where: { ...dateFilter, userId } });

    // Calculate total VAT collected
    const totalVatCollected = invoices.reduce((sum, inv) => sum + (Number(inv.vat) || 0), 0);
    // Total VAT paid (no expense entity, so 0 for now)
    const totalVatPaid = 0;
    // Net VAT owed
    const netVatOwed = totalVatCollected - totalVatPaid;
    // Invoices filed
    const invoicesFiled = invoices.length;
    // Credit notes applied (sum of amount field)
    const creditNotesApplied = creditNotes.reduce((sum, cn) => sum + (Number(cn.amount) || 0), 0);

    return res.json({
      success: true,
      data: {
        totalVatCollected: parseFloat(totalVatCollected.toFixed(2)),
        totalVatPaid: parseFloat(totalVatPaid.toFixed(2)),
        netVatOwed: parseFloat(netVatOwed.toFixed(2)),
        invoicesFiled,
        creditNotesApplied: parseFloat(creditNotesApplied.toFixed(2))
      },
      message: 'VAT statistics calculated successfully'
    });
  } catch (error) {
    console.error('Error fetching VAT stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/invoices/{invoiceId}/send-reminder/{customerId}:
 *   post:
 *     summary: Send invoice payment reminder email
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: invoiceId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Reminder sent successfully
 *       404:
 *         description: Invoice or customer not found
 *       500:
 *         description: Internal server error
 */
export const sendReminderEmail = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { invoiceId, customerId } = req.params;

    const invoice = await invoiceRepo.findOne({
      where: { id: Number(invoiceId), customerId: Number(customerId), isDelete: false }
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found"
      });
    }

    const customer = await customerRepo.findOne({
      where: { id: Number(customerId), isDelete: false }
    });

    if (!customer || !customer.email) {
      return res.status(400).json({
        success: false,
        message: "Customer email not found"
      });
    }

    const currency = await currencyRepo.findOne({
      where: { id: invoice.currencyId, isDelete: false }
    });

    const customerInfo = {
      name: `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || customer.businessName,
      email: customer.email
    };

    const emailSent = await sendInvoiceReminderEmail(
      customerInfo,
      {
        invoiceNumber: invoice.invoiceNumber,
        outstandingBalance: invoice.outstandingBalance,
        dueDate: invoice.dueDate
      },
      {
        currencySymbol: currency?.currencySymbol || '£',
        currencyCode: currency?.currencyCode || 'GBP',
        exchangeRate: currency?.exchangeRate || 1
      }
    );

    if (!emailSent) {
      return res.status(500).json({
        success: false,
        message: "Failed to send reminder email"
      });
    }

    // Update invoice status to reminder
    invoice.status = "reminder";
    await invoiceRepo.save(invoice);

    return res.status(200).json({
      success: true,
      message: `Reminder sent successfully to ${customer.email}`
    });
  } catch (error) {
    console.error("Error sending reminder:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send reminder: " + (error as Error).message
    });
  }
};

/**
 * @swagger
 * /api/invoices/{id}/schedule:
 *   put:
 *     summary: Schedule an invoice for future sending
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - scheduledDate
 *             properties:
 *               scheduledDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Invoice scheduled successfully
 *       404:
 *         description: Invoice not found
 *       500:
 *         description: Internal server error
 */
export const scheduleInvoice = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    const { scheduledDate } = req.body;

    if (!scheduledDate) {
      return res.status(400).json({
        success: false,
        message: "Scheduled date is required"
      });
    }

    const invoice = await invoiceRepo.findOne({
      where: { id: Number(id), isDelete: false }
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found"
      });
    }

    const schedDate = new Date(scheduledDate);
    if (schedDate < new Date()) {
      return res.status(400).json({
        success: false,
        message: "Scheduled date must be in the future"
      });
    }

    invoice.scheduledDate = schedDate;
    invoice.isScheduled = true;
    await invoiceRepo.save(invoice);

    return res.status(200).json({
      success: true,
      data: invoice,
      message: "Invoice scheduled successfully"
    });
  } catch (error) {
    console.error("Error scheduling invoice:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to schedule invoice: " + (error as Error).message
    });
  }
};

export const deleteInvoiceItem = async(req: Request, res: Response):Promise<any> => {
  try {
    const { id, itemId } = req.params

    // Check If Invoice Already Paid
    const paidInvoice = await invoiceRepo.findOne({
      where: { id: Number(id), paymentStatus:"paid", isDelete: false }
    });
    if(paidInvoice){
      return res.status(404).json({
        success: false,
        message: "Invoice already Paid"
      });
    }
    // Find Invoice
    const invoice = await invoiceRepo.findOne({
      where: { id: Number(id), isDelete: false }
    });
    if(!invoice){
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }
    const index = Number(itemId);

      // Validate index
      if (isNaN(index) || index < 0 || index >= invoice.items.length) {
          return res.status(400).json({
                success: false,
                message: 'Invalid Invoice item index'
          });
      }

      const removedItem = invoice.items[index];
      invoice.items.splice(index, 1);

      // Recalculate in base currency
      calculateInvoiceTotals(invoice);
      await invoiceRepo.save(invoice);

      return res.status(200).json({
          success: true,
          data: {
                removedItem,
                updatedInvoice: invoice
            },
          message: 'Invoice item removed successfully'
      });
  } catch (error) {
     console.error(error);
      return res.status(500).json({
            success: false,
            message: 'Internal server error'
      });
  }
}