import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getCategoryTree } from "@/services/shop.service";

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      { title: "All Categories | YUDHAS FASHION" },
      {
        name: "description",
        content:
          "Explore Yudhas Fashion categories — earrings, necklaces, bracelets and silk sarees, all managed dynamically.",
      },
      { property: "og:title", content: "All Categories | YUDHAS FASHION" },
      { property: "og:description", content: "Jewellery and fashion categories at Yudhas Fashion." },
    ],
  }),
  component: Categories,
});

function Categories() {
  const { data: tree } = useQuery({ queryKey: ["category-tree"], queryFn: getCategoryTree });

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
      <header className="mb-12 text-center">
        <p className="eyebrow">Browse</p>
        <h1 className="mt-3 text-4xl sm:text-5xl">Categories</h1>
        <div className="hairline mx-auto mt-6 w-24" />
      </header>

      <div className="space-y-16">
        {(tree ?? []).map((parent) => (
          <section key={parent.id}>
            <div className="mb-6 flex items-end justify-between">
              <div>
                <h2 className="text-3xl">{parent.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{parent.description}</p>
              </div>
              <Link
                to="/shop"
                search={{ category: parent.slug }}
                className="text-[0.68rem] tracking-[0.2em] text-primary uppercase"
              >
                Shop all
              </Link>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {parent.children.map((child) => (
                <Link
                  key={child.id}
                  to="/shop"
                  search={{ category: child.slug }}
                  className="group relative overflow-hidden border border-border"
                >
                  <img
                    src={child.image}
                    alt={child.name}
                    loading="lazy"
                    width={900}
                    height={1100}
                    className="aspect-16/10 w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <h3 className="text-xl">{child.name}</h3>
                    <p className="text-xs text-muted-foreground">{child.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
