import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  ImagePlus,
  Loader2,
  Package,
  Pencil,
  Plus,
  ShoppingBag,
  Truck,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { GoldButton } from "@/components/section";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/context/auth-context";
import { formatINR } from "@/lib/format";
import {
  createAdminProduct,
  createAdminCategory,
  deleteAdminCategory,
  deleteAdminProduct,
  updateAdminProduct,
  listAdminOrders,
  listAdminProducts,
  getAdminDeliverySettings,
  updateAdminDeliveryCharge,
  updateOrderStatus,
  type OrderStatus,
  type AdminCategory,
  type AdminProduct,
} from "@/services/admin.service";
import { cn } from "@/lib/utils";
import { getCategories } from "@/services/shop.service";

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
  "shipped",
  "delivered",
  "cancelled",
];

const fieldClass =
  "w-full rounded border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary";

function localDateBoundary(value: string, nextDay = false) {
  const boundary = new Date(`${value}T00:00:00`);
  if (Number.isNaN(boundary.getTime())) {
    throw new Error("Invalid order date filter");
  }
  if (nextDay) boundary.setDate(boundary.getDate() + 1);
  return boundary.toISOString();
}

function AdminPage() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<"orders" | "products" | "delivery">("orders");
  const [orderStatusFilter, setOrderStatusFilter] = useState<
    OrderStatus | "all"
  >("all");
  const [orderDateFrom, setOrderDateFrom] = useState("");
  const [orderDateTo, setOrderDateTo] = useState("");
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(
    null,
  );
  const queryClient = useQueryClient();
  const orderFilters = {
    ...(orderStatusFilter !== "all" ? { status: orderStatusFilter } : {}),
    ...(orderDateFrom ? { from: localDateBoundary(orderDateFrom) } : {}),
    ...(orderDateTo ? { to: localDateBoundary(orderDateTo, true) } : {}),
  };
  const ordersQuery = useQuery({
    queryKey: ["admin-orders", orderFilters],
    queryFn: () => listAdminOrders(orderFilters),
    enabled: user?.role === "admin",
  });
  const productsQuery = useQuery({
    queryKey: ["admin-products"],
    queryFn: listAdminProducts,
    enabled: user?.role === "admin",
  });
  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
    enabled: user?.role === "admin",
  });
  const deliverySettingsQuery = useQuery({
    queryKey: ["admin-delivery-settings"],
    queryFn: getAdminDeliverySettings,
    enabled: user?.role === "admin",
  });

  const createProduct = useMutation({
    mutationFn: createAdminProduct,
    onMutate: () => setMutationError(null),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success("Product added");
    },
    onError: (error) => setMutationError(error.message),
  });
  const editProduct = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) =>
      updateAdminProduct(id, data),
    onMutate: () => setMutationError(null),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-products"] }),
        queryClient.invalidateQueries({ queryKey: ["products"] }),
        queryClient.invalidateQueries({ queryKey: ["home-collections"] }),
        queryClient.invalidateQueries({ queryKey: ["related"] }),
      ]);
      setEditingProduct(null);
      toast.success("Product updated");
    },
    onError: (error) => setMutationError(error.message),
  });
  const createCategory = useMutation({
    mutationFn: createAdminCategory,
    onMutate: () => setMutationError(null),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["categories"] }),
        queryClient.invalidateQueries({ queryKey: ["category-tree"] }),
      ]);
      toast.success("Category added");
    },
    onError: (error) => setMutationError(error.message),
  });
  const deleteCategory = useMutation({
    mutationFn: deleteAdminCategory,
    onMutate: () => setMutationError(null),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["categories"] }),
        queryClient.invalidateQueries({ queryKey: ["category-tree"] }),
      ]);
      toast.success("Category deleted");
    },
    onError: (error) => setMutationError(error.message),
  });
  const deleteProduct = useMutation({
    mutationFn: deleteAdminProduct,
    onMutate: () => setMutationError(null),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success("Product deleted");
    },
    onError: (error) => setMutationError(error.message),
  });
  const changeStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      updateOrderStatus(id, status),
    onMutate: () => setMutationError(null),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.success("Order status updated");
    },
    onError: (error) => setMutationError(error.message),
  });
  const saveDeliveryCharge = useMutation({
    mutationFn: updateAdminDeliveryCharge,
    onMutate: () => setMutationError(null),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["admin-delivery-settings"],
        }),
        queryClient.invalidateQueries({ queryKey: ["delivery-settings"] }),
      ]);
      toast.success("Delivery charge saved");
    },
    onError: (error) => setMutationError(error.message),
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
        <TabButton
          active={tab === "delivery"}
          onClick={() => setTab("delivery")}
        >
          <Truck className="size-4" /> Delivery
        </TabButton>
      </div>
      {mutationError && (
        <div role="alert" className="mb-5">
          <RequestError message={mutationError} />
        </div>
      )}

      {tab === "orders" ? (
        <section aria-labelledby="orders-heading">
          <h2 id="orders-heading" className="sr-only">
            Orders
          </h2>
          {ordersQuery.isPending ? (
            <Loading />
          ) : ordersQuery.isError ? (
            <RequestError message={ordersQuery.error.message} />
          ) : (
            <>
              <div className="mb-5 grid gap-4 border border-border p-4 sm:grid-cols-3">
                <label className="space-y-1.5 text-xs text-muted-foreground">
                  <span className="block uppercase tracking-[0.16em]">
                    Status
                  </span>
                  <select
                    value={orderStatusFilter}
                    onChange={(event) =>
                      setOrderStatusFilter(
                        event.target.value as OrderStatus | "all",
                      )
                    }
                    className={fieldClass}
                  >
                    <option value="all">All statuses</option>
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1.5 text-xs text-muted-foreground">
                  <span className="block uppercase tracking-[0.16em]">
                    From date
                  </span>
                  <input
                    type="date"
                    value={orderDateFrom}
                    max={orderDateTo || undefined}
                    onChange={(event) => setOrderDateFrom(event.target.value)}
                    className={fieldClass}
                  />
                </label>
                <label className="space-y-1.5 text-xs text-muted-foreground">
                  <span className="block uppercase tracking-[0.16em]">
                    To date
                  </span>
                  <input
                    type="date"
                    value={orderDateTo}
                    min={orderDateFrom || undefined}
                    onChange={(event) => setOrderDateTo(event.target.value)}
                    className={fieldClass}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setOrderStatusFilter("all");
                    setOrderDateFrom("");
                    setOrderDateTo("");
                  }}
                  disabled={
                    orderStatusFilter === "all" &&
                    !orderDateFrom &&
                    !orderDateTo
                  }
                  className="justify-self-start text-sm text-primary underline underline-offset-4 disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-3"
                >
                  Clear filters
                </button>
              </div>
              {ordersQuery.data.length === 0 ? (
                <EmptyState message="No orders match these filters." />
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
                          <p className="mt-1 text-xs text-muted-foreground">
                            Payment:{" "}
                            {order.paymentMethod === "razorpay"
                              ? `Razorpay · ${order.paymentStatus ?? "pending"}`
                              : "Cash on delivery"}
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
                        {order.shippingAddress}
                        {order.district ? `, ${order.district}` : ""}
                      </p>
                      <div className="mt-4 divide-y divide-border border-y border-border">
                        {order.items.map((item, index) => (
                          <div
                            key={`${item.productId}-${index}`}
                            className="flex justify-between gap-4 py-3 text-sm"
                          >
                            <span>
                              <span className="font-medium">
                                {item.name} × {item.quantity}
                              </span>
                              <span className="mt-1 block text-xs text-muted-foreground">
                                SKU: {item.sku || "Unavailable"} · Category:{" "}
                                {item.categorySlug || "Unavailable"}
                                {item.size ? ` · Size: ${item.size}` : ""}
                                {item.color ? ` · Color: ${item.color}` : ""}
                              </span>
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
            </>
          )}
        </section>
      ) : tab === "products" ? (
        <section className="grid items-start gap-8 lg:grid-cols-[minmax(280px,0.8fr)_1.2fr]">
          <ProductForm
            busy={createProduct.isPending}
            categories={categoriesQuery.data ?? []}
            categoriesLoading={categoriesQuery.isPending}
            categoriesError={categoriesQuery.error?.message}
            categoryBusy={createCategory.isPending}
            categoryDeleteBusy={deleteCategory.isPending}
            onCreateCategory={(category) =>
              createCategory.mutateAsync(category)
            }
            onDeleteCategory={(id) => deleteCategory.mutateAsync(id)}
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
                          : `${(import.meta.env["BACKEND_API_URL"] ?? "http://localhost:4000").replace(/\/$/, "")}${product.imageUrl}`
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
                      aria-label={`Edit ${product.name}`}
                      title={`Edit ${product.name}`}
                      onClick={() => setEditingProduct(product)}
                      className="self-start p-2 text-muted-foreground hover:text-primary"
                    >
                      <Pencil className="size-4" />
                    </button>
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
      ) : (
        <DeliverySettingsPanel
          isPending={deliverySettingsQuery.isPending}
          isError={deliverySettingsQuery.isError}
          errorMessage={deliverySettingsQuery.error?.message}
          deliveryCharge={deliverySettingsQuery.data?.deliveryCharge ?? null}
          freeDeliveryThreshold={
            deliverySettingsQuery.data?.freeDeliveryThreshold
          }
          busy={saveDeliveryCharge.isPending}
          onSave={(charge) => saveDeliveryCharge.mutate(charge)}
        />
      )}
      <EditProductDialog
        product={editingProduct}
        categories={categoriesQuery.data ?? []}
        busy={editProduct.isPending}
        onOpenChange={(open) => {
          if (!open && !editProduct.isPending) setEditingProduct(null);
        }}
        onSubmit={async (id, data) => {
          try {
            await editProduct.mutateAsync({ id, data });
          } catch {
            // The mutation reports its error to the user.
          }
        }}
      />
    </div>
  );
}

function DeliverySettingsPanel({
  isPending,
  isError,
  errorMessage,
  deliveryCharge,
  freeDeliveryThreshold,
  busy,
  onSave,
}: {
  isPending: boolean;
  isError: boolean;
  errorMessage?: string | undefined;
  deliveryCharge: number | null;
  freeDeliveryThreshold?: number | undefined;
  busy: boolean;
  onSave: (charge: number) => void;
}) {
  const [charge, setCharge] = useState("");

  useEffect(() => {
    setCharge(deliveryCharge === null ? "" : String(deliveryCharge));
  }, [deliveryCharge]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedCharge = Number(charge);
    if (!Number.isFinite(parsedCharge) || parsedCharge < 0) return;
    onSave(parsedCharge);
  };

  return (
    <section className="max-w-xl">
      <form
        onSubmit={handleSubmit}
        className="glass-panel space-y-5 p-5 sm:p-6"
      >
        <div>
          <p className="eyebrow">Delivery pricing</p>
          <h2 className="mt-2 text-2xl">Flat delivery charge</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This charge applies to all customer orders below the free-delivery
            threshold.
          </p>
        </div>
        {isPending ? (
          <Loading />
        ) : isError ? (
          <RequestError
            message={errorMessage ?? "Unable to load delivery settings"}
          />
        ) : (
          <>
            {deliveryCharge === null && (
              <p className="text-sm text-destructive">
                No delivery charge is configured. Checkout will remain
                unavailable until you save one.
              </p>
            )}
            <label className="block space-y-1.5">
              <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Delivery charge (₹)
              </span>
              <input
                type="number"
                min="0"
                max="100000"
                step="1"
                required
                value={charge}
                onChange={(event) => setCharge(event.target.value)}
                className={fieldClass}
              />
            </label>
            {freeDeliveryThreshold !== undefined && (
              <p className="text-xs text-muted-foreground">
                Orders of {formatINR(freeDeliveryThreshold)} or more receive
                free delivery.
              </p>
            )}
            <GoldButton type="submit" disabled={busy || charge.trim() === ""}>
              {busy ? "Saving…" : "Save delivery charge"}
            </GoldButton>
          </>
        )}
      </form>
    </section>
  );
}

function ProductForm({
  busy,
  categories,
  categoriesLoading,
  categoriesError,
  categoryBusy,
  categoryDeleteBusy,
  onCreateCategory,
  onDeleteCategory,
  onSubmit,
}: {
  busy: boolean;
  categories: AdminCategory[];
  categoriesLoading: boolean;
  categoriesError?: string | undefined;
  categoryBusy: boolean;
  categoryDeleteBusy: boolean;
  onCreateCategory: (category: { name: string }) => Promise<AdminCategory>;
  onDeleteCategory: (id: string) => Promise<unknown>;
  onSubmit: (data: FormData) => Promise<boolean>;
}) {
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [categorySlug, setCategorySlug] = useState("");
  const [categoryName, setCategoryName] = useState("");

  useEffect(() => {
    if (
      categorySlug &&
      !categories.some((category) => category.slug === categorySlug)
    ) {
      setCategorySlug(categories[0]?.slug ?? "");
    } else if (!categorySlug && categories[0]) {
      setCategorySlug(categories[0].slug);
    }
  }, [categorySlug, categories]);

  const addCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const category = await onCreateCategory({ name: categoryName });
      setCategorySlug(category.slug);
      setCategoryName("");
      setCategoryDialogOpen(false);
    } catch {
      // The mutation reports its error to the user.
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    if (await onSubmit(new FormData(form))) form.reset();
  };

  return (
    <div className="glass-panel space-y-4 p-5 sm:p-6">
      <div>
        <p className="eyebrow">Inventory</p>
        <h2 className="mt-2 text-2xl">Add a product</h2>
        <p className="mt-2 text-xs text-muted-foreground">
          Select an image to upload. The API stores the file and saves only its
          URL in MongoDB.
        </p>
      </div>
      <Field label="Category">
        <select
          className={fieldClass}
          value={categorySlug}
          required
          disabled={categoriesLoading || categories.length === 0}
          onChange={(event) => {
            if (event.target.value === "__add_category__") {
              setCategoryDialogOpen(true);
              return;
            }
            setCategorySlug(event.target.value);
          }}
        >
          <option value="">Select category</option>
          {categories.map((category) => (
            <option key={category.id} value={category.slug}>
              {category.name}
            </option>
          ))}
          <option value="__add_category__">+ Add category</option>
        </select>
      </Field>
      {categoriesError ? (
        <RequestError message={categoriesError} />
      ) : categories.length === 0 && !categoriesLoading ? (
        <p className="text-sm text-muted-foreground">
          Add a category before creating products.
        </p>
      ) : null}
      <div className="border border-border p-4">
        <div className="mt-4 border-t border-border pt-4">
          <p className="mb-3 text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Categories ({categories.length})
          </p>
          {categories.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {categories.map((category) => (
                <li
                  key={category.id}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span>{category.name}</span>
                  <button
                    type="button"
                    aria-label={`Delete ${category.name} category`}
                    title={`Delete ${category.name}`}
                    disabled={categoryDeleteBusy}
                    onClick={() => {
                      if (
                        window.confirm(
                          `Delete the "${category.name}" category? Categories used by products cannot be deleted.`,
                        )
                      ) {
                        void onDeleteCategory(category.id).catch(() => {});
                      }
                    }}
                    className="p-1 text-muted-foreground hover:text-destructive disabled:opacity-50"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No categories created yet.
            </p>
          )}
          <button
            type="button"
            onClick={() => setCategoryDialogOpen(true)}
            className="mt-4 inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <Plus className="size-4" /> Add category
          </button>
        </div>
      </div>
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a category</DialogTitle>
            <DialogDescription>
              Enter a name to save a new category.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={addCategory} className="space-y-4">
            <Field label="Category name">
              <input
                autoFocus
                value={categoryName}
                onChange={(event) => setCategoryName(event.target.value)}
                required
                maxLength={80}
                className={fieldClass}
              />
            </Field>
            <GoldButton type="submit" disabled={categoryBusy}>
              {categoryBusy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              Save category
            </GoldButton>
          </form>
        </DialogContent>
      </Dialog>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Product name">
          <input name="name" required maxLength={160} className={fieldClass} />
        </Field>
        <input type="hidden" name="categorySlug" value={categorySlug} />
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
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Sizes, comma-separated (optional)">
            <input
              name="sizes"
              placeholder="One size, 2.4, 2.6"
              className={fieldClass}
            />
          </Field>
          <Field label="Colours, comma-separated (optional)">
            <input
              name="colors"
              placeholder="Gold, Ruby"
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
    </div>
  );
}

function EditProductDialog({
  product,
  categories,
  busy,
  onOpenChange,
  onSubmit,
}: {
  product: AdminProduct | null;
  categories: AdminCategory[];
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (id: string, data: FormData) => Promise<void>;
}) {
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity() || !product) return;
    const data = new FormData(form);
    if (!data.has("featured")) data.set("featured", "false");
    await onSubmit(product.id, data);
  };

  const imageUrl = product
    ? product.imageUrl.startsWith("http")
      ? product.imageUrl
      : `${(import.meta.env["BACKEND_API_URL"] ?? "http://localhost:4000").replace(/\/$/, "")}${product.imageUrl}`
    : "";

  return (
    <Dialog open={product !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        {product ? (
          <>
            <DialogHeader>
              <DialogTitle>Edit product</DialogTitle>
              <DialogDescription>
                Update the product details. Choose a new image only if you want
                to replace the current one.
              </DialogDescription>
            </DialogHeader>
            <form
              key={product.id}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <Field label="Product name">
                <input
                  name="name"
                  required
                  maxLength={160}
                  defaultValue={product.name}
                  className={fieldClass}
                />
              </Field>
              <Field label="SKU">
                <input
                  name="sku"
                  required
                  maxLength={40}
                  defaultValue={product.sku}
                  className={fieldClass}
                />
              </Field>
              <Field label="Category">
                <select
                  name="categorySlug"
                  required
                  defaultValue={product.categorySlug}
                  className={fieldClass}
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.slug}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Description">
                <textarea
                  name="description"
                  required
                  maxLength={5000}
                  rows={3}
                  defaultValue={product.description}
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
                    defaultValue={product.price}
                    className={fieldClass}
                  />
                </Field>
                <Field label="Sale price (₹)">
                  <input
                    name="salePrice"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={product.salePrice ?? ""}
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
                    defaultValue={product.stock}
                    className={fieldClass}
                  />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Sizes, comma-separated (optional)">
                  <input
                    name="sizes"
                    defaultValue={product.sizes.join(", ")}
                    className={fieldClass}
                  />
                </Field>
                <Field label="Colours, comma-separated (optional)">
                  <input
                    name="colors"
                    defaultValue={product.colors.join(", ")}
                    className={fieldClass}
                  />
                </Field>
              </div>
              <Field label="Product image (optional, JPG, PNG, or WebP; max 5 MB)">
                <div className="flex items-center gap-3">
                  <img
                    src={imageUrl}
                    alt=""
                    className="size-16 shrink-0 object-cover"
                  />
                  <input
                    name="image"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="min-w-0 text-sm text-muted-foreground file:mr-3 file:border file:border-input file:bg-background file:px-3 file:py-2 file:text-foreground"
                  />
                </div>
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input
                  name="featured"
                  type="checkbox"
                  value="true"
                  defaultChecked={product.featured}
                  className="accent-primary"
                />
                Feature this product
              </label>
              <GoldButton type="submit" disabled={busy} className="w-full">
                {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                Save changes
              </GoldButton>
            </form>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
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
