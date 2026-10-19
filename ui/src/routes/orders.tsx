import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Package, ShoppingBag } from "lucide-react";
import { GoldButton } from "@/components/section";
import { useAuth } from "@/context/auth-context";
import { formatINR } from "@/lib/format";
import { listMyOrders } from "@/services/order.service";

export const Route = createFileRoute("/orders")({
  head: () => ({
    meta: [
      { title: "My Orders | YUDHAS FASHION" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrdersPage,
});

const apiUrl = (
  import.meta.env["VITE_API_URL"] ?? "http://localhost:4000"
).replace(/\/$/, "");

function OrdersPage() {
  const { user, loading } = useAuth();
  const ordersQuery = useQuery({
    queryKey: ["my-orders", user?.id],
    queryFn: listMyOrders,
    enabled: Boolean(user),
  });

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-24 text-center text-muted-foreground">
        Loading your account…
      </div>
    );
  }

  if (!user) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p className="eyebrow">Yudhas Circle</p>
        <h1 className="mt-3 text-4xl">My Orders</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Sign in to see your current and past orders.
        </p>
        <Link
          to="/auth"
          search={{ redirect: "/orders" }}
          className="mt-6 inline-flex"
        >
          <GoldButton>Sign in</GoldButton>
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-5xl px-4 py-12 lg:px-8">
      <header className="mb-8">
        <p className="eyebrow">Yudhas Circle</p>
        <h1 className="mt-2 text-4xl">My Orders</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Track current orders and review your order history.
        </p>
      </header>

      {ordersQuery.isPending ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          Loading your orders…
        </p>
      ) : ordersQuery.isError ? (
        <div
          role="alert"
          className="glass-panel space-y-4 p-8 text-center text-sm"
        >
          <p className="text-destructive">{ordersQuery.error.message}</p>
          <button
            type="button"
            onClick={() => void ordersQuery.refetch()}
            className="text-primary underline underline-offset-4"
          >
            Try again
          </button>
        </div>
      ) : ordersQuery.data.length === 0 ? (
        <div className="glass-panel space-y-4 p-10 text-center">
          <ShoppingBag className="mx-auto size-9 text-primary" />
          <h2 className="text-2xl">No orders yet</h2>
          <p className="text-sm text-muted-foreground">
            Once you place an order, it will appear here along with its status.
          </p>
          <Link to="/shop" className="inline-flex">
            <GoldButton>Explore the collection</GoldButton>
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {ordersQuery.data.map((order) => (
            <article key={order._id} className="glass-panel p-5 sm:p-6">
              <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
                <div>
                  <p className="font-medium text-primary">
                    {order.orderNumber}
                  </p>
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
                  const category = item.categoryName || item.categorySlug;
                  const options = [
                    item.sku ? `SKU: ${item.sku}` : null,
                    category ? `Category: ${category}` : null,
                    item.size ? `Size: ${item.size}` : null,
                    item.color ? `Color: ${item.color}` : null,
                  ].filter(Boolean);

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
                        {options.length > 0 && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {options.join(" · ")}
                          </p>
                        )}
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
                    {order.paymentMethod === "razorpay"
                      ? `Razorpay · ${order.paymentStatus ?? "pending"}`
                      : "Cash on delivery"}
                  </p>
                  <p className="mt-1">
                    Delivering to: {order.shippingAddress}
                    {order.district ? `, ${order.district}` : ""}
                  </p>
                </div>
                <p className="text-lg text-primary">
                  Total: {formatINR(order.total)}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
