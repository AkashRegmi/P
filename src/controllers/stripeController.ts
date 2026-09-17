import { Request, Response } from "express";
import Stripe from "stripe";
import dotenv from "dotenv";
import { OrderModel } from "../models/Order";
dotenv.config();
const stripe = new Stripe(process.env.STRIPE_KEY as string);
export const StripeController = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      res.status(400).json({
        success: false,
        message: "Order Id is Requires",
      });
    }
    const order = await OrderModel.findById(orderId).populate("items.product");

    if (!order) {
      res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // if (order!.user.toString() !== (req as any).user._id.toString()) {
    //   return res.status(403).json({
    //     success: false,
    //     message: "You are not allowed to pay for this order",
    //   });
    // }

    // Don't allow paying twice
    if (order!.paymentStatus === "paid") {
      return res.status(400).json({
        success: false,
        message: "This order has already been paid",
      });
    }
    const lineItems = order!.items.map((item) => {
      const product = item.product as any;

      return {
        price_data: {
          currency: "usd",

          product_data: {
            name: product.name,
          },

          unit_amount: Math.round(product.price * 100),
        },

        quantity: item.quantity,
      };
    });
    console.log(lineItems);
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: lineItems,
      success_url: `${process.env.CLIENT_URL}/orders/${order!._id}?payment=success`,
      cancel_url: `${process.env.CLIENT_URL}/orders/${order!._id}?payment=cancelled`,

      metadata: {
        orderId: order!._id.toString(),
      },
    });
    return res.status(200).json({
      success: true,
      url: session.url,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Failed to create checkout session",
    });
  }
};
