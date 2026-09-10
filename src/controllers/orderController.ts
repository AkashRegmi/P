import { Response } from "express";
import { OrderModel } from "../models/Order";
import { AuthRequest } from "../middleware/authMiddleware";

export const getAllOrders = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const orders = await OrderModel.find({ user: userId })
      .sort({ createdAt: -1 })
      .populate("user", "name email");

    res.status(200).json({
      success: true,
      orders,
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to fetch orders",
      error: (err as Error).message,
    });
  }
};

export const getOrderById = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const order = await OrderModel.findOne({
      _id: req.params.id,
      user: userId,
    }).populate("user", "name email");

    if (!order) {
      res.status(404).json({ message: "Order not found" });
      return;
    }

    res.status(200).json({
      success: true,
      order,
    });
  } catch (err) {
    res.status(400).json({
      message: "Invalid order id",
      error: (err as Error).message,
    });
  }
};

export const createOrder = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const { items, shippingAddress, paymentStatus } = req.body;

    const totalAmount = items.reduce(
      (sum: number, item: { price: number; quantity: number }) =>
        sum + item.price * item.quantity,
      0,
    );

    const order = await OrderModel.create({
      user: userId,
      items,
      shippingAddress,
      totalAmount,
      paymentStatus: paymentStatus || "pending",
    });

    res.status(201).json({
      message: "Order created successfully",
      order,
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to create order",
      error: (err as Error).message,
    });
  }
};

export const updateOrderStatus = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const { status, paymentStatus } = req.body;

    const order = await OrderModel.findOne({
      _id: req.params.id,
      user: userId,
    });

    if (!order) {
      res.status(404).json({ message: "Order not found" });
      return;
    }

    if (status !== undefined) order.status = status;
    if (paymentStatus !== undefined) order.paymentStatus = paymentStatus;

    await order.save();

    res.status(200).json({
      message: "Order updated successfully",
      order,
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to update order",
      error: (err as Error).message,
    });
  }
};

export const deleteOrder = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const order = await OrderModel.findOneAndDelete({
      _id: req.params.id,
      user: userId,
    });

    if (!order) {
      res.status(404).json({ message: "Order not found" });
      return;
    }

    res.status(200).json({
      message: "Order deleted successfully",
      order,
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to delete order",
      error: (err as Error).message,
    });
  }
};
