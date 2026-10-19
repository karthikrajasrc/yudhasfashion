import mongoose from "mongoose";

const deliverySettingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "global" },
    deliveryCharge: { type: Number, required: true, min: 0, max: 100_000 },
    freeDeliveryThreshold: {
      type: Number,
      required: true,
      min: 0,
      default: 5000,
    },
  },
  { timestamps: true },
);

export const DeliverySettings = mongoose.model(
  "DeliverySettings",
  deliverySettingsSchema,
);
