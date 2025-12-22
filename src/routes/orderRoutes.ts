import { Router } from "express";
import { authorize } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { 
  createOrder, 
  getOrderById, 
  getOrdersByCustomerId, 
  getAllOrders, 
  updateOrder, 
  deleteOrder 
} from "../controllers/orderController";

const router = Router();

// Create a new order for a customer
router.post("/create-order/:customerId", authorize(["super_admin"]), asyncHandler(createOrder));

// Get single order by ID
router.get("/:orderId", authorize(["super_admin", "user"]), asyncHandler(getOrderById));

// Get all orders for a customer
router.get("/customer/:customerId", authorize(["super_admin", "user"]), asyncHandler(getOrdersByCustomerId));

// Get all orders
router.get("/", authorize(["super_admin"]), asyncHandler(getAllOrders));

// Update order
router.put("/:orderId", authorize(["super_admin"]), asyncHandler(updateOrder));

// Delete order
router.delete("/:orderId", authorize(["super_admin"]), asyncHandler(deleteOrder));

export default router;