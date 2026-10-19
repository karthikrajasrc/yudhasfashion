import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Heart, Minus, Plus, Share2, ShieldCheck, Star, Truck } from "lucide-react";
import { toast } from "sonner";
import { GoldButton, Section } from "@/components/section";
import { ProductCard } from "@/components/product-card";
import { useShop } from "@/context/shop-context";
import { discountPercent, effectivePrice, formatINR } from "@/lib/format";
import {
  getDeliveryQuote,
  getDistricts,
  getProductBySlug,
  getRelatedProducts,
} from "@/services/shop.service";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/product/$slug")({
  loader: async ({ params }) => {
    const product = await getProductBySlug(params.slug);
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Unavailable | YUDHAS FASHION" }, { name: "robots", content: "noindex" }] };
    }
    const { product } = loaderData;
    const price = effectivePrice(product.price, product.salePrice);
    return {
      meta: [
        { title: `${product.name} — ${formatINR(price)} | YUDHAS FASHION` },
        { name: "description", content: product.shortDescription },
        { property: "og:title", content: `${product.name} | YUDHAS FASHION` },
        { property: "og:description", content: product.shortDescription },
      ],
    };
  },
  component: ProductDetail,
});

function ProductDetail() {
  const { product } = Route.useLoaderData();
  const { addToCart, toggleWishlist, isWishlisted } = useShop();
  const [image, setImage] = useState(0);
  const [size, setSize] = useState(product.sizes[0] ?? "");
  const [color, setColor] = useState(product.colors[0] ?? "");
  const [qty, setQty] = useState(1);
  const [district, setDistrict] = useState("");

  const off = discountPercent(product.price, product.salePrice);
  const price = effectivePrice(product.price, product.salePrice);
  const saved = product.price - price;

  const { data: districts } = useQuery({ queryKey: ["districts"], queryFn: getDistricts });
  const { data: related } = useQuery({
    queryKey: ["related", product.slug],
    queryFn: () => getRelatedProducts(product.slug),
  });
  const { data: quote } = useQuery({
    queryKey: ["delivery", district, price * qty],
    queryFn: () => getDeliveryQuote(district, price * qty),
    enabled: district !== "",
  });

  useEffect(() => {
    setImage(0);
    setQty(1);
    setSize(product.sizes[0] ?? "");
    setColor(product.colors[0] ?? "");
  }, [product]);

  const eta = new Date(Date.now() + 4 * 86400000).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
        <nav className="mb-8 text-[0.68rem] tracking-[0.16em] text-muted-foreground uppercase">
          <Link to="/" className="hover:text-primary">Home</Link>
          <span className="mx-2">/</span>
          <Link to="/shop" search={{ category: product.categorySlug }} className="hover:text-primary">
            {product.categorySlug}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{product.name}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="group overflow-hidden border border-border bg-card">
              <img
                src={product.images[image] ?? product.images[0]}
                alt={product.name}
                width={900}
                height={1100}
                className="aspect-4/5 w-full object-cover transition-transform duration-700 group-hover:scale-125"
              />
            </div>
            <div className="flex gap-3">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setImage(i)}
                  className={cn(
                    "w-20 overflow-hidden border",
                    i === image ? "border-primary" : "border-border",
                  )}
                >
                  <img src={img} alt="" loading="lazy" width={900} height={1100} className="aspect-4/5 object-cover" />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-7">
            <div>
              <p className="eyebrow">{product.brand}</p>
              <h1 className="mt-3 text-3xl leading-tight sm:text-4xl">{product.name}</h1>
              <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <span className="flex text-primary">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={cn("size-4", i < Math.round(product.rating) && "fill-current")}
                    />
                  ))}
                </span>
                {product.rating} · {product.reviewCount} reviews
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="text-3xl text-primary">{formatINR(price)}</span>
                {off > 0 && (
                  <>
                    <span className="text-lg text-muted-foreground line-through">
                      {formatINR(product.price)}
                    </span>
                    <span className="bg-wine-gradient px-2 py-1 text-[0.65rem] tracking-[0.18em] text-ivory">
                      {off}% OFF
                    </span>
                  </>
                )}
              </div>
              {saved > 0 && (
                <p className="text-sm text-primary">You save {formatINR(saved)} on this piece</p>
              )}
              <p className="text-[0.68rem] tracking-[0.18em] text-muted-foreground uppercase">
                {product.stock > 0 ? `In stock · ${product.stock} available` : "Out of stock"} · SKU{" "}
                {product.sku}
              </p>
            </div>

            <p className="text-sm leading-relaxed text-muted-foreground">{product.description}</p>

            <div className="space-y-4">
              <OptionRow label="Size" options={product.sizes} value={size} onChange={setSize} />
              <OptionRow label="Colour" options={product.colors} value={color} onChange={setColor} />

              <div>
                <p className="eyebrow mb-2">Quantity</p>
                <div className="inline-flex items-center border border-border">
                  <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="px-3 py-2.5" aria-label="Decrease">
                    <Minus className="size-4" />
                  </button>
                  <span className="w-10 text-center text-sm">{qty}</span>
                  <button onClick={() => setQty((q) => q + 1)} className="px-3 py-2.5" aria-label="Increase">
                    <Plus className="size-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <GoldButton
                disabled={product.stock <= 0}
                onClick={() =>
                  addToCart(
                    {
                      productId: product.id,
                      name: product.name,
                      slug: product.slug,
                      image: product.images[0] ?? "",
                      price: product.price,
                      salePrice: product.salePrice,
                      size,
                      color,
                    },
                    qty,
                  )
                }
              >
                Add to bag
              </GoldButton>
              <Link to="/cart" className="inline-flex">
                <button
                  disabled={product.stock <= 0}
                  onClick={() =>
                    addToCart(
                      {
                        productId: product.id,
                        name: product.name,
                        slug: product.slug,
                        image: product.images[0] ?? "",
                        price: product.price,
                        salePrice: product.salePrice,
                        size,
                        color,
                      },
                      qty,
                    )
                  }
                  className="border border-primary/60 px-7 py-3 text-[0.7rem] tracking-[0.24em] text-primary uppercase hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
                >
                  Buy now
                </button>
              </Link>
              <button
                onClick={() => toggleWishlist(product.id)}
                aria-label="Wishlist"
                className="grid size-11 place-items-center border border-border text-primary"
              >
                <Heart className={cn("size-4", isWishlisted(product.id) && "fill-current")} />
              </button>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(window.location.href);
                  toast.success("Link copied");
                }}
                aria-label="Share"
                className="grid size-11 place-items-center border border-border text-primary"
              >
                <Share2 className="size-4" />
              </button>
            </div>

            <div className="glass-panel space-y-3 p-5">
              <p className="eyebrow flex items-center gap-2">
                <Truck className="size-4" /> Delivery availability
              </p>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              >
                <option value="">Select your district</option>
                {(districts ?? []).map((d) => (
                  <option key={d.name} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
              {quote?.district && (
                <p className="text-sm text-muted-foreground">
                  Delivery to {quote.district}:{" "}
                  <span className="text-primary">
                    {quote.freeDelivery ? "Free" : formatINR(quote.charge)}
                  </span>{" "}
                  · Estimated arrival {eta}
                </p>
              )}
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="size-4 text-primary" /> 7-day returns · Secure checkout
              </p>
            </div>

            <div className="border border-border">
              <p className="eyebrow border-b border-border px-5 py-3">Specifications</p>
              <dl className="divide-y divide-border">
                {product.specifications.map((s) => (
                  <div key={s.label} className="flex justify-between px-5 py-3 text-sm">
                    <dt className="text-muted-foreground">{s.label}</dt>
                    <dd>{s.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </div>

      {related && related.length > 0 && (
        <Section eyebrow="Complete the look" title="You May Also Like">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </Section>
      )}
    </>
  );
}

function OptionRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div>
      <p className="eyebrow mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o}
            onClick={() => onChange(o)}
            className={cn(
              "border px-4 py-2 text-xs tracking-[0.12em] uppercase",
              value === o ? "border-primary text-primary" : "border-border text-muted-foreground",
            )}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}
