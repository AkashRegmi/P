import { Router } from "express";
import {
  loginUser,
  registerUser,
  getCurrentUser,
} from "../controllers/authController";
import authMiddleware from "../middleware/authMiddleware";

const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/me", authMiddleware, getCurrentUser);

export default router;
