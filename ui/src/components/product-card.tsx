import { Link } from "@tanstack/react-router";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import type { Product } from "@/data/catalog";
import { discountPercent, effectivePrice, formatINR } from "@/lib/format";
import { useShop } from "@/context/shop-context";

export function ProductCard({ product }: { product: Product }) {
  const { cart, addToCart, setQuantity } = useShop();
  const off = discountPercent(product.price, product.salePrice);
  const price = effectivePrice(product.price, product.salePrice);
  const cover = product.images[0] ?? "";
  const size = product.sizes[0];
  const color = product.colors[0];
  const cartLine = cart.find(
    (line) =>
      line.productId === product.id &&
      line.size === size &&
      line.color === color,
  );
  const quantity = cartLine?.quantity ?? 0;

  return (
    <article className="group relative">
      <div className="relative overflow-hidden border border-border bg-card">
        <Link
          to="/product/$slug"
          params={{ slug: product.slug }}
          aria-label={product.name}
          className="block"
        >
          <img
            src={cover}
            alt={product.name}
            loading="lazy"
            width={900}
            height={1100}
            className="aspect-4/5 w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        </Link>

        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-2 sm:p-3">
          <div className="flex flex-col gap-1.5">
            {off > 0 && (
              <span className="bg-wine-gradient px-1.5 py-1 text-[0.55rem] tracking-[0.12em] text-ivory sm:px-2 sm:text-[0.62rem] sm:tracking-[0.2em]">
                {off}% OFF
              </span>
            )}
            {product.newArrival && (
              <span className="border border-border bg-background/70 px-1.5 py-1 text-[0.55rem] tracking-[0.12em] text-primary sm:px-2 sm:text-[0.62rem] sm:tracking-[0.2em]">
                NEW
              </span>
            )}
          </div>
        </div>
      </div>
      {quantity > 0 ? (
        <div className="mt-2 grid grid-cols-[42px_1fr_42px] items-center border border-primary/60 sm:mt-3 sm:grid-cols-[48px_1fr_48px]">
          <button
            type="button"
            aria-label={`Decrease ${product.name} quantity`}
            onClick={() =>
              setQuantity(product.id, quantity - 1, size, color)
            }
            className="grid h-9 place-items-center text-primary sm:h-10"
          >
            <Minus className="size-4" />
          </button>
          <div className="h-9 border-x border-primary/60 text-center text-[0.58rem] tracking-[0.12em] text-primary sm:h-10 sm:text-[0.7rem] sm:tracking-[0.18em]">
            <span className="block leading-[36px] sm:leading-[40px]">
              {quantity} Added
            </span>
          </div>
          <button
            type="button"
            aria-label={`Increase ${product.name} quantity`}
            disabled={quantity >= product.stock}
            onClick={() =>
              setQuantity(product.id, quantity + 1, size, color)
            }
            className="grid h-9 place-items-center text-primary disabled:opacity-40 sm:h-10"
          >
            <Plus className="size-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={product.stock <= 0}
          onClick={() =>
            addToCart({
              productId: product.id,
              name: product.name,
              slug: product.slug,
              image: cover,
              price: product.price,
              salePrice: product.salePrice,
              size,
              color,
            })
          }
          className="mt-2 flex w-full items-center justify-center gap-1.5 bg-gold-gradient px-2 py-2 text-[0.58rem] tracking-[0.12em] text-primary-foreground uppercase disabled:opacity-50 sm:mt-3 sm:gap-2 sm:px-4 sm:py-2.5 sm:text-[0.7rem] sm:tracking-[0.22em]"
        >
          <ShoppingBag className="size-3.5 sm:size-4" />
          {product.stock > 0 ? "Add to bag" : "Sold out"}
        </button>
      )}

      <div className="mt-2 space-y-1 text-center sm:mt-4 sm:space-y-1.5">
        <h3 className="font-display text-sm leading-snug sm:text-lg">
          <Link
            to="/product/$slug"
            params={{ slug: product.slug }}
            className="hover:text-primary"
          >
            {product.name}
          </Link>
        </h3>
        <div className="flex flex-wrap items-baseline justify-center gap-x-1.5 text-xs sm:gap-2 sm:text-sm">
          <span className="text-primary">{formatINR(price)}</span>
          {off > 0 && (
            <span className="text-muted-foreground line-through">
              {formatINR(product.price)}
            </span>
          )}
        </div>
        <p className="text-[0.58rem] tracking-[0.1em] text-muted-foreground uppercase sm:text-[0.68rem] sm:tracking-[0.18em]">
          {product.stock > 0
            ? product.stock < 6
              ? `Only ${product.stock} left`
              : "In stock"
            : "Out of stock"}
        </p>
      </div>
    </article>
  );
}
