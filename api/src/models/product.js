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
    subcategorySlug: {
      type: String,
      default: null,
      trim: true,
      lowercase: true,
    },
    description: { type: String, required: true, trim: true, maxlength: 5000 },
    imageUrl: { type: String, required: true },
    cloudinaryPublicId: { type: String, default: null },
    sizes: { type: [String], default: [] },
    colors: { type: [String], default: [] },
    specifications: {
      type: [
        {
          label: { type: String, trim: true },
          value: { type: String, trim: true },
        },
      ],
      default: [],
    },
    price: { type: Number, required: true, min: 0 },
    salePrice: { type: Number, default: null, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    featured: { type: Boolean, default: false },
    newArrival: { type: Boolean, default: true },
    soldCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

export const Product = mongoose.model("Product", productSchema);
