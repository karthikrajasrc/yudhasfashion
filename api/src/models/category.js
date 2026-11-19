import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    displayOrder: { type: Number, default: 0, min: 0 },
    imageUrl: { type: String, default: "" },
    cloudinaryPublicId: { type: String, default: "" },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      required: true,
    },
  },
  { timestamps: true },
);

export const Category = mongoose.model("Category", categorySchema);
