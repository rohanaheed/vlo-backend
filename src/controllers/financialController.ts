import { Request, Response } from "express";
import { AppDataSource } from "../config/db";
import { FinancialStatement } from "../entity/FinancialStatement";
import { Customer } from "../entity/Customer";
import { Currency } from "../entity/Currency";
import { financialStatementSchema, updateFinancialStatementSchema } from "../utils/validators/inputValidator";
import { generateFinancialStatementPDF } from "../utils/pdfUtils";

const financialRepo = AppDataSource.getRepository(FinancialStatement);
const customerRepo = AppDataSource.getRepository(Customer);
const currencyRepo = AppDataSource.getRepository(Currency);

// Convert To Customer Currency
const convertFinancialStatementToCustomerCurrency = async (statement: any, customerCurrencyId: number): Promise<any> => {
  const currency = await currencyRepo.findOne({ where: { id: customerCurrencyId, isDelete: false } });
  const exchangeRate = Number(currency?.exchangeRate || 1);

  const convertedStatement = { ...statement };

  // Convert disbursements
  if (statement.disbursements && Array.isArray(statement.disbursements)) {
    convertedStatement.disbursements = statement.disbursements.map((item: any) => ({
      ...item,
      charges: Number(((item.charges || 0) * exchangeRate).toFixed(2)),
      vatAmount: Number(((item.vatAmount || 0) * exchangeRate).toFixed(2)),
      total: Number(((item.total || 0) * exchangeRate).toFixed(2))
    }));
  }

  // Convert our costs
  if (statement.ourCost && Array.isArray(statement.ourCost)) {
    convertedStatement.ourCost = statement.ourCost.map((item: any) => ({
      ...item,
      charges: Number(((item.charges || 0) * exchangeRate).toFixed(2)),
      vatAmount: Number(((item.vatAmount || 0) * exchangeRate).toFixed(2)),
      total: Number(((item.total || 0) * exchangeRate).toFixed(2))
    }));
  }

  // Convert summary
  if (statement.summary && Array.isArray(statement.summary)) {
    convertedStatement.summary = statement.summary.map((item: any) => ({
      ...item,
      subTotal: Number(((item.subTotal || 0) * exchangeRate).toFixed(2)),
      total: Number(((item.total || 0) * exchangeRate).toFixed(2))
    }));
  }

  // Convert totals
  convertedStatement.totalDisbursements = Number((statement.totalDisbursements * exchangeRate).toFixed(2));
  convertedStatement.totalOurCosts = Number((statement.totalOurCosts * exchangeRate).toFixed(2));
  convertedStatement.totalAmountRequired = Number((statement.totalAmountRequired * exchangeRate).toFixed(2));

  return convertedStatement;
};

// Calculate Totals in Base Currency
const calculateFinancialTotals = (financialStatement: FinancialStatement):void => {

    if (financialStatement.disbursements && financialStatement.disbursements.length > 0) {
        financialStatement.disbursements = financialStatement.disbursements.map(item => {
            const chargesInBaseCurrency = Number(item.charges) || 0;
            const vatAmountInBaseCurrency = Number(item.vatAmount) || 0;
            const totalInBaseCurrency = chargesInBaseCurrency + vatAmountInBaseCurrency;

            return {
                ...item,
                charges: chargesInBaseCurrency,
                vatAmount: vatAmountInBaseCurrency,
                total: totalInBaseCurrency
            };
        });

        financialStatement.totalDisbursements = financialStatement.disbursements.reduce(
            (sum, item) => sum + (item.total || 0),
            0
        );
    } else {
        financialStatement.totalDisbursements = 0;
    }

    if (financialStatement.ourCost && financialStatement.ourCost.length > 0) {
        financialStatement.ourCost = financialStatement.ourCost.map(item => {
            const chargesInBaseCurrency = Number(item.charges) || 0;
            const vatAmountInBaseCurrency = Number(item.vatAmount) || 0;
            const totalInBaseCurrency = chargesInBaseCurrency + vatAmountInBaseCurrency;

            return {
                ...item,
                charges: chargesInBaseCurrency,
                vatAmount: vatAmountInBaseCurrency,
                total: totalInBaseCurrency
            };
        });

        financialStatement.totalOurCosts = financialStatement.ourCost.reduce(
            (sum, item) => sum + (item.total || 0),
            0
        );
    } else {
        financialStatement.totalOurCosts = 0;
    }

    let totalSummary = 0;
    if (financialStatement.summary && financialStatement.summary.length > 0) {
        financialStatement.summary = financialStatement.summary.map(item => {
            const subTotalInBaseCurrency = Number(item.subTotal) || 0;
            totalSummary += subTotalInBaseCurrency;

            return {
                ...item,
                subTotal: subTotalInBaseCurrency,
                total: subTotalInBaseCurrency
            };
        });
    }
    financialStatement.totalAmountRequired =
        financialStatement.totalDisbursements + financialStatement.totalOurCosts + totalSummary;
}

export const createFinancialStatement = async (req: Request, res: Response): Promise<any> => {
    try {
        const userId = (req as any).user.id;
        const { error, value } = financialStatementSchema.validate(req.body);
        
            if (error) {
              return res.status(400).json({
                success: false,
                message: error.details[0].message
              });
            }

        const customer = await customerRepo.findOne({ where: { email: value.customerEmail, isDelete: false } });
        if (!customer) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }

        const currency = await currencyRepo.findOne({ where: { id: customer.currencyId } });
        if (!currency) {
            return res.status(404).json({ success: false, message: 'Currency not found' });
        }

        const financialStatement = new FinancialStatement();
        financialStatement.matterId = value.matterId;
        financialStatement.customerId = customer.id;
        financialStatement.currencyId = currency.id;
        financialStatement.userId = userId;
        financialStatement.caseDescription = value.caseDescription || "";
        financialStatement.customerEmail = value.customerEmail;
        financialStatement.customerName = value.customerName;
        financialStatement.disbursements = value.disbursements || [];
        financialStatement.ourCost = value.ourCost || [];
        financialStatement.summary = value.summary || [];
        financialStatement.status = value.status || "draft";
        financialStatement.completionDate = value.completionDate;
        financialStatement.isDelete = false;

        // Calculations in base currency
        calculateFinancialTotals(financialStatement);

        await financialRepo.save(financialStatement);

        return res.status(201).json({
            success: true,
            data: financialStatement,
            message: 'Financial statement created successfully'
        })
    } catch (error) {
        console.error(error);
        return res.status(500).json({ 
            success: false, message: 'Internal server error' 
        });
    }
}

export const getFinancialStatement = async (req: Request, res: Response): Promise<any> => {
    try {
        const { id } = req.params;
        const financialStatement = await financialRepo.findOne({ where: { id: Number(id), isDelete: false } });
        if (!financialStatement) {
            return res.status(404).json({ success: false, message: 'Financial statement not found' });
        }

        // // Convert from base currency to customer currency
        // const convertedStatement = await convertFinancialStatementToCustomerCurrency(financialStatement, financialStatement.currencyId);

        return res.status(200).json({
            success: true,
            data: financialStatement,
            message: 'Financial statement retrieved successfully'
        })
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false, message: 'Internal server error'
        });
    }
}

export const getByCustomerId = async (req: Request, res: Response): Promise<any> => {
    try {
        const { customerId } = req.params;

        // Customer
        const customer = await customerRepo.findOne({ where: { id: Number(customerId), isDelete: false } });
        if(!customer){
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            })
        }
        // Financial Statement
        const financialStatements = await financialRepo.find({ where: { customerId: Number(customerId), isDelete: false } });
        if (!financialStatements) {
            return res.status(404).json({
                success: false,
                message: 'Financial statement not found'
            });
        }

        // Convert to Customer Currency
        const convertedStatements = await Promise.all(
            financialStatements.map(statement => convertFinancialStatementToCustomerCurrency(statement, statement.currencyId))
        );

        return res.status(200).json({
            success: true,
            data: convertedStatements,
            message: 'Financial statement retrieved successfully'
        })
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false, message: 'Internal server error'
        });
    }
}

export const getAllStatements = async (req: Request, res: Response): Promise<any> => {
    try {
        const financialStatements = await financialRepo.find({ where: { isDelete: false } });
        if (!financialStatements) {
            return res.status(404).json({
                success: false,
                message: 'Financial statement not found'
            });
        }

        // // Convert all statements from base currency to customer currency
        // const convertedStatements = await Promise.all(
        //     financialStatements.map(statement => convertFinancialStatementToCustomerCurrency(statement, statement.currencyId))
        // );

        return res.status(200).json({
            success: true,
            data: financialStatements,
            message: 'Financial statement retrieved successfully'
        })
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false, message: 'Internal server error'
        });
    }
}

export const updateFinancialStatement = async (req: Request, res: Response): Promise<any> => {
    try {
        const { id } = req.params;
        const { error, value } = updateFinancialStatementSchema.validate(req.body);

        if (error) {
            return res.status(400).json({
                success: false,
                message: error.details[0].message
            });
        }

        const financialStatement = await financialRepo.findOne({ where: { id: Number(id), isDelete: false } });
        if (!financialStatement) {
            return res.status(404).json({ 
                success: false, 
                message: 'Financial statement not found' 
            });
        }

        const customer = await customerRepo.findOne({ where: { email: value.customerEmail, isDelete: false } });
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

        financialStatement.matterId = value.matterId;
        financialStatement.customerId = customer.id;
        financialStatement.currencyId = currency.id;
        financialStatement.caseDescription = value.caseDescription || "";
        financialStatement.customerEmail = value.customerEmail;
        financialStatement.customerName = value.customerName;
        financialStatement.disbursements = value.disbursements || [];
        financialStatement.ourCost = value.ourCost || [];
        financialStatement.summary = value.summary || [];
        financialStatement.status = value.status || "draft";
        financialStatement.completionDate = value.completionDate;
        financialStatement.isDelete = false;

        // Calculations in base currency
        calculateFinancialTotals(financialStatement);

        await financialRepo.save(financialStatement);

        return res.status(200).json({
            success: true,
            data: financialStatement,
            message: 'Financial statement updated successfully'
        })
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false, message: 'Internal server error'
        });
    }
}

export const deleteFinancialStatement = async (req: Request, res: Response): Promise<any> => {
    try {
        const { id } = req.params;
        const financialStatement = await financialRepo.findOne({ where: { id: Number(id), isDelete: false } });
        if (!financialStatement) {
            return res.status(404).json({
                success: false,
                message: 'Financial statement not found'
             });
        }
        financialStatement.isDelete = true;
        await financialRepo.save(financialStatement);
        return res.status(200).json({
            success: true,
            message: 'Financial statement deleted successfully'
        })
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false, message: 'Internal server error'
        });
    }
}


export const deleteDisbursementItem = async (req: Request, res: Response): Promise<any> => {
    try {
        const { id, disbursementId } = req.params;

        const financialStatement = await financialRepo.findOne({
            where: { id: Number(id), isDelete: false }
        });

        if (!financialStatement) {
            return res.status(404).json({
                success: false,
                message: 'Financial statement not found'
            });
        }

        const index = Number(disbursementId);

        // Validate index
        if (isNaN(index) || index < 0 || index >= financialStatement.disbursements.length) {
            return res.status(400).json({
                success: false,
                message: 'Invalid disbursement item index'
            });
        }

        const removedItem = financialStatement.disbursements[index];
        financialStatement.disbursements.splice(index, 1);

        // Recalculate in base currency
        calculateFinancialTotals(financialStatement);

        await financialRepo.save(financialStatement);

        return res.status(200).json({
            success: true,
            data: {
                removedItem,
                updatedStatement: financialStatement
            },
            message: 'Disbursement item deleted successfully'
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
}

export const deleteOurCostItem = async (req: Request, res: Response): Promise<any> => {
    try {
        const { id, ourCostId } = req.params;

        const financialStatement = await financialRepo.findOne({
            where: { id: Number(id), isDelete: false }
        });

        if (!financialStatement) {
            return res.status(404).json({
                success: false,
                message: 'Financial statement not found'
            });
        }

        const index = Number(ourCostId);

        // Validate index
        if (isNaN(index) || index < 0 || index >= financialStatement.ourCost.length) {
            return res.status(400).json({
                success: false,
                message: 'Invalid our cost item index'
            });
        }

        const removedItem = financialStatement.ourCost[index];
        financialStatement.ourCost.splice(index, 1);

        // Recalculate in base currency
        calculateFinancialTotals(financialStatement);

        await financialRepo.save(financialStatement);

        return res.status(200).json({
            success: true,
            data: {
                removedItem,
                updatedStatement: financialStatement
            },
            message: 'Our cost item deleted successfully'
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
}

// Generate and download financial statement PDF
export const downloadFinancialStatementPDF = async (req: Request, res: Response): Promise<any> => {
    try {
        const { id } = req.params;

        const financialStatement = await financialRepo.findOne({
            where: { id: Number(id), isDelete: false }
        });
        if (!financialStatement) {
            return res.status(404).json({
                success: false,
                message: 'Financial statement not found'
            });
        }

        // Customer
        const customer = await customerRepo.findOne({
            where: { id: financialStatement.customerId, isDelete: false }
        });

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        // Currency
        const currency = await currencyRepo.findOne({
            where: { id: financialStatement.currencyId, isDelete: false }
        });
         if(!currency){
            return res.status(404).json({
                success: false,
                message: 'Currency not found'
            });
        }


        const customerInfo = {
            name: financialStatement.customerName,
            email: financialStatement.customerEmail
        };

        // Generate PDF
        const pdfBytes = await generateFinancialStatementPDF({
            financialStatement,
            customer: customerInfo,
            currency
        });

        // Set response headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="financial-statement-${financialStatement.id}.pdf"`
        );
        res.setHeader('Content-Length', pdfBytes.length);

        // Send PDF buffer
        return res.send(Buffer.from(pdfBytes));
    } catch (error) {
        console.error('Error generating financial statement PDF:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to generate PDF: ' + (error as Error).message
        });
    }
}
