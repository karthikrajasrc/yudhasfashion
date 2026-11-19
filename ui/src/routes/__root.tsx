import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
} from "@tanstack/react-router";
import { type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { ShopProvider } from "@/context/shop-context";
import { AuthProvider } from "@/context/auth-context";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useShop } from "@/context/shop-context";
import { effectivePrice, formatINR } from "@/lib/format";
import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl text-primary">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">
          Page not found
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center bg-gold-gradient px-5 py-2.5 text-[0.7rem] tracking-[0.22em] text-primary-foreground uppercase"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back
          home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center bg-gold-gradient px-5 py-2.5 text-[0.7rem] tracking-[0.22em] text-primary-foreground uppercase"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center border border-border px-5 py-2.5 text-[0.7rem] tracking-[0.22em] uppercase"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()(
  {
    head: () => ({
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { title: "YUDHAS FASHION — Luxury Jewellery & Silk" },
        {
          name: "description",
          content:
            "Handcrafted gold-finish jewellery and premium silk sarees from Yudhas Fashion.",
        },
        { name: "author", content: "Yudhas Fashion" },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [
        { rel: "stylesheet", href: appCss },
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        {
          rel: "preconnect",
          href: "https://fonts.gstatic.com",
          crossOrigin: "anonymous",
        },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600&family=Jost:wght@300;400;500&display=swap",
        },
        { rel: "icon", type: "image/png", href: "/favicon.png" },
      ],
    }),
    shellComponent: RootShell,
    component: RootComponent,
    notFoundComponent: NotFoundComponent,
    errorComponent: ErrorComponent,
  },
);

function RootShell({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      {typeof document !== "undefined"
        ? createPortal(<HeadContent />, document.head)
        : null}
    </>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ShopProvider>
          <div className="flex min-h-screen flex-col">
            <SiteHeader />
            <main className="flex-1">
              <Outlet />
            </main>
            <SiteFooter />
          </div>
          <FloatingCart />
          <Toaster />
        </ShopProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

function FloatingCart() {
  const { cart, cartCount } = useShop();
  if (cartCount === 0) return null;

  const total = cart.reduce(
    (sum, line) =>
      sum + effectivePrice(line.price, line.salePrice) * line.quantity,
    0,
  );
  const latest = cart[cart.length - 1];

  return (
    <Link
      to="/cart"
      className="fixed bottom-3 left-1/2 z-40 flex w-[calc(100%-1.5rem)] max-w-[620px] -translate-x-1/2 items-center gap-3 rounded-[15px] border border-primary/35 bg-background/95 p-2.5 pr-4 shadow-2xl backdrop-blur-xl sm:bottom-5"
      aria-label={`View cart with ${cartCount} items`}
    >
      {latest?.image ? (
        <img
          src={latest.image}
          alt=""
          className="size-12 shrink-0 rounded-[10px] object-cover"
        />
      ) : (
        <span className="grid size-12 shrink-0 place-items-center rounded-[10px] bg-card">
          <ShoppingBag className="size-5 text-primary" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {cartCount} {cartCount === 1 ? "item" : "items"} in your bag
        </p>
        <p className="mt-0.5 text-xs text-primary">{formatINR(total)}</p>
      </div>
      <span className="flex items-center gap-2 text-[0.65rem] tracking-[0.16em] text-primary uppercase">
        View cart <ArrowRight className="size-4" />
      </span>
    </Link>
  );
}
