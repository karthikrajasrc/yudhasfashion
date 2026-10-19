import type { NewOrder } from "@/services/admin.service";
import { readApiResponse } from "@/services/api-response";

const apiUrl = (
  import.meta.env["BACKEND_API_URL"] ?? "http://localhost:4000"
).replace(/\/$/, "");

type PaymentOrderResponse = {
  keyId: string;
  order: { id: string; amount: number; currency: string };
  orderNumber: string;
};

type PaymentVerification = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

export type RazorpayCheckoutResponse = PaymentVerification;

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: { name: string; email: string; contact: string };
  theme: { color: string };
  handler: (response: RazorpayCheckoutResponse) => void;
  modal: { ondismiss: () => void };
};

type RazorpayCheckout = {
  open: () => void;
  on: (
    event: "payment.failed",
    callback: (response: {
      error?: { description?: string; reason?: string };
    }) => void,
  ) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayCheckout;
  }
}

let sdkPromise: Promise<void> | undefined;

export async function createRazorpayOrder(data: NewOrder) {
  return readApiResponse<PaymentOrderResponse>(
    fetch(`${apiUrl}/api/payments/orders`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
    "Payment request could not be completed",
  );
}

export async function verifyRazorpayPayment(data: PaymentVerification) {
  return readApiResponse<{
    orderNumber: string;
    paymentStatus: "captured" | "authorized";
    message?: string;
  }>(
    fetch(`${apiUrl}/api/payments/verify`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
    "Payment request could not be completed",
  );
}

export function loadRazorpay(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
    );
    const script = existingScript ?? document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => {
      if (window.Razorpay) {
        resolve();
      } else {
        sdkPromise = undefined;
        reject(new Error("Razorpay checkout could not be initialized"));
      }
    };
    script.onerror = () => {
      sdkPromise = undefined;
      reject(new Error("Unable to load Razorpay checkout"));
    };
    if (!existingScript) document.body.appendChild(script);
  });
  return sdkPromise;
}
