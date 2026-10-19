import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { z } from "zod";
import { ProductCard } from "@/components/product-card";
import { GoldButton } from "@/components/section";
import {
  getCategoryTree,
  listProducts,
  type ProductQuery,
} from "@/services/shop.service";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  category: z.string().optional(),
  q: z.string().optional(),
  discounted: z.boolean().optional(),
  inStock: z.boolean().optional(),
  size: z.string().optional(),
  color: z.string().optional(),
  max: z.number().optional(),
  sort: z
    .enum([
      "newest",
      "price-asc",
      "price-desc",
      "popular",
      "best-selling",
      "discount",
    ])
    .optional(),
  page: z.number().optional(),
});

export const Route = createFileRoute("/shop")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Shop All — Jewellery & Silk | YUDHAS FASHION" },
      {
        name: "description",
        content:
          "Browse the full Yudhas Fashion catalogue: earrings, necklaces, bracelets and pure silk sarees with filters for price, size, colour and discount.",
      },
      { property: "og:title", content: "Shop All — YUDHAS FASHION" },
      {
        property: "og:description",
        content:
          "Filter handcrafted jewellery and silk sarees by category, price and discount.",
      },
    ],
  }),
  component: Shop,
});

const sortLabels: Record<NonNullable<ProductQuery["sort"]>, string> = {
  newest: "Newest",
  "price-asc": "Price: Low to High",
  "price-desc": "Price: High to Low",
  popular: "Most Popular",
  "best-selling": "Best Selling",
  discount: "Highest Discount",
};

function Shop() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const query: ProductQuery = {
    ...(search.category ? { category: search.category } : {}),
    ...(search.q ? { search: search.q } : {}),
    ...(search.discounted ? { discountedOnly: true } : {}),
    ...(search.inStock ? { inStockOnly: true } : {}),
    ...(search.size ? { size: search.size } : {}),
    ...(search.color ? { color: search.color } : {}),
    ...(search.max ? { maxPrice: search.max } : {}),
    sort: search.sort ?? "newest",
    page: search.page ?? 1,
  };

  const { data, isPending, isError, error } = useQuery({
    queryKey: ["products", query],
    queryFn: () => listProducts(query),
  });
  const { data: tree } = useQuery({
    queryKey: ["category-tree"],
    queryFn: getCategoryTree,
  });

  const update = (patch: Partial<z.infer<typeof searchSchema>>) =>
    navigate({ to: ".", search: (prev) => ({ ...prev, ...patch, page: 1 }) });

  const colors = [
    "Gold",
    "Rani Pink",
    "Antique Gold",
    "Champagne",
    "Wine",
    "Magenta",
    "Emerald",
    "Ivory",
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
      <header className="mb-10 text-center">
        <p className="eyebrow">The Collection</p>
        <h1 className="mt-3 text-4xl sm:text-5xl">Shop All</h1>
        <div className="hairline mx-auto mt-6 w-24" />
      </header>

      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          className="flex items-center gap-2 border border-border px-4 py-2.5 text-[0.68rem] tracking-[0.2em] uppercase lg:hidden"
        >
          <SlidersHorizontal className="size-4" /> Filters
        </button>
        <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
          {data?.total ?? 0} pieces
        </p>
        <select
          value={search.sort ?? "newest"}
          onChange={(e) =>
            update({ sort: e.target.value as ProductQuery["sort"] })
          }
          className="border border-input bg-background px-4 py-2.5 text-xs tracking-[0.14em] uppercase outline-none focus:border-primary"
        >
          {Object.entries(sortLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-10 lg:grid-cols-[240px_1fr]">
        <aside
          className={cn("space-y-8", filtersOpen ? "block" : "hidden lg:block")}
        >
          <FilterBlock title="Search">
            <input
              defaultValue={search.q ?? ""}
              onBlur={(e) => update({ q: e.target.value || undefined })}
              placeholder="Search pieces"
              className="w-full border border-input bg-transparent px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
          </FilterBlock>

          <FilterBlock title="Category">
            <button
              onClick={() => update({ category: undefined })}
              className={cn(
                "block text-sm",
                !search.category ? "text-primary" : "text-muted-foreground",
              )}
            >
              All
            </button>
            {(tree ?? []).map((parent) => (
              <div key={parent.id} className="space-y-1.5">
                <button
                  onClick={() => update({ category: parent.slug })}
                  className={cn(
                    "block text-sm",
                    search.category === parent.slug
                      ? "text-primary"
                      : "text-muted-foreground",
                  )}
                >
                  {parent.name}
                </button>
                <div className="space-y-1.5 pl-4">
                  {parent.children.map((child) => (
                    <button
                      key={child.id}
                      onClick={() => update({ category: child.slug })}
                      className={cn(
                        "block text-xs",
                        search.category === child.slug
                          ? "text-primary"
                          : "text-muted-foreground",
                      )}
                    >
                      {child.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </FilterBlock>

          <FilterBlock title="Max Price">
            <input
              type="range"
              min={1000}
              max={20000}
              step={500}
              value={search.max ?? 20000}
              onChange={(e) => update({ max: Number(e.target.value) })}
              className="w-full accent-primary"
            />
            <p className="text-xs text-muted-foreground">
              Up to ₹{(search.max ?? 20000).toLocaleString("en-IN")}
            </p>
          </FilterBlock>

          <FilterBlock title="Colour">
            <div className="flex flex-wrap gap-2">
              {colors.map((c) => (
                <button
                  key={c}
                  onClick={() =>
                    update({ color: search.color === c ? undefined : c })
                  }
                  className={cn(
                    "border px-2.5 py-1 text-[0.65rem] tracking-[0.12em] uppercase",
                    search.color === c
                      ? "border-primary text-primary"
                      : "border-border text-muted-foreground",
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </FilterBlock>

          <FilterBlock title="Offers">
            <Check
              label="Discounted only"
              checked={!!search.discounted}
              onChange={(v) => update({ discounted: v || undefined })}
            />
            <Check
              label="In stock only"
              checked={!!search.inStock}
              onChange={(v) => update({ inStock: v || undefined })}
            />
          </FilterBlock>

          <GoldButton
            type="button"
            className="w-full"
            onClick={() => navigate({ to: ".", search: {} })}
          >
            Clear filters
          </GoldButton>
        </aside>

        <div>
          {isError ? (
            <p
              role="alert"
              className="border border-destructive/40 p-5 text-sm text-destructive"
            >
              {error.message}
            </p>
          ) : isPending ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-6 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-4/5 animate-pulse border border-border bg-card"
                />
              ))}
            </div>
          ) : data && data.items.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-3 sm:gap-6 xl:grid-cols-3">
                {data.items.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
              {data.pages > 1 && (
                <div className="mt-12 flex justify-center gap-2">
                  {Array.from({ length: data.pages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() =>
                        navigate({
                          to: ".",
                          search: (prev) => ({ ...prev, page: i + 1 }),
                        })
                      }
                      className={cn(
                        "size-10 border text-sm",
                        (search.page ?? 1) === i + 1
                          ? "border-primary text-primary"
                          : "border-border text-muted-foreground",
                      )}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="border border-border p-16 text-center">
              <h2 className="text-2xl">
                {data?.total === 0 &&
                !search.category &&
                !search.q &&
                !search.max &&
                !search.color &&
                !search.discounted &&
                !search.inStock
                  ? "Our collection is being updated"
                  : "No pieces match your filters"}
              </h2>
              <p className="mt-3 text-sm text-muted-foreground">
                {data?.total === 0 &&
                !search.category &&
                !search.q &&
                !search.max &&
                !search.color &&
                !search.discounted &&
                !search.inStock
                  ? "Please check back soon."
                  : "Try widening your price range or clearing a filter."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <h3 className="eyebrow">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 accent-primary"
      />
      {label}
    </label>
  );
}
