import { Request, Response } from "express";
import { ProductModel } from "../models/Product";
import {
  uploadBufferToCloudinary,
  deleteFromCloudinary,
} from "../config/cloudinaryUpload";

// GET /api/products
export const getAllProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const products = await ProductModel.find().sort({ createdAt: -1 });
    res.status(200).json({ products, total: products.length });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch products", error: (err as Error).message });
  }
};

// GET /api/products/:id
export const getProductById = async (req: Request, res: Response): Promise<void> => {
  try {
    const product = await ProductModel.findById(req.params.id);

    if (!product) {
      res.status(404).json({ message: `Product with id ${req.params.id} not found` });
      return;
    }

    res.status(200).json(product);
  } catch (err) {
    res.status(400).json({ message: "Invalid product id", error: (err as Error).message });
  }
};

// POST /api/products  (multipart/form-data, field name: "image")
export const addProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, price } = req.body;

    if (!name || !description || price === undefined) {
      res.status(400).json({ message: "name, description and price are required" });
      return;
    }

    // tags/reviews may arrive as JSON strings when sent via multipart/form-data
    const tags = req.body.tags ? JSON.parse(req.body.tags) : [];
    const reviews = req.body.reviews ? JSON.parse(req.body.reviews) : [];

    let image;
    
    if (req.file) {
      const result = await uploadBufferToCloudinary(req.file.buffer);
      image = { url: result.secure_url, publicId: result.public_id };
    }

    const product = await ProductModel.create({
      name,
      description,
      price,
      tags,
      reviews,
      image,
    });

    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: "Failed to create product", error: (err as Error).message });
  }
};

// PUT /api/products/:id  (multipart/form-data, field name: "image" — optional)
export const editProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const product = await ProductModel.findById(req.params.id);

    if (!product) {
      res.status(404).json({ message: `Product with id ${req.params.id} not found` });
      return;
    }

    const { name, description, price } = req.body;
    if (name !== undefined) product.name = name;
    if (description !== undefined) product.description = description;
    if (price !== undefined) product.price = price;
    if (req.body.tags !== undefined) product.tags = JSON.parse(req.body.tags);
    if (req.body.reviews !== undefined) product.reviews = JSON.parse(req.body.reviews);

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
    res.status(500).json({ message: "Failed to update product", error: (err as Error).message });
  }
};

// DELETE /api/products/:id
export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const product = await ProductModel.findById(req.params.id);

    if (!product) {
      res.status(404).json({ message: `Product with id ${req.params.id} not found` });
      return;
    }

    if (product.image?.publicId) {
      await deleteFromCloudinary(product.image.publicId);
    }

    await product.deleteOne();
    res.status(200).json({ message: "Product deleted", product });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete product", error: (err as Error).message });
  }
};
