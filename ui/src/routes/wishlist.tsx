import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { GoldButton } from "@/components/section";
import { ProductCard } from "@/components/product-card";
import { useShop } from "@/context/shop-context";
import { getProductsByIds } from "@/services/shop.service";

export const Route = createFileRoute("/wishlist")({
  head: () => ({
    meta: [
      { title: "Wishlist | YUDHAS FASHION" },
      {
        name: "description",
        content: "Your saved Yudhas Fashion jewellery and sarees, ready to move into your bag.",
      },
      { property: "og:title", content: "Wishlist | YUDHAS FASHION" },
      { property: "og:description", content: "Pieces you have saved for later." },
    ],
  }),
  component: Wishlist,
});

function Wishlist() {
  const { wishlist, ready } = useShop();
  const { data } = useQuery({
    queryKey: ["wishlist", wishlist],
    queryFn: () => getProductsByIds(wishlist),
    enabled: ready,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
      <header className="mb-10 text-center">
        <p className="eyebrow">Saved Pieces</p>
        <h1 className="mt-3 text-4xl">Your Wishlist</h1>
        <div className="hairline mx-auto mt-6 w-24" />
      </header>

      {!data || data.length === 0 ? (
        <div className="py-20 text-center">
          <Heart className="mx-auto size-10 text-primary" />
          <h2 className="mt-6 text-2xl">Nothing saved yet</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Tap the heart on any piece to keep it here.
          </p>
          <Link to="/shop" className="mt-8 inline-flex">
            <GoldButton>Explore the collection</GoldButton>
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {data.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
