import { Link } from "@tanstack/react-router";
import { Heart, ShoppingBag } from "lucide-react";
import type { Product } from "@/data/catalog";
import { discountPercent, effectivePrice, formatINR } from "@/lib/format";
import { useShop } from "@/context/shop-context";
import { cn } from "@/lib/utils";

export function ProductCard({ product }: { product: Product }) {
  const { addToCart, toggleWishlist, isWishlisted } = useShop();
  const off = discountPercent(product.price, product.salePrice);
  const price = effectivePrice(product.price, product.salePrice);
  const wishlisted = isWishlisted(product.id);
  const cover = product.images[0] ?? "";

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

        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3">
          <div className="flex flex-col gap-1.5">
            {off > 0 && (
              <span className="bg-wine-gradient px-2 py-1 text-[0.62rem] tracking-[0.2em] text-ivory">
                {off}% OFF
              </span>
            )}
            {product.newArrival && (
              <span className="border border-border bg-background/70 px-2 py-1 text-[0.62rem] tracking-[0.2em] text-primary">
                NEW
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => toggleWishlist(product.id)}
            aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
            className="pointer-events-auto grid size-9 place-items-center border border-border bg-background/70 text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            <Heart className={cn("size-4", wishlisted && "fill-current")} />
          </button>
        </div>

        <div className="absolute inset-x-0 bottom-0 translate-y-full p-3 transition-transform duration-500 group-hover:translate-y-0">
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
                size: product.sizes[0],
                color: product.colors[0],
              })
            }
            className="flex w-full items-center justify-center gap-2 bg-gold-gradient px-4 py-2.5 text-[0.7rem] tracking-[0.22em] text-primary-foreground uppercase disabled:opacity-50"
          >
            <ShoppingBag className="size-4" />
            {product.stock > 0 ? "Add to bag" : "Sold out"}
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-1.5 text-center">
        <h3 className="font-display text-lg leading-snug">
          <Link to="/product/$slug" params={{ slug: product.slug }} className="hover:text-primary">
            {product.name}
          </Link>
        </h3>
        <div className="flex items-baseline justify-center gap-2 text-sm">
          <span className="text-primary">{formatINR(price)}</span>
          {off > 0 && (
            <span className="text-muted-foreground line-through">{formatINR(product.price)}</span>
          )}
        </div>
        <p className="text-[0.68rem] tracking-[0.18em] text-muted-foreground uppercase">
          {product.stock > 0 ? (product.stock < 6 ? `Only ${product.stock} left` : "In stock") : "Out of stock"}
        </p>
      </div>
    </article>
  );
}
