import type { AdminOrder } from "@/services/admin.service";
import { readApiResponse } from "@/services/api-response";

const apiUrl = (
  import.meta.env.BACKEND_API_URL || "http://localhost:4000"
).replace(/\/$/, "");

export async function trackOrder(orderId?: string, phone?: string, email?: string) {
  const result = await readApiResponse<{ order: AdminOrder }>(
    fetch(`${apiUrl}/api/orders/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(orderId ? { orderId } : {}),
        ...(phone ? { phone } : {}),
        ...(email ? { email } : {}),
      }),
    }),
    "Unable to track your order",
  );
  return result.order;
}
