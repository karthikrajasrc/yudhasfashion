import express, { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { config } from "../config.js";
import { Order } from "../models/order.js";
import { buildOrderDetails, OrderDetailsError } from "../lib/order-details.js";
import { createOrderSchema } from "./orders.js";
import {
  RazorpayError,
  razorpayRequest,
  verifyCheckoutSignature,
  verifyWebhookSignature,
} from "../services/razorpay.js";
import { sendConfirmedOrderEmail } from "../services/email.js";

export const paymentsRouter = Router();
export const paymentWebhookRouter = Router();
const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many payment attempts. Please try again later." },
});
const paymentStatusLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many payment status checks. Please try again later." },
});

const checkoutVerificationSchema = z.object({
  razorpay_order_id: z.string().min(1).max(100),
  razorpay_payment_id: z.string().min(1).max(100),
  razorpay_signature: z.string().regex(/^[a-f\d]{64}$/i),
});

function dispatchConfirmedOrderEmail(order) {
  void sendConfirmedOrderEmail(order)
    .then((sent) => {
      if (sent) {
        console.info("Confirmed order email accepted by EmailJS", {
          orderNumber: order.orderNumber,
        });
      }
    })
    .catch((error) => {
      console.error("Confirmed order email failed", error);
    });
}

async function captureAuthorizedPayment(payment, expectedAmount) {
  if (payment.status !== "authorized") return payment;

  try {
    return await razorpayRequest(
      `/payments/${encodeURIComponent(payment.id)}/capture`,
      {
        method: "POST",
        body: { amount: expectedAmount, currency: "INR" },
      },
    );
  } catch (error) {
    const latestPayment = await razorpayRequest(
      `/payments/${encodeURIComponent(payment.id)}`,
    );
    if (latestPayment.status !== "captured") throw error;
    return latestPayment;
  }
}

async function confirmCapturedPayment(order, payment) {
  if (
    payment.order_id !== order.razorpayOrderId ||
    payment.amount !== Math.round(order.total * 100) ||
    payment.currency !== "INR"
  ) {
    return null;
  }

  if (payment.status !== "captured") return null;

  const updatedOrder = await Order.findOneAndUpdate(
    { _id: order._id, paymentStatus: { $ne: "captured" } },
    {
      $set: {
        paymentStatus: "captured",
        razorpayPaymentId: payment.id,
        status: "confirmed",
      },
    },
    { new: true },
  );
  const confirmedOrder = updatedOrder ?? (await Order.findById(order._id));
  if (confirmedOrder?.paymentStatus === "captured") {
    dispatchConfirmedOrderEmail(confirmedOrder);
    return confirmedOrder;
  }
  return null;
}

paymentsRouter.post("/orders", checkoutLimiter, async (req, res, next) => {
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: parsed.error.issues[0]?.message ?? "Invalid order details",
    });
  }

  try {
    const details = await buildOrderDetails(null, parsed.data);
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

    await Order.create({
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
      orderNumber: details.orderNumber,
    });
  } catch (error) {
    if (error instanceof OrderDetailsError || error instanceof RazorpayError) {
      return res.status(error.status).json({ message: error.message });
    }
    return next(error);
  }
});

paymentsRouter.get(
  "/orders/:razorpayOrderId/status",
  paymentStatusLimiter,
  async (req, res, next) => {
    const razorpayOrderId = z
      .string()
      .min(1)
      .max(100)
      .safeParse(req.params.razorpayOrderId);
    if (!razorpayOrderId.success) {
      return res.status(400).json({ message: "Invalid payment order" });
    }

    try {
      const order = await Order.findOne({
        razorpayOrderId: razorpayOrderId.data,
        paymentMethod: "razorpay",
      });
      if (!order)
        return res.status(404).json({ message: "Payment order not found" });

      if (order.paymentStatus !== "captured") {
        const result = await razorpayRequest(
          `/orders/${encodeURIComponent(order.razorpayOrderId)}/payments`,
        );
        const payments = Array.isArray(result.items) ? result.items : [];
        const payment =
          payments.find((item) => item.status === "captured") ??
          payments.find((item) => item.status === "authorized");
        if (payment) {
          const expectedAmount = Math.round(order.total * 100);
          if (
            payment.order_id !== order.razorpayOrderId ||
            payment.amount !== expectedAmount ||
            payment.currency !== "INR"
          ) {
            return res
              .status(400)
              .json({ message: "Payment details do not match the order" });
          }
          const capturedPayment = await captureAuthorizedPayment(
            payment,
            expectedAmount,
          );
          await confirmCapturedPayment(order, capturedPayment);
        }
      } else {
        dispatchConfirmedOrderEmail(order);
      }

      const latestOrder = await Order.findById(order._id);
      return res.json({
        orderNumber: latestOrder.orderNumber,
        paymentStatus: latestOrder.paymentStatus,
      });
    } catch (error) {
      if (error instanceof RazorpayError) {
        return res.status(error.status).json({ message: error.message });
      }
      return next(error);
    }
  },
);

paymentsRouter.post("/verify", checkoutLimiter, async (req, res, next) => {
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
      return res.status(400).json({ message: "Payment signature is invalid" });
    }

    const existingOrder = await Order.findOne({
      razorpayOrderId,
      paymentMethod: "razorpay",
    });
    if (
      existingOrder?.paymentStatus === "captured" &&
      existingOrder.razorpayPaymentId === razorpayPaymentId
    ) {
      dispatchConfirmedOrderEmail(existingOrder);
      return res.json({
        orderNumber: existingOrder.orderNumber,
        paymentStatus: existingOrder.paymentStatus,
      });
    }
    if (existingOrder?.paymentStatus === "captured") {
      return res.status(409).json({ message: "This order is already paid" });
    }

    if (!existingOrder)
      return res.status(404).json({ message: "Payment order not found" });

    let payment = await razorpayRequest(
      `/payments/${encodeURIComponent(razorpayPaymentId)}`,
    );
    const expectedAmount = Math.round(existingOrder.total * 100);
    if (
      payment.order_id !== razorpayOrderId ||
      payment.amount !== expectedAmount ||
      payment.currency !== "INR"
    ) {
      return res
        .status(400)
        .json({ message: "Payment details do not match the order" });
    }
    payment = await captureAuthorizedPayment(payment, expectedAmount);
    if (payment.status !== "captured") {
      if (payment.status === "failed") {
        await Order.updateOne(
          { _id: existingOrder._id, paymentStatus: { $ne: "captured" } },
          { $set: { paymentStatus: "failed" } },
        );
        return res.status(402).json({ message: "Payment was not successful" });
      }
      return res.status(202).json({
        orderNumber: existingOrder.orderNumber,
        paymentStatus: "authorized",
        message: "Payment is not confirmed. Please wait.",
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

    const order = await confirmCapturedPayment(existingOrder, payment);
    if (!order)
      return res
        .status(500)
        .json({ message: "Payment could not be confirmed" });
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
});

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
      if (event.event === "payment.captured" && order) {
        if (payment.amount !== Math.round(order.total * 100)) {
          console.error("Razorpay captured-payment amount mismatch", {
            orderNumber: order.orderNumber,
            razorpayOrderId: payment.order_id,
            amount: payment.amount,
            currency: payment.currency,
          });
        } else {
          await confirmCapturedPayment(order, payment);
        }
      } else if (event.event === "payment.failed" && order) {
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
