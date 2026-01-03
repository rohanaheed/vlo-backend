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
const invoiceRepo = AppDataSource.getRepository(Invoice);

// Convert Order to Customer Currency
const convertOrderToCustomerCurrency = async (order: any, customerCurrencyId: number): Promise<any> => {
  const currency = await currencyRepo.findOne({ where: { id: customerCurrencyId, isDelete: false } });
  const exchangeRate = Number(currency?.exchangeRate || 1);

  return {
    ...order,
    subTotal: Number((order.subTotal * exchangeRate).toFixed(2)),
    discount: Number((order.discount * exchangeRate).toFixed(2)),
    total: Number((order.total * exchangeRate).toFixed(2))
  };
};


export const createOrder = async (req: Request, res: Response): Promise<any> => {
  try {
    const { customerId } = req.params;
    const userId = (req as any).user?.id;
    const note = "Test Note"

    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    // Check Pending Order Already Exists
    const existingOrder = await orderRepo.findOne({
      where: { customerId: Number(customerId), status: "pending", isDelete: false },
    });
    // Check Draft Invoice Already Exist
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

    // Fetch Customer Package
    const customerPackage = await customerPackageRepo.findOne({ where: { customerId: Number(customerId), isDelete: false } });
    if (!customerPackage) return res.status(404).json({ success: false, message: "Customer Package not found" });

    // Fetch Package
    const pkg = await packageRepo.findOne({ where: { id: customerPackage.packageId, isDelete: false } });
    if (!pkg) return res.status(404).json({ success: false, message: "Package not found" });

    const addOns = customerPackage.addOns ?? [];

    const invoiceItems = [];

    // Calculate package in base currency
    const packagePrice = pkg.billingCycle === "Annual" ? Number(pkg.priceYearly ?? 0) : Number(pkg.priceMonthly ?? 0);
    const packageDiscountPercent = pkg.discount ?? 0;
    const packageDiscountAmount = (packagePrice * packageDiscountPercent) / 100;
    const packageSubTotal = packagePrice;

    // Add package to invoice items
    invoiceItems.push({
      description: `${pkg.name} - ${pkg.billingCycle}`,
      quantity: 1,
      amount: Number(packagePrice.toFixed(2)),
      subTotal: Number(packageSubTotal.toFixed(2)),
      discount: Number(packageDiscountAmount.toFixed(2)),
      discountType: `${packageDiscountPercent}%`,
      vatRate: "",
      vatType: ""
    });

    // Calculate add-ons in Base currency
    let addOnsSubTotal = 0;
    let addOnsDiscount = 0;
    let totalDiscountPercent = packageDiscountPercent;

    for (const addOn of addOns) {
      const addOnPrice = pkg.billingCycle === "Annual" ? Number(addOn.yearlyPrice ?? 0) : Number(addOn.monthlyPrice ?? 0);
      const addOnDiscountPercent = addOn.discount ?? 0;
      const addOnDiscountAmount = (addOnPrice * addOnDiscountPercent) / 100;
      const addOnItemSubTotal = addOnPrice;

      invoiceItems.push({
        description: `Add-on: ${addOn.feature}`,
        quantity: 1,
        amount: Number(addOnPrice.toFixed(2)),
        subTotal: Number(addOnItemSubTotal.toFixed(2)),
        discount: Number(addOnDiscountAmount.toFixed(2)),
        discountType: `${addOnDiscountPercent}%`,
        vatRate: "",
        vatType: ""
      });

      addOnsSubTotal += addOnItemSubTotal;
      addOnsDiscount += addOnDiscountAmount;
      totalDiscountPercent += addOnDiscountPercent;
    }

    // Calculate totals
    const subTotal = packageSubTotal + addOnsSubTotal;
    const discount = packageDiscountAmount + addOnsDiscount;
    const total = subTotal - discount;
    const invoiceDiscountType = `${totalDiscountPercent}%`;
    
    // Generate order number
    const orderNumber = `${Math.floor(Math.random() * 90000) + 10000}`;

    // Create Order
    const newOrder = orderRepo.create({
      customerId: Number(customerId),
      orderNumber,
      originalOrderNumber: `ORD-${orderNumber}`,
      customOrderNumber: `CUST-ORD-${orderNumber}`,
      orderDate: new Date().toISOString(),
      subTotal: Number(subTotal.toFixed(2)),
      discount: Number(discount.toFixed(2)),
      discountType: totalDiscountPercent,
      total: Number(total.toFixed(2)),
      status: "pending",
      note,
      addedBy: userId,
      currencyId: customer.currencyId,
    });
    await orderRepo.save(newOrder);

    // Create Invoice
    const invoiceNumber = `INV-${Math.floor(Math.random() * 90000) + 10000}`;
    const dueDate = new Date();

    if (pkg.billingCycle === "Annual") {
      dueDate.setFullYear(dueDate.getFullYear() + 1);
    } else {
        dueDate.setMonth(dueDate.getMonth() + 1);
    }
    
    // Prepare client address string
    const addressParts = [
      customer.businessAddress?.buildingNumber || '',
      customer.businessAddress?.buildingName || '',
      customer.businessAddress?.street || '',
      customer.businessAddress?.city || '',
      customer.businessAddress?.county || '',
      customer.businessAddress?.country || ''
    ].filter(part => part.trim() !== '');
    const clientAddress = addressParts.join(', ');

    const newInvoice = invoiceRepo.create({
      invoiceNumber,
      total: Number(total.toFixed(2)),
      amount: Number(total.toFixed(2)),
      status: "draft",
      paymentStatus: "pending",
      plan: pkg.billingCycle,
      customerId: Number(customerId),
      customerName: `${customer.firstName || ''} ${customer.lastName || ''}`.trim(),
      customerEmail: customer.email,
      clientAddress: clientAddress,
      userId,
      currencyId: customer.currencyId,
      orderId: newOrder.id,
      subTotal: Number(subTotal.toFixed(2)),
      discountValue: Number(discount.toFixed(2)),
      discountType: invoiceDiscountType,
      outstandingBalance: Number(total.toFixed(2)),
      dueDate: dueDate,
      IssueDate: new Date(),
      vat: 0,
      items: invoiceItems,
    });
    if(discount >=0){
        newInvoice.isDiscount = true
    }
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

        // // Convert from base currency to customer currency
        // const convertedOrder = await convertOrderToCustomerCurrency(order, order.currencyId);

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

        // Convert all Orders to Customer Currency
        const convertedOrders = await Promise.all(
            orders.map(order => convertOrderToCustomerCurrency(order, order.currencyId))
        );

        return res.status(200).json({
            success: true,
            data: convertedOrders,
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

        // // Convert all orders from base currency to customer currency
        // const convertedOrders = await Promise.all(
        //     orders.map(order => convertOrderToCustomerCurrency(order, order.currencyId))
        // );

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