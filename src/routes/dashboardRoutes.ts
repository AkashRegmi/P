import { Router } from "express";
import { getDashboardOverview } from "../controllers/dashboardController";
import authMiddleware from "../middleware/authMiddleware";

const router = Router();

router.use(authMiddleware);
router.get("/overview", getDashboardOverview);

export default router;
