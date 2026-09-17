import { Document, Schema, Types, model } from "mongoose";

export interface CartItem {
  product: Types.ObjectId;
  quantity: number;
}

export interface CartDocument extends Document {
  user: Types.ObjectId;
  items: CartItem[];
  createdAt: Date;
  updatedAt: Date;
}

const cartItemSchema = new Schema<CartItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const cartSchema = new Schema<CartDocument>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    items: { type: [cartItemSchema], default: [] },
  },
  { timestamps: true },
);

export const CartModel = model<CartDocument>("Cart", cartSchema);
