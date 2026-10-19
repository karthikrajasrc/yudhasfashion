import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    sku: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    categorySlug: { type: String, required: true, trim: true, lowercase: true },
    shortDescription: {
      type: String,
      required: true,
      trim: true,
      maxlength: 240,
    },
    description: { type: String, required: true, trim: true, maxlength: 5000 },
    imageUrl: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    salePrice: { type: Number, default: null, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    featured: { type: Boolean, default: false },
    newArrival: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Product = mongoose.model("Product", productSchema);
