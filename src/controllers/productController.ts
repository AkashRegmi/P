import { Request, Response } from "express";
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
