import { Schema, model, Document, Types } from "mongoose";

export interface Review {
  rating: number;
  comment: string;
  date: Date;
  reviewerName: string;
  reviewerEmail: string;
}

export interface ProductImage {
  url: string;
  publicId: string; // cloudinary public_id, needed to delete/replace the image later
}

export interface ProductDocument extends Document {
  name: string;
  description: string;
  price: number;
  tags: string[];
  reviews: Types.DocumentArray<Review & Document>;
  image?: ProductImage;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<Review>(
  {
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true },
    date: { type: Date, default: Date.now },
    reviewerName: { type: String, required: true, trim: true },
    reviewerEmail: { type: String, required: true, trim: true, lowercase: true },
  },
  { _id: false }
);

const productSchema = new Schema<ProductDocument>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    tags: { type: [String], default: [] },
    reviews: { type: [reviewSchema], default: [] },
    image: {
      url: { type: String },
      publicId: { type: String },
    },
  },
  { timestamps: true }
);

export const ProductModel = model<ProductDocument>("Product", productSchema);
