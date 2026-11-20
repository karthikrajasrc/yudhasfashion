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
    freeDeliveryThreshold:
      settings?.freeDeliveryThreshold ?? FREE_DELIVERY_THRESHOLD,
    freeDeliveryEnabled: settings?.freeDeliveryEnabled ?? true,
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
      freeDeliveryThreshold: z.number().finite().min(0).max(100_000).optional(),
      freeDeliveryEnabled: z.boolean().optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Enter valid delivery settings" });
  }

  try {
    const currentSettings = await DeliverySettings.findOne({
      key: "global",
    }).lean();
    const freeDeliveryThreshold =
      parsed.data.freeDeliveryThreshold ??
      currentSettings?.freeDeliveryThreshold ??
      FREE_DELIVERY_THRESHOLD;
    const freeDeliveryEnabled =
      parsed.data.freeDeliveryEnabled ??
      currentSettings?.freeDeliveryEnabled ??
      true;
    const settings = await DeliverySettings.findOneAndUpdate(
      { key: "global" },
      {
        $set: {
          deliveryCharge: parsed.data.deliveryCharge,
          freeDeliveryThreshold,
          freeDeliveryEnabled,
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
        freeDeliveryThreshold: settings.freeDeliveryThreshold,
        freeDeliveryEnabled: settings.freeDeliveryEnabled,
      },
    });
  } catch (error) {
    return next(error);
  }
});
