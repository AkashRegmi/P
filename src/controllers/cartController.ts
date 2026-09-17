import { Response } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../middleware/authMiddleware";
import { CartModel } from "../models/Cart";
import { ProductModel } from "../models/Product";

const getUserId = (req: AuthRequest, res: Response): string | null => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return null;
  }

  return userId;
};

const getCart = async (userId: string) =>
  CartModel.findOne({ user: userId }).populate("items.product");

export const getCartForUser = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const userId = getUserId(req, res);
  if (!userId) return;

  try {
    const cart = await getCart(userId);
    res.status(200).json({
      success: true,
      cart: cart || { user: userId, items: [] },
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to fetch cart",
      error: (err as Error).message,
    });
  }
};

export const addItemToCart = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const userId = getUserId(req, res);
  if (!userId) return;

  try {
    const { product: productId, quantity } = req.body;
    const requestedQuantity = Number(quantity);

    if (
      !mongoose.isValidObjectId(productId) ||
      !Number.isInteger(requestedQuantity) ||
      requestedQuantity < 1
    ) {
      res.status(400).json({
        message:
          "product must be a valid id and quantity must be a positive integer",
      });
      return;
    }

    const product = await ProductModel.findById(productId);
    if (!product) {
      res.status(404).json({ message: "Product not found" });
      return;
    }

    const cart = await CartModel.findOneAndUpdate(
      { user: userId },
      { $setOnInsert: { user: userId, items: [] } },
      { new: true, upsert: true },
    );
    const item = cart.items.find(
      (cartItem) => cartItem.product.toString() === productId,
    );
    const nextQuantity = (item?.quantity || 0) + requestedQuantity;

    if (nextQuantity > product.stock) {
      res.status(400).json({
        message: `Only ${product.stock} item(s) are available in stock`,
      });
      return;
    }

    if (item) {
      item.quantity = nextQuantity;
    } else {
      cart.items.push({ product: product._id, quantity: requestedQuantity });
    }

    await cart.save();
    await cart.populate("items.product");
    res.status(200).json({ message: "Item added to cart", cart });
  } catch (err) {
    res.status(500).json({
      message: "Failed to add item to cart",
      error: (err as Error).message,
    });
  }
};

export const updateCartItem = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const userId = getUserId(req, res);
  if (!userId) return;

  try {
    const { quantity } = req.body;
    const requestedQuantity = Number(quantity);
    const { product: productId } = req.params;

    if (
      !mongoose.isValidObjectId(productId) ||
      !Number.isInteger(requestedQuantity) ||
      requestedQuantity < 1
    ) {
      res.status(400).json({
        message:
          "product id must be valid and quantity must be a positive integer",
      });
      return;
    }

    const product = await ProductModel.findById(productId);
    if (!product) {
      res.status(404).json({ message: "Product not found" });
      return;
    }

    if (requestedQuantity > product.stock) {
      res.status(400).json({
        message: `Only ${product.stock} item(s) are available in stock`,
      });
      return;
    }

    const cart = await CartModel.findOne({ user: userId });
    const item = cart?.items.find(
      (cartItem) => cartItem.product.toString() === productId,
    );

    if (!cart || !item) {
      res.status(404).json({ message: "Cart item not found" });
      return;
    }

    item.quantity = requestedQuantity;
    await cart.save();
    await cart.populate("items.product");
    res.status(200).json({ message: "Cart item updated", cart });
  } catch (err) {
    res.status(500).json({
      message: "Failed to update cart item",
      error: (err as Error).message,
    });
  }
};

export const removeCartItem = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const userId = getUserId(req, res);
  if (!userId) return;

  try {
    const { product: productId } = req.params;
    if (!mongoose.isValidObjectId(productId)) {
      res.status(400).json({ message: "Invalid product id" });
      return;
    }

    const cart = await CartModel.findOne({ user: userId });
    if (!cart) {
      res.status(404).json({ message: "Cart item not found" });
      return;
    }

    const originalLength = cart.items.length;
    cart.items = cart.items.filter(
      (cartItem) => cartItem.product.toString() !== productId,
    );

    if (cart.items.length === originalLength) {
      res.status(404).json({ message: "Cart item not found" });
      return;
    }

    await cart.save();
    await cart.populate("items.product");
    res.status(200).json({ message: "Item removed from cart", cart });
  } catch (err) {
    res.status(500).json({
      message: "Failed to remove cart item",
      error: (err as Error).message,
    });
  }
};

export const clearCart = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const userId = getUserId(req, res);
  if (!userId) return;

  try {
    const cart = await CartModel.findOneAndUpdate(
      { user: userId },
      { $set: { items: [] } },
      { new: true, upsert: true },
    );

    res.status(200).json({ message: "Cart cleared", cart });
  } catch (err) {
    res.status(500).json({
      message: "Failed to clear cart",
      error: (err as Error).message,
    });
  }
};
