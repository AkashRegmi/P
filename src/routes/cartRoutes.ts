import { Router } from "express";
import {
  addItemToCart,
  clearCart,
  getCartForUser,
  removeCartItem,
  updateCartItem,
} from "../controllers/cartController";
import authMiddleware from "../middleware/authMiddleware";

const router = Router();

router.use(authMiddleware);

router.get("/", getCartForUser);
router.post("/items", addItemToCart);
router.patch("/items/:product", updateCartItem);
router.delete("/items/:product", removeCartItem);
router.delete("/", clearCart);

export default router;
