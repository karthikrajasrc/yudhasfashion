import type { AdminOrder } from "@/services/admin.service";
import { readApiResponse } from "@/services/api-response";

const apiUrl = (
  import.meta.env.BACKEND_API_URL || "http://localhost:4000"
).replace(/\/$/, "");

export async function listMyOrders(): Promise<AdminOrder[]> {
  const result = await readApiResponse<{ orders: AdminOrder[] }>(
    fetch(`${apiUrl}/api/orders/mine`, {
      credentials: "include",
    }),
    "Unable to load your orders",
  );
  return result.orders;
}
