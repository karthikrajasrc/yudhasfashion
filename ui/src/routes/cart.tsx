import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { GoldButton } from "@/components/section";
import { useShop } from "@/context/shop-context";
import { effectivePrice, formatINR } from "@/lib/format";
import {
  getDeliveryQuote,
  getDeliverySettings,
  validateCoupon,
} from "@/services/shop.service";
import { useAuth } from "@/context/auth-context";
import { createOrder } from "@/services/admin.service";
import {
  createRazorpayOrder,
  loadRazorpay,
  verifyRazorpayPayment,
} from "@/services/payment.service";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your Bag | YUDHAS FASHION" },
      {
        name: "description",
        content:
          "Review your Yudhas Fashion bag, apply coupons and see delivery charges.",
      },
      { property: "og:title", content: "Your Bag | YUDHAS FASHION" },
      {
        property: "og:description",
        content: "Review your selections before checkout.",
      },
    ],
  }),
  component: Cart,
});

function Cart() {
  const { cart, setQuantity, removeFromCart, cartCount, clearCart } = useShop();
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [coupon, setCoupon] = useState<{
    code: string;
    discount: number;
  } | null>(null);
  const [customerName, setCustomerName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [placingOrder, setPlacingOrder] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<
    "razorpay" | "cash_on_delivery"
  >("razorpay");

  useEffect(() => {
    if (user && !customerName) setCustomerName(user.name);
  }, [user, customerName]);

  const deliverySettingsQuery = useQuery({
    queryKey: ["delivery-settings"],
    queryFn: getDeliverySettings,
  });

  const subtotal = cart.reduce(
    (sum, l) => sum + effectivePrice(l.price, l.salePrice) * l.quantity,
    0,
  );
  const savings = cart.reduce(
    (sum, l) =>
      sum + (l.price - effectivePrice(l.price, l.salePrice)) * l.quantity,
    0,
  );

  const quote = getDeliveryQuote(subtotal, deliverySettingsQuery.data);

  const delivery = quote?.charge ?? 0;
  const couponDiscount = coupon?.discount ?? 0;
  const total = quote
    ? Math.max(0, subtotal - couponDiscount + delivery)
    : null;

  const placeOrder = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;
    setActionError(null);
    setPlacingOrder(true);
    try {
      const orderDetails = {
        customerName,
        phone,
        shippingAddress,
        ...(coupon ? { couponCode: coupon.code } : {}),
        items: cart.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
          ...(line.size ? { size: line.size } : {}),
          ...(line.color ? { color: line.color } : {}),
        })),
      };
      if (paymentMethod === "cash_on_delivery") {
        const result = await createOrder(orderDetails);
        toast.success(`Order ${result.order.orderNumber} placed`, {
          description: "Your order has been sent to Yudhas Fashion.",
        });
        clearCart();
        setCoupon(null);
        setPlacingOrder(false);
        return;
      }

      const paymentOrder = await createRazorpayOrder(orderDetails);
      await loadRazorpay();
      if (!window.Razorpay) {
        throw new Error("Razorpay checkout could not be initialized");
      }
      const checkout = new window.Razorpay({
        key: paymentOrder.keyId,
        amount: paymentOrder.order.amount,
        currency: paymentOrder.order.currency,
        name: "Yudhas Fashion",
        description: `Order ${paymentOrder.orderNumber}`,
        order_id: paymentOrder.order.id,
        prefill: {
          name: customerName,
          email: user.email,
          contact: phone,
        },
        theme: { color: "#c6a15b" },
        handler: (response) => {
          void verifyRazorpayPayment(response)
            .then((result) => {
              if (result.paymentStatus === "captured") {
                toast.success(`Payment received for ${result.orderNumber}`);
                clearCart();
                setCoupon(null);
              } else {
                toast.info(
                  result.message ?? "Payment is processing. Please wait.",
                );
              }
            })
            .catch((error: unknown) => {
              setActionError(
                error instanceof Error
                  ? error.message
                  : "An unexpected server error occurred",
              );
            })
            .finally(() => setPlacingOrder(false));
        },
        modal: {
          ondismiss: () => setPlacingOrder(false),
        },
      });
      checkout.on("payment.failed", (response) => {
        setActionError(
          response.error?.description ?? "Payment failed. Please try again.",
        );
        setPlacingOrder(false);
      });
      checkout.open();
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "An unexpected server error occurred",
      );
      setPlacingOrder(false);
    }
  };

  const applyCoupon = async () => {
    setActionError(null);
    const result = await validateCoupon(code, subtotal);
    if (!result.ok) {
      setCoupon(null);
      setActionError(result.message);
      return;
    }
    setCoupon({ code: result.code, discount: result.discount });
    toast.success(`${result.code} applied`, {
      description: `You saved ${formatINR(result.discount)}`,
    });
  };

  if (cartCount === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-28 text-center">
        <ShoppingBag className="mx-auto size-10 text-primary" />
        <h1 className="mt-6 text-3xl">Your bag is empty</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Discover handcrafted jewellery and silks made to be worn for years.
        </p>
        <Link to="/shop" className="mt-8 inline-flex">
          <GoldButton>Start shopping</GoldButton>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
      <header className="mb-10">
        <p className="eyebrow">Shopping Bag</p>
        <h1 className="mt-3 text-4xl">Your Bag ({cartCount})</h1>
      </header>

      <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
        <div className="divide-y divide-border border-y border-border">
          {cart.map((line) => {
            const unit = effectivePrice(line.price, line.salePrice);
            return (
              <div
                key={`${line.productId}-${line.size}-${line.color}`}
                className="flex gap-4 py-6"
              >
                <Link
                  to="/product/$slug"
                  params={{ slug: line.slug }}
                  className="shrink-0"
                >
                  <img
                    src={line.image}
                    alt={line.name}
                    loading="lazy"
                    width={900}
                    height={1100}
                    className="aspect-4/5 w-24 border border-border object-cover"
                  />
                </Link>
                <div className="flex flex-1 flex-col gap-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link
                        to="/product/$slug"
                        params={{ slug: line.slug }}
                        className="font-display text-lg hover:text-primary"
                      >
                        {line.name}
                      </Link>
                      <p className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
                        {[line.size, line.color].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        removeFromCart(line.productId, line.size, line.color)
                      }
                      aria-label="Remove"
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
                    <div className="inline-flex items-center border border-border">
                      <button
                        onClick={() =>
                          setQuantity(
                            line.productId,
                            line.quantity - 1,
                            line.size,
                            line.color,
                          )
                        }
                        className="px-3 py-2"
                        aria-label="Decrease"
                      >
                        <Minus className="size-3.5" />
                      </button>
                      <span className="w-9 text-center text-sm">
                        {line.quantity}
                      </span>
                      <button
                        onClick={() =>
                          setQuantity(
                            line.productId,
                            line.quantity + 1,
                            line.size,
                            line.color,
                          )
                        }
                        className="px-3 py-2"
                        aria-label="Increase"
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                    <div className="text-right">
                      <p className="text-primary">
                        {formatINR(unit * line.quantity)}
                      </p>
                      {line.salePrice && (
                        <p className="text-xs text-muted-foreground line-through">
                          {formatINR(line.price * line.quantity)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <aside className="space-y-6">
          <div className="glass-panel space-y-4 p-6">
            <h2 className="eyebrow">Order Summary</h2>
            <Row label="Subtotal" value={formatINR(subtotal)} />
            {savings > 0 && (
              <Row
                label="Product discount"
                value={`− ${formatINR(savings)}`}
                accent
              />
            )}
            {coupon && (
              <Row
                label={`Coupon ${coupon.code}`}
                value={`− ${formatINR(coupon.discount)}`}
                accent
              />
            )}
            {actionError && (
              <p role="alert" className="text-sm text-destructive">
                {actionError}
              </p>
            )}
            <Row
              label="Delivery charge"
              value={
                quote
                  ? quote.freeDelivery
                    ? "Free"
                    : formatINR(delivery)
                  : deliverySettingsQuery.isError
                    ? "Unavailable"
                    : "Not configured"
              }
            />
            {deliverySettingsQuery.isError && (
              <p role="alert" className="text-xs text-destructive">
                {deliverySettingsQuery.error.message}
              </p>
            )}
            <div className="hairline" />
            <div className="flex items-baseline justify-between">
              <span className="text-sm tracking-[0.16em] uppercase">
                Grand total
              </span>
              <span className="text-2xl text-primary">
                {total === null ? "—" : formatINR(total)}
              </span>
            </div>
            {quote && !quote.freeDelivery && (
              <p className="text-xs text-muted-foreground">
                Add {formatINR(Math.max(0, quote.threshold - subtotal))} more
                for free delivery.
              </p>
            )}
          </div>

          {user ? (
            <form
              onSubmit={placeOrder}
              className="space-y-4 border border-border p-5"
            >
              <h2 className="eyebrow">Delivery details</h2>
              <label className="block space-y-1.5">
                <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Full name
                </span>
                <input
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  required
                  maxLength={100}
                  autoComplete="name"
                  className="w-full border border-input bg-transparent px-3 py-2.5 text-sm outline-none focus:border-primary"
                />
              </label>
              <p className="text-xs text-muted-foreground">
                Order confirmation: {user.email}
              </p>
              <label className="block space-y-1.5">
                <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Phone
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  required
                  minLength={7}
                  maxLength={30}
                  autoComplete="tel"
                  className="w-full border border-input bg-transparent px-3 py-2.5 text-sm outline-none focus:border-primary"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Shipping address
                </span>
                <textarea
                  value={shippingAddress}
                  onChange={(event) => setShippingAddress(event.target.value)}
                  required
                  minLength={5}
                  maxLength={1000}
                  autoComplete="street-address"
                  rows={3}
                  className="w-full border border-input bg-transparent px-3 py-2.5 text-sm outline-none focus:border-primary"
                />
              </label>
              <fieldset className="space-y-2">
                <legend className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Payment method
                </legend>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="razorpay"
                    checked={paymentMethod === "razorpay"}
                    onChange={() => setPaymentMethod("razorpay")}
                    className="accent-primary"
                  />
                  Pay online with Razorpay
                </label>
              </fieldset>
              <GoldButton
                type="submit"
                className="w-full"
                disabled={placingOrder || !quote || cart.length === 0}
              >
                {placingOrder
                  ? "Processing…"
                  : paymentMethod === "razorpay"
                    ? "Pay securely"
                    : "Place order"}
              </GoldButton>
            </form>
          ) : (
            <div className="space-y-3 border border-border p-5 text-center">
              <p className="text-sm text-muted-foreground">
                Sign in to place your order.
              </p>
              <Link
                to="/auth"
                search={{ redirect: "/cart" }}
                className="inline-flex"
              >
                <GoldButton type="button">Sign in to checkout</GoldButton>
              </Link>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={accent ? "text-accent" : ""}>{value}</span>
    </div>
  );
}
