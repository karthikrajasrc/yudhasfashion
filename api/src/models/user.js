import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["admin", "user"],
      default: "user",
      required: true,
    },
    passwordHash: { type: String, select: false },
    googleId: { type: String, unique: true, sparse: true, select: false },
  },
  { timestamps: true },
);

export const User = mongoose.model("User", userSchema);
