import { NextFunction, Request, Response } from "express";

export const validateOrderInput = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const { items, shippingAddress } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({
      message: "Order items are required",
    });
    return;
  }

  for (const [index, item] of items.entries()) {
    if (!item.product || !item.name || !item.price || !item.quantity) {
      res.status(400).json({
        message: `Invalid item at index ${index}`,
      });
      return;
    }

    if (Number(item.quantity) <= 0) {
      res.status(400).json({
        message: `Quantity must be greater than 0 for item at index ${index}`,
      });
      return;
    }
  }

  if (!shippingAddress) {
    res.status(400).json({
      message: "Shipping address is required",
    });
    return;
  }

  const requiredShippingFields = [
    "fullName",
    "phone",
    "address",
    "city",
    "postalCode",
    "country",
  ];

  for (const field of requiredShippingFields) {
    if (!shippingAddress[field]) {
      res.status(400).json({
        message: `Shipping field '${field}' is required`,
      });
      return;
    }
  }

  next();
};

export const validateOrderStatus = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const { status, paymentStatus } = req.body;

  const validStatuses = [
    "pending",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
  ];
  const validPaymentStatuses = ["pending", "paid", "failed", "refunded"];

  if (status !== undefined && !validStatuses.includes(status)) {
    res.status(400).json({
      message: "Invalid order status",
      validStatuses,
    });
    return;
  }

  if (
    paymentStatus !== undefined &&
    !validPaymentStatuses.includes(paymentStatus)
  ) {
    res.status(400).json({
      message: "Invalid payment status",
      validPaymentStatuses,
    });
    return;
  }

  next();
};
