import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Package, Search } from "lucide-react";
import { GoldButton } from "@/components/section";
import { formatINR } from "@/lib/format";
import { trackOrder } from "@/services/order.service";
import type { AdminOrder } from "@/services/admin.service";

export const Route = createFileRoute("/orders")({
  head: () => ({
    meta: [
      { title: "Track Order | YUDHAS FASHION" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TrackOrderPage,
});

const apiUrl = (
  import.meta.env.BACKEND_API_URL || "http://localhost:4000"
).replace(/\/$/, "");

function TrackOrderPage() {
  const [orderId, setOrderId] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [lookupType, setLookupType] = useState<"order" | "phone">("order");
  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setOrder(null);
    if (lookupType === "order" && !orderId.trim()) {
      setError("Enter an order ID or phone number");
      return;
    }
    if (lookupType === "phone" && !phone.trim()) {
      setError("Enter a phone number");
      return;
    }
    if (lookupType === "phone" && !/^\d{10}$/.test(phone)) {
      setError("Phone number must contain exactly 10 digits");
      return;
    }

    setLoading(true);
    try {
      setOrder(
        await trackOrder(
          lookupType === "order" ? orderId.trim() : undefined,
          lookupType === "phone" ? phone : undefined,
          lookupType === "order" ? email.trim() || undefined : undefined,
        ),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to track this order",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-5xl px-4 py-12 lg:px-8">
      <header className="mb-8 text-center">
        <p className="eyebrow">Order status</p>
        <h1 className="mt-3 text-4xl">Track your order</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
          Enter your order ID or the 10-digit phone number used at checkout.
        </p>
      </header>

      <form
        onSubmit={submit}
        className="mx-auto max-w-3xl border border-border p-5"
      >
        <div className="mb-5 grid grid-cols-2 rounded-full border border-border p-1">
          <button
            type="button"
            onClick={() => setLookupType("order")}
            className={lookupType === "order"
              ? "rounded-full bg-gold-gradient px-4 py-3 text-xs tracking-[0.12em] text-primary-foreground uppercase"
              : "rounded-full px-4 py-3 text-xs tracking-[0.12em] text-muted-foreground uppercase"}
          >
            Order number
          </button>
          <button
            type="button"
            onClick={() => setLookupType("phone")}
            className={lookupType === "phone"
              ? "rounded-full bg-gold-gradient px-4 py-3 text-xs tracking-[0.12em] text-primary-foreground uppercase"
              : "rounded-full px-4 py-3 text-xs tracking-[0.12em] text-muted-foreground uppercase"}
          >
            Phone number
          </button>
        </div>

        <div className="space-y-4">
          {lookupType === "order" ? (
            <>
              <label className="block space-y-1.5">
                <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Order number
                </span>
                <input
                  value={orderId}
                  onChange={(event) => setOrderId(event.target.value)}
                  placeholder="YF-..."
                  className="w-full border border-input bg-transparent px-3 py-3 text-sm outline-none focus:border-primary"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Email used at checkout
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="w-full border border-input bg-transparent px-3 py-3 text-sm outline-none focus:border-primary"
                />
              </label>
            </>
          ) : (
            <label className="block space-y-1.5">
              <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Phone number
              </span>
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]{10}"
                maxLength={10}
                value={phone}
                onChange={(event) =>
                  setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))
                }
                placeholder="10-digit number"
                className="w-full border border-input bg-transparent px-3 py-3 text-sm outline-none focus:border-primary"
              />
            </label>
          )}
          <GoldButton type="submit" className="mt-2 w-full" disabled={loading}>
            <Search className="size-4" />
            {loading ? "Tracking…" : "Track order"}
          </GoldButton>
        </div>
      </form>

      {error ? (
        <p role="alert" className="mt-6 text-center text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {order ? (
        <article className="glass-panel mt-8 p-5 sm:p-6">
          <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
            <div>
              <p className="font-medium text-primary">{order.orderNumber}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Placed {new Date(order.createdAt).toLocaleString()}
              </p>
            </div>
            <span className="border border-primary/40 px-3 py-1 text-xs tracking-wide text-primary capitalize">
              {order.status}
            </span>
          </header>

          <div className="divide-y divide-border">
            {order.items.map((item, index) => {
              const image = item.image.startsWith("http")
                ? item.image
                : `${apiUrl}${item.image}`;
              return (
                <div
                  key={`${order._id}-${item.productId}-${index}`}
                  className="flex gap-4 py-4"
                >
                  {item.image ? (
                    <img
                      src={image}
                      alt={item.name}
                      className="size-20 shrink-0 object-cover"
                    />
                  ) : (
                    <div className="grid size-20 shrink-0 place-items-center bg-muted">
                      <Package className="size-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{item.name}</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Qty {item.quantity} · {formatINR(item.price)} each
                    </p>
                  </div>
                  <p className="shrink-0 text-sm">
                    {formatINR(item.price * item.quantity)}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap justify-between gap-4 border-t border-border pt-4">
            <div className="text-xs text-muted-foreground">
              <p>
                Payment:{" "}
                {`Razorpay · ${order.paymentStatus ?? "pending"}`}
              </p>
              <p className="mt-1">
                Delivering to: {order.customerName}, {order.shippingAddress},{" "}
                {order.city}, {order.state} - {order.pincode}
              </p>
            </div>
            <p className="text-lg text-primary">
              Total: {formatINR(order.total)}
            </p>
          </div>
        </article>
      ) : null}

      <div className="mt-8 text-center">
        <Link to="/shop" className="text-sm text-primary underline underline-offset-4">
          Continue shopping
        </Link>
      </div>
    </section>
  );
}
