import { Router } from "express";
import {
  getAllProducts,
  getProductById,
  addProduct,
  editProduct,
  deleteProduct,
} from "../controllers/productController";
import { upload } from "../middleware/upload";

const router = Router();

router.get("/", getAllProducts);
router.get("/:id", getProductById);
router.post("/", upload.single("image"), addProduct);
router.put("/:id", upload.single("image"), editProduct);
router.delete("/:id", deleteProduct);

export default router;
