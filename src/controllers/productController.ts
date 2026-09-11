import { Request, Response } from "express";
import ExcelJS from "exceljs";
import { ProductModel } from "../models/Product";
import {
  uploadBufferToCloudinary,
  deleteFromCloudinary,
} from "../config/cloudinaryUpload";

const parseTags = (value: unknown): string[] => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item)).filter(Boolean);
      }
      return [value].filter(Boolean);
    } catch {
      return [value].filter(Boolean);
    }
  }

  return [];
};

const parseExportDate = (value: unknown, endDate = false): Date | null => {
  if (typeof value !== "string" || !value.trim()) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  if (endDate && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    date.setUTCDate(date.getUTCDate() + 1);
  }

  return date;
};

// GET /api/products
export const getAllProducts = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const search = String(req.query.search || "");
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const searchQuery = search
      ? {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { category: { $regex: search, $options: "i" } },
            { brand: { $regex: search, $options: "i" } },
          ],
        }
      : {};
    const products = await ProductModel.find(searchQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const total = await ProductModel.countDocuments(searchQuery);
    const totalPages = Math.ceil(total / limit) || 1;
    res.status(200).json({
      products,
      total,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to fetch products",
      error: (err as Error).message,
    });
  }
};

// GET /api/products/export?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&brandName=Brand
export const exportProducts = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

  const startDate =
    req.query.startDate === undefined
      ? today
      : parseExportDate(req.query.startDate);
  const endDate =
    req.query.endDate === undefined
      ? tomorrow
      : parseExportDate(req.query.endDate, true);
  const brandName =
    typeof req.query.brandName === "string" ? req.query.brandName.trim() : "";

  if (!startDate || !endDate) {
    res.status(400).json({
      message: "startDate and endDate must use the YYYY-MM-DD format",
    });
    return;
  }

  if (startDate >= endDate) {
    res.status(400).json({ message: "startDate must be before endDate" });
    return;
  }

  try {
    const productQuery = {
      createdAt: { $gte: startDate, $lt: endDate },
      ...(brandName
        ? {
            brand: {
              $regex: `^${brandName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
              $options: "i",
            },
          }
        : {}),
    };

    const products = await ProductModel.find(productQuery).sort({
      createdAt: -1,
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Products");

    worksheet.columns = [
      { header: "Name", key: "name", width: 24 },
      { header: "Description", key: "description", width: 36 },
      { header: "Price", key: "price", width: 12 },
      { header: "Category", key: "category", width: 18 },
      { header: "Brand", key: "brand", width: 18 },
      { header: "Stock", key: "stock", width: 10 },
      { header: "Tags", key: "tags", width: 28 },
      { header: "Featured", key: "isFeatured", width: 12 },
      { header: "Created At", key: "createdAt", width: 24 },
      { header: "Updated At", key: "updatedAt", width: 24 },
    ];

    for (const product of products) {
      worksheet.addRow({
        name: product.name,
        description: product.description,
        price: product.price,
        category: product.category,
        brand: product.brand,
        stock: product.stock,
        tags: product.tags.join(", "),
        isFeatured: product.isFeatured ? "Yes" : "No",
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      });
    }

    worksheet.getRow(1).font = { bold: true };
    worksheet.getColumn("price").numFmt = "0.00";
    worksheet.getColumn("createdAt").numFmt = "yyyy-mm-dd hh:mm:ss";
    worksheet.getColumn("updatedAt").numFmt = "yyyy-mm-dd hh:mm:ss";

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="products-${req.query.startDate}-to-${req.query.endDate}.xlsx"`,
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({
      message: "Failed to export products",
      error: (err as Error).message,
    });
  }
};

// GET /api/products/:id
export const getProductById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const product = await ProductModel.findById(req.params.id);

    if (!product) {
      res
        .status(404)
        .json({ message: `Product with id ${req.params.id} not found` });
      return;
    }

    res.status(200).json(product);
  } catch (err) {
    res
      .status(400)
      .json({ message: "Invalid product id", error: (err as Error).message });
  }
};

// POST /api/products  (multipart/form-data, field name: "image")
export const addProduct = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { name, description, price, category, brand, stock, isFeatured } =
      req.body;

    if (!name || !description || price === undefined || !category || !brand) {
      res.status(400).json({
        message: "name, description, price, category and brand are required",
      });
      return;
    }

    if (stock === undefined || Number(stock) < 0) {
      res.status(400).json({
        message: "stock is required and must be 0 or more",
      });
      return;
    }

    const tags = parseTags(req.body.tags);

    if (!req.file) {
      res.status(400).json({
        message: "Product image is required",
      });
      return;
    }

    const result = await uploadBufferToCloudinary(req.file.buffer);

    const image = {
      url: result.secure_url,
      publicId: result.public_id,
    };

    const product = await ProductModel.create({
      name,
      description,
      price: Number(price),
      category,
      brand,
      stock: Number(stock),
      tags,
      isFeatured: Boolean(isFeatured),
      image,
    });

    res.status(201).json({
      message: "Product Added Successfully",
      data: product,
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to create product",
      error: (err as Error).message,
    });
  }
};

// PUT /api/products/:id  (multipart/form-data, field name: "image" — optional)
export const editProduct = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const product = await ProductModel.findById(req.params.id);

    if (!product) {
      res
        .status(404)
        .json({ message: `Product with id ${req.params.id} not found` });
      return;
    }

    const { name, description, price, category, brand, stock, isFeatured } =
      req.body;
    if (name !== undefined) product.name = name;
    if (description !== undefined) product.description = description;
    if (price !== undefined) product.price = Number(price);
    if (category !== undefined) product.category = category;
    if (brand !== undefined) product.brand = brand;
    if (stock !== undefined) product.stock = Number(stock);
    if (isFeatured !== undefined) product.isFeatured = Boolean(isFeatured);
    if (req.body.tags !== undefined) product.tags = parseTags(req.body.tags);

    // If a new image was uploaded, replace the old one on Cloudinary
    if (req.file) {
      if (product.image?.publicId) {
        await deleteFromCloudinary(product.image.publicId);
      }
      const result = await uploadBufferToCloudinary(req.file.buffer);
      product.image = { url: result.secure_url, publicId: result.public_id };
    }

    await product.save();
    res.status(200).json(product);
  } catch (err) {
    res.status(500).json({
      message: "Failed to update product",
      error: (err as Error).message,
    });
  }
};

// DELETE /api/products/:id
export const deleteProduct = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const product = await ProductModel.findById(req.params.id);

    if (!product) {
      res
        .status(404)
        .json({ message: `Product with id ${req.params.id} not found` });
      return;
    }

    if (product.image?.publicId) {
      await deleteFromCloudinary(product.image.publicId);
    }

    await product.deleteOne();
    res.status(200).json({ message: "Product deleted", product });
  } catch (err) {
    res.status(500).json({
      message: "Failed to delete product",
      error: (err as Error).message,
    });
  }
};
