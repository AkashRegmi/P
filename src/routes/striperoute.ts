import { Router } from "express";
import { StripeController } from "../controllers/stripeController";
import authMiddleware from "../middleware/authMiddleware";
const router = Router();
router.use(authMiddleware);
router.post("/", StripeController);

export default router;
