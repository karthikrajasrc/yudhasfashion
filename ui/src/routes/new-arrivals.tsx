import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ProductCard } from "@/components/product-card";
import { listProducts } from "@/services/shop.service";

export const Route = createFileRoute("/new-arrivals")({
  head: () => ({
    meta: [
      { title: "New Arrivals | YUDHAS FASHION" },
      {
        name: "description",
        content:
          "The latest jewellery and silk drops from the Yudhas Fashion atelier in Chennai.",
      },
      { property: "og:title", content: "New Arrivals | YUDHAS FASHION" },
      {
        property: "og:description",
        content: "Fresh gold-finish jewellery and silk sarees.",
      },
    ],
  }),
  component: NewArrivals,
});

function NewArrivals() {
  const { data } = useQuery({
    queryKey: ["products", "new"],
    queryFn: () =>
      listProducts({ sort: "newest", newArrivalsOnly: true, perPage: 12 }),
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
      <header className="mb-10 text-center">
        <p className="eyebrow">Just In</p>
        <h1 className="mt-3 text-4xl sm:text-5xl">New Arrivals</h1>
        <div className="hairline mx-auto mt-6 w-24" />
      </header>
      {data?.items.length ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
          {data.items.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No new arrivals yet. Please check back soon.
        </p>
      )}
    </div>
  );
}
