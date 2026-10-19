import { createHmac, timingSafeEqual } from "node:crypto";
import { config } from "../config.js";

const razorpayApi = "https://api.razorpay.com/v1";

export class RazorpayError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.name = "RazorpayError";
    this.status = status;
  }
}

function requireApiCredentials() {
  if (!config.razorpayKeyId || !config.razorpayKeySecret) {
    throw new RazorpayError("Online payments are not configured", 503);
  }
}

export function requireWebhookSecret() {
  if (!config.razorpayWebhookSecret) {
    throw new RazorpayError("Payment webhook is not configured", 503);
  }
}

export async function razorpayRequest(path, { method = "GET", body } = {}) {
  requireApiCredentials();
  let response;
  try {
    response = await fetch(`${razorpayApi}${path}`, {
      method,
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${config.razorpayKeyId}:${config.razorpayKeySecret}`,
        ).toString("base64")}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    throw new RazorpayError(
      error?.name === "TimeoutError"
        ? "Payment provider timed out. Please try again."
        : "Unable to connect to the payment provider",
      502,
    );
  }

  const result = await response.json().catch(() => null);
  if (!response.ok || !result) {
    console.error("Razorpay API request failed", {
      status: response.status,
      code: result?.error?.code,
      description: result?.error?.description,
    });
    throw new RazorpayError(
      result?.error?.description ?? "Payment provider request failed",
      response.status >= 500 ? 502 : 400,
    );
  }
  return result;
}

export function verifySignature(value, signature, secret) {
  if (
    typeof signature !== "string" ||
    !/^[a-f\d]{64}$/i.test(signature) ||
    !Buffer.isBuffer(value)
  ) {
    return false;
  }
  const expected = createHmac("sha256", secret).update(value).digest();
  const received = Buffer.from(signature, "hex");
  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  );
}

export function verifyCheckoutSignature(orderId, paymentId, signature) {
  requireApiCredentials();
  if (typeof signature !== "string" || !/^[a-f\d]{64}$/i.test(signature)) {
    return false;
  }
  const expected = createHmac("sha256", config.razorpayKeySecret)
    .update(`${orderId}|${paymentId}`)
    .digest();
  const received = Buffer.from(signature, "hex");
  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  );
}

export function verifyWebhookSignature(body, signature) {
  requireWebhookSecret();
  return verifySignature(body, signature, config.razorpayWebhookSecret);
}
