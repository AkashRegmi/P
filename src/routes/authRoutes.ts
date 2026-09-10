import { Router } from "express";
import {
  loginUser,
  registerUser,
  getCurrentUser,
  refreshAccessToken,
} from "../controllers/authController";
import authMiddleware from "../middleware/authMiddleware";

const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/refresh",authMiddleware,refreshAccessToken)
router.get("/me", authMiddleware, getCurrentUser);

export default router;
