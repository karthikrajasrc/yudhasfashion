import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, Search, ShoppingBag, ShieldCheck, X } from "lucide-react";
import { AccountMenu } from "@/components/account-menu";

import logo from "@/assets/logo.png";
import { useShop } from "@/context/shop-context";
import { useAuth } from "@/context/auth-context";

const links = [
  { to: "/", label: "Home" },
  { to: "/shop", label: "Shop" },
  { to: "/new-arrivals", label: "New Arrivals" },
  { to: "/orders", label: "Track Order" },
  { to: "/contact", label: "Contact" },
] as const;

export function SiteHeader() {
  const { cartCount } = useShop();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const visibleLinks = [
    ...links,
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

      <div
        className={`fixed inset-0 h-[100dvh] z-[60] lg:hidden ${
          open ? "pointer-events-auto" : "pointer-events-none"
        }`}
        aria-hidden={!open}
      >
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-black/55 backdrop-blur-sm transition-opacity duration-300 ${
            open ? "opacity-100" : "opacity-0"
          }`}
        />
        <aside
          role="dialog"
          aria-modal="true"
          className={`absolute inset-y-0 left-0 flex h-[100dvh] w-[82vw] max-w-[320px] flex-col bg-background shadow-2xl transition-transform duration-300 ease-out ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-[72px] items-center justify-between border-b border-border px-5">
            <Link
              to="/"
              onClick={() => setOpen(false)}
              aria-label="YUDHAS FASHION home"
            >
              <img
                src={logo}
                alt="YUDHAS FASHION"
                width={1152}
                height={576}
                className="h-9 w-auto"
              />
            </Link>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="grid size-9 place-items-center text-primary"
            >
              <X className="size-5" />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto px-5 py-4">
            {visibleLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="flex items-center border-b border-border/60 py-4 text-xs tracking-[0.2em] uppercase"
              >
                {l.to === "/admin" ? (
                  <ShieldCheck className="mr-2 inline size-4" />
                ) : null}
                {l.label}
              </Link>
            ))}
            <Link
              to="/account"
              onClick={() => setOpen(false)}
              className="flex items-center border-b border-border/60 py-4 text-xs tracking-[0.2em] uppercase"
            >
              Account
            </Link>
          </nav>
        </aside>
      </div>
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
