import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent, type ReactNode } from "react";
import { ImagePlus, Loader2, Package, ShoppingBag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { GoldButton } from "@/components/section";
import { useAuth } from "@/context/auth-context";
import { formatINR } from "@/lib/format";
import {
  createAdminProduct,
  deleteAdminProduct,
  listAdminOrders,
  listAdminProducts,
  updateOrderStatus,
  type OrderStatus,
} from "@/services/admin.service";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard | YUDHAS FASHION" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

const statuses: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

const fieldClass =
  "w-full rounded border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary";

function AdminPage() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<"orders" | "products">("orders");
  const queryClient = useQueryClient();
  const ordersQuery = useQuery({
    queryKey: ["admin-orders"],
    queryFn: listAdminOrders,
    enabled: user?.role === "admin",
  });
  const productsQuery = useQuery({
    queryKey: ["admin-products"],
    queryFn: listAdminProducts,
    enabled: user?.role === "admin",
  });

  const createProduct = useMutation({
    mutationFn: createAdminProduct,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success("Product added");
    },
    onError: (error) => toast.error(error.message),
  });
  const deleteProduct = useMutation({
    mutationFn: deleteAdminProduct,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success("Product deleted");
    },
    onError: (error) => toast.error(error.message),
  });
  const changeStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      updateOrderStatus(id, status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.success("Order status updated");
    },
    onError: (error) => toast.error(error.message),
  });

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 text-center text-muted-foreground">
        Loading account…
      </div>
    );
  }
  if (!user) {
    return (
      <AccessMessage
        title="Sign in to continue"
        detail="You need an administrator account to access order and product management."
      >
        <Link to="/auth" search={{ redirect: "/admin" }}>
          <GoldButton>Sign in</GoldButton>
        </Link>
      </AccessMessage>
    );
  }
  if (user.role !== "admin") {
    return (
      <AccessMessage
        title="Administrator access required"
        detail="This dashboard is only available to the Yudhas Fashion administrator."
      >
        <Link
          to="/account"
          className="text-sm text-primary underline underline-offset-4"
        >
          Back to your account
        </Link>
      </AccessMessage>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Yudhas Circle</p>
          <h1 className="mt-2 text-4xl">Admin dashboard</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Signed in as {user.email}
          </p>
        </div>
        <Link
          to="/account"
          className="text-sm text-primary underline underline-offset-4"
        >
          My account
        </Link>
      </header>

      <div className="mb-8 flex gap-2 border-b border-border">
        <TabButton active={tab === "orders"} onClick={() => setTab("orders")}>
          <ShoppingBag className="size-4" /> Orders
        </TabButton>
        <TabButton
          active={tab === "products"}
          onClick={() => setTab("products")}
        >
          <Package className="size-4" /> Products
        </TabButton>
      </div>

      {tab === "orders" ? (
        <section aria-labelledby="orders-heading">
          <h2 id="orders-heading" className="sr-only">
            Orders
          </h2>
          {ordersQuery.isPending ? (
            <Loading />
          ) : ordersQuery.isError ? (
            <RequestError message={ordersQuery.error.message} />
          ) : ordersQuery.data.length === 0 ? (
            <EmptyState message="No orders yet. Customer orders will appear here." />
          ) : (
            <div className="space-y-4">
              {ordersQuery.data.map((order) => (
                <article key={order._id} className="glass-panel p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-primary">
                        {order.orderNumber}
                      </p>
                      <p className="mt-1 text-sm">
                        {order.customerName} · {order.customerEmail}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(order.createdAt).toLocaleString()} ·{" "}
                        {order.phone}
                      </p>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      Status
                      <select
                        value={order.status}
                        disabled={changeStatus.isPending}
                        onChange={(event) =>
                          changeStatus.mutate({
                            id: order._id,
                            status: event.target.value as OrderStatus,
                          })
                        }
                        className={fieldClass}
                      >
                        {statuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <p className="mt-4 whitespace-pre-wrap text-sm text-muted-foreground">
                    {order.shippingAddress}, {order.district}
                  </p>
                  <div className="mt-4 divide-y divide-border border-y border-border">
                    {order.items.map((item, index) => (
                      <div
                        key={`${item.productId}-${index}`}
                        className="flex justify-between gap-4 py-3 text-sm"
                      >
                        <span>
                          {item.name} × {item.quantity}
                        </span>
                        <span>{formatINR(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 text-right text-lg text-primary">
                    Total: {formatINR(order.total)}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="grid items-start gap-8 lg:grid-cols-[minmax(280px,0.8fr)_1.2fr]">
          <ProductForm
            busy={createProduct.isPending}
            onSubmit={async (data) => {
              try {
                await createProduct.mutateAsync(data);
                return true;
              } catch {
                return false;
              }
            }}
          />
          <div>
            <h2 className="mb-4 text-2xl">
              Products ({productsQuery.data?.length ?? 0})
            </h2>
            {productsQuery.isPending ? (
              <Loading />
            ) : productsQuery.isError ? (
              <RequestError message={productsQuery.error.message} />
            ) : productsQuery.data.length === 0 ? (
              <EmptyState message="No products have been added yet." />
            ) : (
              <div className="space-y-3">
                {productsQuery.data.map((product) => (
                  <article
                    key={product.id}
                    className="glass-panel flex gap-4 p-4"
                  >
                    <img
                      src={
                        product.imageUrl.startsWith("http")
                          ? product.imageUrl
                          : `${(import.meta.env["VITE_API_URL"] ?? "http://localhost:4000").replace(/\/$/, "")}${product.imageUrl}`
                      }
                      alt=""
                      className="size-20 shrink-0 object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-medium">{product.name}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {product.sku} · {product.categorySlug}
                      </p>
                      <p className="mt-2 text-sm text-primary">
                        {formatINR(product.salePrice ?? product.price)} · Stock{" "}
                        {product.stock}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Delete ${product.name}`}
                      disabled={deleteProduct.isPending}
                      onClick={() => {
                        if (window.confirm(`Delete ${product.name}?`))
                          deleteProduct.mutate(product.id);
                      }}
                      className="self-start p-2 text-muted-foreground hover:text-destructive disabled:opacity-50"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function ProductForm({
  busy,
  onSubmit,
}: {
  busy: boolean;
  onSubmit: (data: FormData) => Promise<boolean>;
}) {
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    if (await onSubmit(new FormData(form))) form.reset();
  };

  return (
    <form onSubmit={handleSubmit} className="glass-panel space-y-4 p-5 sm:p-6">
      <div>
        <p className="eyebrow">Inventory</p>
        <h2 className="mt-2 text-2xl">Add a product</h2>
        <p className="mt-2 text-xs text-muted-foreground">
        </p>
      </div>
      <Field label="Product name">
        <input name="name" required maxLength={160} className={fieldClass} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Category">
          <select
            name="categorySlug"
            required
            className={fieldClass}
            defaultValue="jewellery"
          >
            <option value="jewellery">Jewellery</option>
            <option value="earrings">Earrings</option>
            <option value="necklaces">Necklaces</option>
            <option value="bangles">Bangles</option>
          </select>
        </Field>
      </div>
      <Field label="Short description">
        <input
          name="shortDescription"
          required
          maxLength={240}
          className={fieldClass}
        />
      </Field>
      <Field label="Description">
        <textarea
          name="description"
          required
          maxLength={5000}
          rows={3}
          className={fieldClass}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Price (₹)">
          <input
            name="price"
            type="number"
            min="0"
            step="0.01"
            required
            className={fieldClass}
          />
        </Field>
        <Field label="Sale price (₹)">
          <input
            name="salePrice"
            type="number"
            min="0"
            step="0.01"
            className={fieldClass}
          />
        </Field>
        <Field label="Stock">
          <input
            name="stock"
            type="number"
            min="0"
            step="1"
            required
            defaultValue="0"
            className={fieldClass}
          />
        </Field>
      </div>
      <Field label="Product image (JPG, PNG, or WebP; max 5 MB)">
        <label className="flex cursor-pointer items-center gap-3 border border-dashed border-input px-3 py-3 text-sm text-muted-foreground hover:border-primary">
          <ImagePlus className="size-5 text-primary" />
          <span>Select an image to upload</span>
          <input
            name="image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            required
            className="sr-only"
          />
        </label>
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input
          name="featured"
          type="checkbox"
          value="true"
          className="accent-primary"
        />
        Feature this product
      </label>
      <GoldButton type="submit" disabled={busy} className="w-full">
        {busy ? <Loader2 className="size-4 animate-spin" /> : null}
        Add product
      </GoldButton>
    </form>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm",
        active
          ? "border-primary text-primary"
          : "border-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function AccessMessage({
  title,
  detail,
  children,
}: {
  title: string;
  detail: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-5 text-center">
      <h1 className="text-3xl">{title}</h1>
      <p className="mt-3 text-sm text-muted-foreground">{detail}</p>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function Loading() {
  return (
    <div className="py-12 text-center text-sm text-muted-foreground">
      Loading…
    </div>
  );
}

function RequestError({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="border border-destructive/40 p-4 text-sm text-destructive"
    >
      {message}
    </p>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="glass-panel p-8 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}
