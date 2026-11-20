import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { ArrowLeft, CheckCircle2, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { GoldButton } from "@/components/section";
import { useAuth } from "@/context/auth-context";
import { useShop } from "@/context/shop-context";
import { effectivePrice, formatINR } from "@/lib/format";
import {
  getDeliveryQuote,
  getDeliverySettings,
} from "@/services/shop.service";
import {
  createRazorpayOrder,
  getRazorpayPaymentStatus,
  loadRazorpay,
  verifyRazorpayPayment,
} from "@/services/payment.service";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout | YUDHAS FASHION" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Checkout,
});

function Checkout() {
  const { user } = useAuth();
  const { cart, cartCount, clearCart } = useShop();
  const [customerName, setCustomerName] = useState(user?.name ?? "");
  const [customerEmail, setCustomerEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmedOrderNumber, setConfirmedOrderNumber] = useState<
    string | null
  >(null);
  const activePaymentOrderId = useRef<string | null>(null);
  const completedPayment = useRef(false);
  const statusCheckInProgress = useRef(false);
  const paymentPageWasHidden = useRef(false);

  useEffect(() => {
    if (user && !customerName) setCustomerName(user.name);
    if (user && !customerEmail) setCustomerEmail(user.email);
  }, [user, customerName, customerEmail]);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("yf.checkoutCoupon");
      if (saved) setCoupon(JSON.parse(saved));
    } catch {
      setCoupon(null);
    }
  }, []);

  const finishPayment = useCallback(
    (orderNumber: string) => {
      if (completedPayment.current) return;
      completedPayment.current = true;
      activePaymentOrderId.current = null;
      setConfirmedOrderNumber(orderNumber);
      setPlacingOrder(false);
      clearCart();
      sessionStorage.removeItem("yf.checkoutCoupon");
      sessionStorage.removeItem("yf.activePaymentOrderId");
      setCoupon(null);
      toast.success(`Payment received for ${orderNumber}`);
    },
    [clearCart],
  );

  const reconcilePaymentStatus = useCallback(
    async (razorpayOrderId: string) => {
      if (statusCheckInProgress.current || completedPayment.current) return;
      statusCheckInProgress.current = true;
      let lastError: unknown;
      try {
        for (let attempt = 0; attempt < 4; attempt += 1) {
          if (attempt > 0) {
            await new Promise((resolve) => window.setTimeout(resolve, 2000));
          }
          if (completedPayment.current) return;
          try {
            const result = await getRazorpayPaymentStatus(razorpayOrderId);
            if (result.paymentStatus === "captured") {
              finishPayment(result.orderNumber);
              return;
            }
            if (result.paymentStatus === "failed") {
              activePaymentOrderId.current = null;
              sessionStorage.removeItem("yf.activePaymentOrderId");
              setActionError("Payment was not successful. You can try again.");
              setPlacingOrder(false);
              return;
            }
          } catch (error) {
            lastError = error;
          }
        }
        setActionError(
          lastError instanceof Error
            ? `Payment confirmation is taking longer than expected. Check your order status before trying again. ${lastError.message}`
            : "Payment confirmation is taking longer than expected. Check your order status before trying again.",
        );
        setPlacingOrder(false);
      } finally {
        statusCheckInProgress.current = false;
      }
    },
    [finishPayment],
  );

  useEffect(() => {
    const recoverAfterAppSwitch = () => {
      if (document.visibilityState === "hidden") {
        paymentPageWasHidden.current = true;
        return;
      }
      if (!paymentPageWasHidden.current) return;
      paymentPageWasHidden.current = false;
      const orderId = activePaymentOrderId.current;
      if (orderId) void reconcilePaymentStatus(orderId);
    };

    document.addEventListener("visibilitychange", recoverAfterAppSwitch);
    window.addEventListener("focus", recoverAfterAppSwitch);
    return () => {
      document.removeEventListener("visibilitychange", recoverAfterAppSwitch);
      window.removeEventListener("focus", recoverAfterAppSwitch);
    };
  }, [reconcilePaymentStatus]);

  useEffect(() => {
    const savedOrderId = sessionStorage.getItem("yf.activePaymentOrderId");
    if (!savedOrderId) return;
    activePaymentOrderId.current = savedOrderId;
    setPlacingOrder(true);
    void reconcilePaymentStatus(savedOrderId);
  }, [reconcilePaymentStatus]);

  const deliverySettingsQuery = useQuery({
    queryKey: ["delivery-settings"],
    queryFn: getDeliverySettings,
  });

  const subtotal = cart.reduce(
    (sum, line) =>
      sum + effectivePrice(line.price, line.salePrice) * line.quantity,
    0,
  );
  const quote = getDeliveryQuote(subtotal, deliverySettingsQuery.data);
  const total = quote
    ? Math.max(0, subtotal - (coupon?.discount ?? 0) + quote.charge)
    : null;

  const placeOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionError(null);
    setConfirmedOrderNumber(null);
    completedPayment.current = false;
    setPlacingOrder(true);
    try {
      const paymentOrder = await createRazorpayOrder({
        customerName,
        customerEmail,
        phone,
        shippingAddress,
        city,
        state,
        pincode,
        ...(coupon ? { couponCode: coupon.code } : {}),
        items: cart.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
          ...(line.size ? { size: line.size } : {}),
          ...(line.color ? { color: line.color } : {}),
        })),
      });
      activePaymentOrderId.current = paymentOrder.order.id;
      sessionStorage.setItem("yf.activePaymentOrderId", paymentOrder.order.id);
      await loadRazorpay();
      if (!window.Razorpay) throw new Error("Razorpay checkout could not be initialized");

      const checkout = new window.Razorpay({
        key: paymentOrder.keyId,
        amount: paymentOrder.order.amount,
        currency: paymentOrder.order.currency,
        name: "Yudhas Fashion",
        description: `Order ${paymentOrder.orderNumber}`,
        order_id: paymentOrder.order.id,
        prefill: {
          name: customerName,
          email: customerEmail,
          contact: phone,
        },
        theme: { color: "#c6a15b" },
        handler: (response) => {
          void verifyRazorpayPayment(response)
            .then((result) => {
              if (result.paymentStatus === "captured") {
                finishPayment(result.orderNumber);
                return;
              }
              void reconcilePaymentStatus(paymentOrder.order.id);
            })
            .catch(() => {
              void reconcilePaymentStatus(paymentOrder.order.id);
            });
        },
        modal: {
          ondismiss: () => void reconcilePaymentStatus(paymentOrder.order.id),
        },
      });
      checkout.on("payment.failed", (response) => {
        activePaymentOrderId.current = null;
        sessionStorage.removeItem("yf.activePaymentOrderId");
        setActionError(response.error?.description ?? "Payment failed.");
        setPlacingOrder(false);
      });
      checkout.open();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to start payment");
      setPlacingOrder(false);
    }
  };

  if (confirmedOrderNumber) {
    return (
      <section className="mx-auto max-w-xl px-4 py-20 text-center">
        <CheckCircle2 className="mx-auto size-14 text-primary" />
        <p className="eyebrow mt-6">Payment confirmed</p>
        <h1 className="mt-3 text-4xl">Order confirmed</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Thank you for your purchase. Your order number is{" "}
          <strong className="text-foreground">{confirmedOrderNumber}</strong>.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/orders">
            <GoldButton type="button">Track your order</GoldButton>
          </Link>
          <Link
            to="/shop"
            className="inline-flex items-center border border-border px-5 py-3 text-xs tracking-[0.12em] uppercase"
          >
            Continue shopping
          </Link>
        </div>
      </section>
    );
  }

  if (cartCount === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-28 text-center">
        <ShoppingBag className="mx-auto size-10 text-primary" />
        <h1 className="mt-6 text-3xl">Your bag is empty</h1>
        <Link to="/shop" className="mt-8 inline-flex">
          <GoldButton type="button">Continue shopping</GoldButton>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 lg:px-8 lg:py-12">
      <Link
        to="/cart"
        className="mb-6 inline-flex items-center gap-2 text-xs tracking-[0.16em] text-muted-foreground uppercase"
      >
        <ArrowLeft className="size-4" /> Back to bag
      </Link>
      <header className="mb-8">
        <p className="eyebrow">Secure payment</p>
        <h1 className="mt-3 text-4xl">Checkout</h1>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <form onSubmit={placeOrder} className="space-y-5 border border-border p-5 sm:p-6">
          <h2 className="eyebrow">Delivery details</h2>
          <label className="block space-y-1.5">
            <span className="field-label">Full name</span>
            <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} required maxLength={100} autoComplete="name" className="checkout-input" />
          </label>
          <label className="block space-y-1.5">
            <span className="field-label">Email address</span>
            <input type="email" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} required maxLength={255} autoComplete="email" className="checkout-input" />
          </label>
          <label className="block space-y-1.5">
            <span className="field-label">Phone</span>
            <input type="tel" inputMode="numeric" pattern="[0-9]{10}" title="Enter exactly 10 digits" value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))} required minLength={10} maxLength={10} autoComplete="tel" className="checkout-input" />
          </label>
          <label className="block space-y-1.5">
            <span className="field-label">Shipping address</span>
            <textarea value={shippingAddress} onChange={(event) => setShippingAddress(event.target.value)} required minLength={5} maxLength={1000} autoComplete="street-address" rows={3} className="checkout-input resize-none" />
          </label>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block space-y-1.5">
              <span className="field-label">City</span>
              <input value={city} onChange={(event) => setCity(event.target.value)} required maxLength={100} autoComplete="address-level2" className="checkout-input" />
            </label>
            <label className="block space-y-1.5">
              <span className="field-label">State</span>
              <input value={state} onChange={(event) => setState(event.target.value)} required maxLength={100} autoComplete="address-level1" className="checkout-input" />
            </label>
            <label className="block space-y-1.5">
              <span className="field-label">PIN code</span>
              <input type="text" inputMode="numeric" pattern="[0-9]{6}" title="Enter exactly 6 digits" value={pincode} onChange={(event) => setPincode(event.target.value.replace(/\D/g, "").slice(0, 6))} required minLength={6} maxLength={6} autoComplete="postal-code" className="checkout-input" />
            </label>
          </div>
          {actionError ? (
            <p role="alert" className="text-sm text-destructive">{actionError}</p>
          ) : null}
          <GoldButton type="submit" className="w-full" disabled={placingOrder || !quote}>
            {placingOrder ? "Processing…" : "Pay securely"}
          </GoldButton>
        </form>

        <aside className="h-fit space-y-4 border border-border p-5 sm:p-6 lg:sticky lg:top-32">
          <h2 className="eyebrow">Order summary</h2>
          <div className="divide-y divide-border">
            {cart.map((line) => (
              <div key={`${line.productId}-${line.size}-${line.color}`} className="flex gap-3 py-3">
                <img src={line.image} alt="" className="size-16 rounded object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{line.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Qty {line.quantity}</p>
                </div>
                <p className="text-sm text-primary">
                  {formatINR(effectivePrice(line.price, line.salePrice) * line.quantity)}
                </p>
              </div>
            ))}
          </div>
          <CheckoutRow label="Subtotal" value={formatINR(subtotal)} />
          {coupon ? (
            <CheckoutRow label={`Coupon ${coupon.code}`} value={`− ${formatINR(coupon.discount)}`} accent />
          ) : null}
          <CheckoutRow label="Delivery" value={quote ? (quote.freeDelivery ? "Free" : formatINR(quote.charge)) : "—"} />
          <div className="hairline" />
          <CheckoutRow label="Total" value={total === null ? "—" : formatINR(total)} accent />
        </aside>
      </div>
    </div>
  );
}

function CheckoutRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={accent ? "text-primary" : ""}>{value}</span>
    </div>
  );
}
