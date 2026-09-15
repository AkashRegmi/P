import { Router } from "express";
import {
  getAllProducts,
  exportProducts,
  getProductById,
  addProduct,
  editProduct,
  deleteProduct,
  getAllProductsWithoutPagination,
} from "../controllers/productController";
import { upload } from "../middleware/upload";
import authMiddleware from "../middleware/authMiddleware";

const router = Router();

router.use(authMiddleware);

router.get("/", getAllProducts);
router.get("/all", getAllProductsWithoutPagination);
router.get("/export", exportProducts);
router.get("/:id", getProductById);
router.post("/", upload.single("image"), addProduct);
router.put("/:id", upload.single("image"), editProduct);
router.delete("/:id", deleteProduct);

export default router;
