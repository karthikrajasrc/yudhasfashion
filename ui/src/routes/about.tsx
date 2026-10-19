import { createFileRoute, Link } from "@tanstack/react-router";
import logo from "@/assets/logo.png";
import { GoldButton, Section } from "@/components/section";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "Our Story | YUDHAS FASHION" },
      {
        name: "description",
        content:
          "Yudhas Fashion is a Chennai-born house of handcrafted jewellery and Kanjivaram silks, made by artisan families across Tamil Nadu.",
      },
      { property: "og:title", content: "Our Story | YUDHAS FASHION" },
      {
        property: "og:description",
        content:
          "Chennai-born luxury jewellery and silk, crafted by artisan families.",
      },
    ],
  }),
  component: About,
});

function About() {
  return (
    <>
      <section className="relative isolate bg-gradient-to-br from-card via-background to-secondary">
        <div className="mx-auto max-w-3xl px-4 py-28 text-center">
          <img
            src={logo}
            alt="YUDHAS FASHION"
            width={1152}
            height={576}
            className="mx-auto h-14 w-auto"
          />
          <h1 className="mt-8 text-4xl sm:text-5xl">
            Craft Kept in the Family
          </h1>
          <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
            Since our first workshop in Chennai, Yudhas Fashion has worked with
            the same artisan families — goldsmiths who cast temple motifs by
            hand and weavers who still count zari threads on wooden looms.
          </p>
        </div>
      </section>

      <Section eyebrow="What we stand for" title="Made Slowly, Worn Forever">
        <div className="grid gap-8 md:grid-cols-3">
          {[
            {
              title: "Artisan-first",
              body: "Every piece is made in small batches by named craftspeople who are paid above market rates.",
            },
            {
              title: "Honest pricing",
              body: "One studio, no middlemen. What you save is craft you can actually see in the finish.",
            },
            {
              title: "Built to last",
              body: "22K gold plating tested for wear, and pure mulberry silk that softens with every drape.",
            },
          ].map((v) => (
            <div key={v.title} className="glass-panel p-7">
              <h3 className="text-2xl">{v.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {v.body}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section
        className="border-t border-border text-center"
        title="Bring Home a Piece"
      >
        <Link to="/shop" className="inline-flex">
          <GoldButton>Shop the collection</GoldButton>
        </Link>
      </Section>
    </>
  );
}
