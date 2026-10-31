import { Router } from "express";
import { z } from "zod";
import {
  DeliverySettings,
  FREE_DELIVERY_THRESHOLD,
} from "../models/delivery-settings.js";
import { requireAdmin, requireAuth } from "../middleware/require-auth.js";

async function readSettings() {
  const settings = await DeliverySettings.findOne({ key: "global" }).lean();
  return {
    deliveryCharge: settings?.deliveryCharge ?? null,
    freeDeliveryThreshold: FREE_DELIVERY_THRESHOLD,
  };
}

export const deliverySettingsRouter = Router();
deliverySettingsRouter.get("/", async (_req, res, next) => {
  try {
    return res.json({ settings: await readSettings() });
  } catch (error) {
    return next(error);
  }
});

export const adminDeliverySettingsRouter = Router();
adminDeliverySettingsRouter.use(requireAuth, requireAdmin);
adminDeliverySettingsRouter.get("/", async (_req, res, next) => {
  try {
    return res.json({ settings: await readSettings() });
  } catch (error) {
    return next(error);
  }
});

adminDeliverySettingsRouter.put("/", async (req, res, next) => {
  const parsed = z
    .object({
      deliveryCharge: z.number().finite().min(0).max(100_000),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Enter a valid delivery charge" });
  }

  try {
    const settings = await DeliverySettings.findOneAndUpdate(
      { key: "global" },
      {
        $set: {
          deliveryCharge: parsed.data.deliveryCharge,
          freeDeliveryThreshold: FREE_DELIVERY_THRESHOLD,
        },
        $setOnInsert: { key: "global" },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    ).lean();
    return res.json({
      settings: {
        deliveryCharge: settings.deliveryCharge,
        freeDeliveryThreshold: FREE_DELIVERY_THRESHOLD,
      },
    });
  } catch (error) {
    return next(error);
  }
});
