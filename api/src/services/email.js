import nodemailer from "nodemailer";
import { config } from "../config.js";

const recipient = "yudhasfashion@gmail.com";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function createTransport() {
  if (!config.smtpUser || !config.smtpPass) return null;
  return nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass,
    },
  });
}

export async function sendConfirmedOrderEmail(order) {
  if (!order || order.emailSentAt) return false;

  const transporter = createTransport();
  if (!transporter) {
    console.warn("Confirmed order email skipped: SMTP credentials are not configured");
    return false;
  }

  const itemRows = order.items
    .map(
      (item) => `
        <tr>
          <td style="padding:8px;border-bottom:1px solid #eee">${escapeHtml(item.name)}</td>
          <td style="padding:8px;border-bottom:1px solid #eee">${item.quantity}</td>
          <td style="padding:8px;border-bottom:1px solid #eee">₹${item.price * item.quantity}</td>
        </tr>`,
    )
    .join("");

  const address = [
    order.customerName,
    order.shippingAddress,
    [order.city, order.state, order.pincode].filter(Boolean).join(", "),
    `Phone: ${order.phone}`,
  ]
    .filter(Boolean)
    .join("<br>");

  await transporter.sendMail({
    from: config.emailFrom,
    to: recipient,
    replyTo: order.customerEmail || undefined,
    subject: `New confirmed order ${order.orderNumber}`,
    text: [
      `New confirmed order: ${order.orderNumber}`,
      `Customer: ${order.customerName}`,
      `Email: ${order.customerEmail || "Not provided"}`,
      `Phone: ${order.phone}`,
      `Address: ${order.shippingAddress}, ${order.city}, ${order.state} - ${order.pincode}`,
      `Payment: Razorpay captured`,
      `Payment ID: ${order.razorpayPaymentId}`,
      `Total: ₹${order.total}`,
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;max-width:680px;color:#201b18">
        <h2>New confirmed order</h2>
        <p><strong>Order:</strong> ${escapeHtml(order.orderNumber)}</p>
        <p><strong>Payment:</strong> Razorpay captured<br>
        <strong>Payment ID:</strong> ${escapeHtml(order.razorpayPaymentId)}</p>
        <h3>Customer</h3>
        <p>${address}</p>
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr>
              <th style="text-align:left;padding:8px;border-bottom:2px solid #ddd">Item</th>
              <th style="text-align:left;padding:8px;border-bottom:2px solid #ddd">Qty</th>
              <th style="text-align:left;padding:8px;border-bottom:2px solid #ddd">Amount</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
        </table>
        <p><strong>Subtotal:</strong> ₹${order.subtotal}</p>
        <p><strong>Discount:</strong> ₹${order.discount}</p>
        <p><strong>Delivery:</strong> ₹${order.deliveryCharge}</p>
        <h3>Total: ₹${order.total}</h3>
      </div>`,
  });
  order.emailSentAt = new Date();
  await order.save();
  return true;
}
