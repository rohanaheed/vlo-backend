import { Request, Response } from "express";
import { AppDataSource } from "../config/db";
import { Order } from "../entity/Order";
import { Customer } from "../entity/Customer";
import { Package } from "../entity/Package";
import { CustomerPackage } from "../entity/CustomerPackage";
import { Currency } from "../entity/Currency";
import { Invoice } from "../entity/Invioce";
const orderRepo = AppDataSource.getRepository(Order);
const customerRepo = AppDataSource.getRepository(Customer);
const packageRepo = AppDataSource.getRepository(Package);
const customerPackageRepo = AppDataSource.getRepository(CustomerPackage);
const currencyRepo = AppDataSource.getRepository(Currency);
const invoiceRepo = AppDataSource.getRepository(Invoice)


export const createOrder = async (req: Request, res: Response): Promise<any> => {
  try {
    const { customerId } = req.params;
    const userId = (req as any).user?.id;
    const note = "Test Note"

    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    // Prevent duplicate pending orders and draft invoices
    const existingOrder = await orderRepo.findOne({
      where: { customerId: Number(customerId), status: "pending", isDelete: false },
    });
    
    const existingInvoice = await invoiceRepo.findOne({
      where: { customerId: Number(customerId), status: "draft", isDelete: false },
    });

    if (existingOrder || existingInvoice) {
      return res.status(200).json({
        success: true,
        data: {
            order : existingOrder,
            invoice : existingInvoice
        },
        message: "Pending order or invoice already exists",
      });
    }

    // Fetch Customer
    const customer = await customerRepo.findOne({ where: { id: Number(customerId), isDelete: false } });
    if (!customer) return res.status(404).json({ success: false, message: "Customer not found" });

    // Fetch Currency
    const currency = await currencyRepo.findOne({ where: { id: customer.currencyId, isDelete: false } });
    if (!currency) return res.status(404).json({ success: false, message: "Currency not found" });

    const exchangeRate = currency.exchangeRate ?? 1;

    // Fetch Customer Package
    const customerPackage = await customerPackageRepo.findOne({ where: { customerId: Number(customerId), isDelete: false } });
    if (!customerPackage) return res.status(404).json({ success: false, message: "Customer Package not found" });

    // Fetch Package
    const pkg = await packageRepo.findOne({ where: { id: customerPackage.packageId, isDelete: false } });
    if (!pkg) return res.status(404).json({ success: false, message: "Package not found" });

    const addOns = customerPackage.addOns ?? [];

    // Calculate package price and discount
    const basePackagePrice = pkg.billingCycle === "Annual" ? Number(pkg.priceYearly ?? 0) : Number(pkg.priceMonthly ?? 0);
    const packagePrice = basePackagePrice * exchangeRate;
    const packageDiscountPercent = pkg.discount ?? 0;
    const packageDiscountAmount = (packagePrice * packageDiscountPercent) / 100;
    const packageFinalPrice = packagePrice - packageDiscountAmount;

    // Calculate add-ons
    let addOnsSubTotal = 0;
    let addOnsFinalTotal = 0;
    for (const addOn of addOns) {
      const basePrice = pkg.billingCycle === "Annual" ? Number(addOn.yearlyPrice ?? 0) : Number(addOn.monthlyPrice ?? 0);
      const price = basePrice * exchangeRate;
      addOnsSubTotal += price;
      const discount = addOn.discount ?? 0;
      addOnsFinalTotal += price - (price * discount) / 100;
    }

    const subTotal = packagePrice + addOnsSubTotal;
    const total = packageFinalPrice + addOnsFinalTotal;
    const totalDiscount = subTotal - total;

    // Generate order number
    const orderNumber = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Create Order
    const newOrder = orderRepo.create({
      customerId: Number(customerId),
      orderNumber,
      originalOrderNumber: `ORD-${orderNumber}`,
      customOrderNumber: `CUST-ORD-${orderNumber}`,
      orderDate: new Date().toISOString(),
      subTotal: Number(subTotal.toFixed(2)),
      discount: Number(totalDiscount.toFixed(2)),
      discountType: packageDiscountPercent,
      total: Number(total.toFixed(2)),
      status: "pending",
      note,
      addedBy: userId,
      currencyId: customer.currencyId,
    });
    await orderRepo.save(newOrder);

    // Create Invoice (link to order via orderId)
    const invoiceNumber = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const dueDate = new Date();

    if (pkg.billingCycle === "Annual") {
      dueDate.setFullYear(dueDate.getFullYear() + 1);
    } else {
      dueDate.setMonth(dueDate.getMonth() + 1);
    }

    const newInvoice = invoiceRepo.create({
      invoiceNumber,
      amount: Number(total.toFixed(2)),
      status: "draft",
      paymentStatus: "unpaid",
      plan: pkg.billingCycle,
      customerId: Number(customerId),
      userId,
      currencyId: customer.currencyId,
      orderId: newOrder.id,
      subTotal: Number(subTotal.toFixed(2)),
      outstandingBalance: Number(total.toFixed(2)),
      discount: Number(totalDiscount.toFixed(2)),
      discountType: `${packageDiscountPercent}%`,
      dueDate: dueDate,
      vat: 0,
    });
    await invoiceRepo.save(newInvoice);

    return res.status(201).json({
      success: true,
      data: { order: newOrder, invoice: newInvoice },
      message: "Order and invoice created successfully",
    });

  } catch (error: any) {
    console.error("Error creating order:", error.message);
    return res.status(500).json({ success: false, message: error.message || "Internal server error" });
  }
};

export const getOrderById = async (req: Request, res: Response): Promise<any> => {
    try {
        const { orderId } = req.params;

        // Get Order
        const order = await orderRepo.findOne({
            where: { id: Number(orderId), isDelete: false }
        });
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }
        return res.status(200).json({
            success: true,
            data: order,
            message: "Order fetched successfully",
        });

    } catch (error) {
        console.error("Error fetching order:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
}

export const getOrdersByCustomerId = async (req: Request, res: Response): Promise<any> => {
    try {
        const { customerId } = req.params;

        // Get Orders
        const orders = await orderRepo.find({
            where: { customerId: Number(customerId), isDelete: false }
        });
        if (!orders || orders.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Orders not found"
            });
        }
        return res.status(200).json({
            success: true,
            data: orders,
            message: "Orders fetched successfully",
        });

    } catch (error) {
        console.error("Error fetching orders:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
}

export const getAllOrders = async (req: Request, res: Response): Promise<any> => {
    try {
        // Get Orders
        const orders = await orderRepo.find({
            where: { isDelete: false }
        });
        if (!orders || orders.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Orders not found"
            });
        }
        return res.status(200).json({
            success: true,
            data: orders,
            message: "Orders fetched successfully",
        });

    } catch (error) {
        console.error("Error fetching orders:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
}

export const updateOrder = async (req: Request, res: Response): Promise<any> => {
    try {
        const { orderId } = req.params;
        const { status } = req.body;
        const userId = (req as any).user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        // Get Order
        const order = await orderRepo.findOne({
            where: { id: Number(orderId), isDelete: false }
        });
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        // Update Order
        order.status = status || order.status;
        order.addedBy = userId || 0;
        order.updatedAt = new Date();
        await orderRepo.save(order);
        return res.status(200).json({
            success: true,
            data: order,
            message: "Order updated successfully",
        });

    } catch (error) {
        console.error("Error updating order:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
}

export const deleteOrder = async (req: Request, res: Response): Promise<any> => {
    try {
        const { orderId } = req.params;

        // Get Order
        const order = await orderRepo.findOne({
            where: { id: Number(orderId), isDelete: false }
        });
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        // Delete Order
        order.isDelete = true;
        await orderRepo.save(order);
        return res.status(200).json({
            success: true,
            message: "Order deleted successfully",
        });

    } catch (error) {
        console.error("Error deleting order:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
}