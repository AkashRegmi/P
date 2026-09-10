import { Schema, model, Document, Types } from "mongoose";

export interface ProductImage {
  url: string;
  publicId: string; // cloudinary public_id, needed to delete/replace the image later
}

export interface ProductDocument extends Document {
  name: string;
  description: string;
  price: number;
  category: string;
  brand: string;
  stock: number;
  tags: string[];
  isFeatured?: boolean;
  image?: ProductImage;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<ProductDocument>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, trim: true },
    brand: { type: String, required: true, trim: true },
    stock: { type: Number, required: true, min: 0, default: 0 },
    tags: { type: [String], default: [] },
    isFeatured: { type: Boolean, default: false },
    image: {
      url: { type: String },
      publicId: { type: String },
    },
  },
  { timestamps: true },
);

export const ProductModel = model<ProductDocument>("Product", productSchema);
