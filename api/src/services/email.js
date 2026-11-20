import { config } from "../config.js";

const recipient = "yudhasfashion@gmail.com";
const emailJsEndpoint = "https://api.emailjs.com/api/v1.0/email/send";
const activeOrderEmails = new Set();
let emailRequestQueue = Promise.resolve();
let lastEmailRequestAt = 0;

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function queueEmailRequest(payload) {
  const request = emailRequestQueue.then(async () => {
    const delay = 1000 - (Date.now() - lastEmailRequestAt);
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    lastEmailRequestAt = Date.now();
    return fetch(emailJsEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  });
  emailRequestQueue = request.then(
    () => undefined,
    () => undefined,
  );
  return request;
}

export async function sendConfirmedOrderEmail(order) {
  if (!order || order.emailSentAt) return false;
  if (activeOrderEmails.has(String(order._id))) return false;

  if (!config.emailJsServiceId) {
    throw new Error("EMAILJS_SERVICE_ID is not configured");
  }
  if (!config.emailJsTemplateId) {
    throw new Error("EMAILJS_TEMPLATE_ID is not configured");
  }
  if (!config.emailJsPublicKey) {
    throw new Error("EMAILJS_PUBLIC_KEY is not configured");
  }
  if (!config.emailJsPrivateKey) {
    throw new Error("EMAILJS_PRIVATE_KEY is not configured");
  }

  const orderId = String(order._id);
  activeOrderEmails.add(orderId);
  try {
    const templateParams = {
      email: recipient,
      order_id: order.orderNumber,
      customer_name: escapeHtml(order.customerName),
      customer_email: order.customerEmail || "Not provided",
      customer_phone: escapeHtml(order.phone),
      shipping_address: escapeHtml(order.shippingAddress),
      city: escapeHtml(order.city),
      state: escapeHtml(order.state),
      pincode: escapeHtml(order.pincode),
      orders: order.items.map((item) => ({
        image: escapeHtml(item.image),
        name: escapeHtml(item.name),
        units: item.quantity,
        price: item.price * item.quantity,
      })),
      cost: {
        subtotal: order.subtotal,
        shipping: order.deliveryCharge,
        tax: 0,
        discount: order.discount,
        total: order.total,
      },
      payment_id: order.razorpayPaymentId || "",
    };
    const response = await queueEmailRequest({
      service_id: config.emailJsServiceId,
      template_id: config.emailJsTemplateId,
      user_id: config.emailJsPublicKey,
      accessToken: config.emailJsPrivateKey,
      template_params: templateParams,
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(
        `EmailJS request failed (${response.status}): ${details || response.statusText}`,
      );
    }

    order.emailSentAt = new Date();
    await order.save();
    return true;
  } finally {
    activeOrderEmails.delete(orderId);
  }
}
