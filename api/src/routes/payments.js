import express, { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { config } from "../config.js";
import { Order } from "../models/order.js";
import { User } from "../models/user.js";
import { requireAuth } from "../middleware/require-auth.js";
import { buildOrderDetails, OrderDetailsError } from "../lib/order-details.js";
import { createOrderSchema } from "./orders.js";
import {
  RazorpayError,
  razorpayRequest,
  verifyCheckoutSignature,
  verifyWebhookSignature,
} from "../services/razorpay.js";

export const paymentsRouter = Router();
export const paymentWebhookRouter = Router();
const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many payment attempts. Please try again later." },
});

const checkoutVerificationSchema = z.object({
  razorpay_order_id: z.string().min(1).max(100),
  razorpay_payment_id: z.string().min(1).max(100),
  razorpay_signature: z.string().regex(/^[a-f\d]{64}$/i),
});

paymentsRouter.post(
  "/orders",
  requireAuth,
  checkoutLimiter,
  async (req, res, next) => {
    const parsed = createOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: parsed.error.issues[0]?.message ?? "Invalid order details",
      });
    }

    try {
      const user = await User.findById(req.authUserId);
      if (!user)
        return res.status(401).json({ message: "Authentication required" });

      const details = await buildOrderDetails(user, parsed.data);
      const amount = Math.round(details.total * 100);
      if (amount < 100) {
        return res
          .status(400)
          .json({ message: "Online payment requires a total of at least ₹1" });
      }
      details.total = amount / 100;

      const razorpayOrder = await razorpayRequest("/orders", {
        method: "POST",
        body: {
          amount,
          currency: "INR",
          receipt: details.orderNumber,
          notes: { orderNumber: details.orderNumber },
        },
      });
      if (!razorpayOrder.id || razorpayOrder.amount !== amount) {
        throw new RazorpayError("Payment provider returned an invalid order");
      }

      const order = await Order.create({
        ...details,
        paymentMethod: "razorpay",
        paymentStatus: "created",
        razorpayOrderId: razorpayOrder.id,
      });
      return res.status(201).json({
        keyId: config.razorpayKeyId,
        order: {
          id: razorpayOrder.id,
          amount,
          currency: "INR",
          receipt: details.orderNumber,
        },
        orderNumber: order.orderNumber,
      });
    } catch (error) {
      if (
        error instanceof OrderDetailsError ||
        error instanceof RazorpayError
      ) {
        return res.status(error.status).json({ message: error.message });
      }
      return next(error);
    }
  },
);

paymentsRouter.post(
  "/verify",
  requireAuth,
  checkoutLimiter,
  async (req, res, next) => {
    const parsed = checkoutVerificationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ message: "Invalid payment verification data" });
    }

    try {
      const {
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: razorpayPaymentId,
        razorpay_signature: signature,
      } = parsed.data;
      if (
        !verifyCheckoutSignature(razorpayOrderId, razorpayPaymentId, signature)
      ) {
        return res
          .status(400)
          .json({ message: "Payment signature is invalid" });
      }

      const order = await Order.findOne({
        razorpayOrderId,
        user: req.authUserId,
        paymentMethod: "razorpay",
      });
      if (!order)
        return res.status(404).json({ message: "Payment order not found" });
      if (
        order.paymentStatus === "captured" &&
        order.razorpayPaymentId === razorpayPaymentId
      ) {
        return res.json({
          orderNumber: order.orderNumber,
          paymentStatus: order.paymentStatus,
        });
      }

      let payment = await razorpayRequest(
        `/payments/${encodeURIComponent(razorpayPaymentId)}`,
      );
      const expectedAmount = Math.round(order.total * 100);
      if (
        payment.order_id !== razorpayOrderId ||
        payment.amount !== expectedAmount ||
        payment.currency !== "INR"
      ) {
        return res
          .status(400)
          .json({ message: "Payment details do not match the order" });
      }
      if (payment.status === "authorized") {
        try {
          payment = await razorpayRequest(
            `/payments/${encodeURIComponent(razorpayPaymentId)}/capture`,
            {
              method: "POST",
              body: { amount: expectedAmount, currency: "INR" },
            },
          );
        } catch (error) {
          const latestPayment = await razorpayRequest(
            `/payments/${encodeURIComponent(razorpayPaymentId)}`,
          );
          if (latestPayment.status !== "captured") throw error;
          payment = latestPayment;
        }
      }
      if (payment.status !== "captured") {
        if (payment.status === "failed") {
          await Order.updateOne(
            { _id: order._id, paymentStatus: { $ne: "captured" } },
            { $set: { paymentStatus: "failed", razorpayPaymentId } },
          );
          return res
            .status(402)
            .json({ message: "Payment was not successful" });
        }
        await Order.updateOne(
          { _id: order._id, paymentStatus: { $ne: "captured" } },
          { $set: { paymentStatus: "authorized", razorpayPaymentId } },
        );
        return res.status(202).json({
          orderNumber: order.orderNumber,
          paymentStatus: "authorized",
          message: "Payment is processing. Confirmation will follow shortly.",
        });
      }

      if (
        payment.order_id !== razorpayOrderId ||
        payment.amount !== expectedAmount ||
        payment.currency !== "INR"
      ) {
        return res
          .status(400)
          .json({ message: "Captured payment does not match the order" });
      }

      await Order.updateOne(
        { _id: order._id, paymentStatus: { $ne: "captured" } },
        {
          $set: {
            paymentStatus: "captured",
            razorpayPaymentId,
          },
        },
      );
      return res.json({
        orderNumber: order.orderNumber,
        paymentStatus: "captured",
      });
    } catch (error) {
      if (error instanceof RazorpayError) {
        return res.status(error.status).json({ message: error.message });
      }
      return next(error);
    }
  },
);

paymentWebhookRouter.post(
  "/",
  express.raw({ type: "application/json", limit: "100kb" }),
  async (req, res, next) => {
    try {
      const signature = req.get("x-razorpay-signature");
      if (
        !Buffer.isBuffer(req.body) ||
        !verifyWebhookSignature(req.body, signature)
      ) {
        return res.status(400).json({ message: "Invalid webhook signature" });
      }

      let event;
      try {
        event = JSON.parse(req.body.toString("utf8"));
      } catch {
        return res.status(400).json({ message: "Invalid webhook payload" });
      }

      const payment = event?.payload?.payment?.entity;
      if (!payment?.order_id || !payment?.id)
        return res.json({ received: true });
      const order = await Order.findOne({
        razorpayOrderId: payment.order_id,
        paymentMethod: "razorpay",
      });
      if (!order) return res.json({ received: true });

      if (
        event.event === "payment.captured" &&
        payment.amount === Math.round(order.total * 100) &&
        payment.currency === "INR"
      ) {
        await Order.updateOne(
          { _id: order._id, paymentStatus: { $ne: "captured" } },
          {
            $set: {
              paymentStatus: "captured",
              razorpayPaymentId: payment.id,
            },
          },
        );
      } else if (
        event.event === "payment.captured" &&
        (payment.amount !== Math.round(order.total * 100) ||
          payment.currency !== "INR")
      ) {
        console.error("Razorpay captured-payment amount mismatch", {
          orderNumber: order.orderNumber,
          razorpayOrderId: payment.order_id,
          amount: payment.amount,
          currency: payment.currency,
        });
      } else if (event.event === "payment.failed") {
        await Order.updateOne(
          { _id: order._id, paymentStatus: { $nin: ["captured", "failed"] } },
          {
            $set: {
              paymentStatus: "failed",
              razorpayPaymentId: payment.id,
            },
          },
        );
      }
      return res.json({ received: true });
    } catch (error) {
      if (error instanceof RazorpayError) {
        return res.status(error.status).json({ message: error.message });
      }
      return next(error);
    }
  },
);
