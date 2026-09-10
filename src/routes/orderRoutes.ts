import { Router } from "express";
import {
  createOrder,
  deleteOrder,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
} from "../controllers/orderController";
import authMiddleware from "../middleware/authMiddleware";
import {
  validateOrderInput,
  validateOrderStatus,
} from "../validators/orderValidator";

const router = Router();

router.use(authMiddleware);

router.get("/", getAllOrders);
router.get("/:id", getOrderById);
router.post("/", validateOrderInput, createOrder);
router.patch("/:id/status", validateOrderStatus, updateOrderStatus);
router.delete("/:id", deleteOrder);

export default router;
