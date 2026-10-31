import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, Search, ShoppingBag, ShieldCheck, X } from "lucide-react";
import { AccountMenu } from "@/components/account-menu";

import logo from "@/assets/logo.png";
import { useShop } from "@/context/shop-context";
import { useAuth } from "@/context/auth-context";

const links = [
  { to: "/", label: "Home" },
  { to: "/shop", label: "Shop" },
  { to: "/new-arrivals", label: "New Arrivals" },
  { to: "/contact", label: "Contact" },
] as const;

export function SiteHeader() {
  const { cartCount } = useShop();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const visibleLinks = [
    ...links,
    ...(user ? [{ to: "/orders" as const, label: "My Orders" }] : []),
    ...(user?.role === "admin"
      ? [{ to: "/admin" as const, label: "Admin" }]
      : []),
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-xl">
      <p className="bg-wine-gradient py-2 text-center text-[0.62rem] tracking-[0.28em] text-ivory uppercase">
        Complimentary delivery on orders above ₹1,000
      </p>

      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 lg:px-8">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
          className="text-primary lg:hidden"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>

        <Link to="/" className="shrink-0" aria-label="YUDHAS FASHION home">
          <img
            src={logo}
            alt="YUDHAS FASHION"
            width={1152}
            height={576}
            className="h-10 w-auto sm:h-12"
          />
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          {visibleLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeProps={{ className: "text-primary" }}
              className="text-[0.7rem] tracking-[0.2em] text-foreground/80 uppercase transition-colors hover:text-primary"
            >
              {l.to === "/admin" ? (
                <ShieldCheck className="mr-1 inline size-4" />
              ) : null}
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3 text-primary sm:gap-5">
          <Link to="/shop" aria-label="Search" className="hover:opacity-70">
            <Search className="size-5" />
          </Link>
          <AccountMenu />

          <Link
            to="/cart"
            aria-label="Cart"
            className="relative hover:opacity-70"
          >
            <ShoppingBag className="size-5" />
            {cartCount > 0 && <Badge value={cartCount} />}
          </Link>
        </div>
      </div>

      {open && (
        <nav className="animate-rise border-t border-border px-4 pb-6 lg:hidden">
          {visibleLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className="block border-b border-border/60 py-3.5 text-xs tracking-[0.2em] uppercase"
            >
              {l.to === "/admin" ? (
                <ShieldCheck className="mr-2 inline size-4" />
              ) : null}
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

function Badge({ value }: { value: number }) {
  return (
    <span className="absolute -top-2 -right-2 grid size-4.5 place-items-center rounded-full bg-accent text-[0.6rem] text-accent-foreground">
      {value}
    </span>
  );
}
