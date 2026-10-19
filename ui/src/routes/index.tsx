import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Sparkles, Truck, ShieldCheck, Gem, Lock } from "lucide-react";
import { toast } from "sonner";
import heroImage from "@/assets/hero.jpg";
import logo from "@/assets/logo.png";
import { Section, GoldButton, OutlineLinkStyle } from "@/components/section";
import { ProductCard } from "@/components/product-card";
import { getCategoryTree, getHomeCollections } from "@/services/shop.service";
import type { Product } from "@/data/catalog";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "YUDHAS FASHION — Luxury Jewellery & Silk Sarees Online" },
      {
        name: "description",
        content:
          "Shop handcrafted gold-finish jewellery, temple necklaces and pure silk sarees at Yudhas Fashion. Free delivery above ₹5,000 across Tamil Nadu.",
      },
      { property: "og:title", content: "YUDHAS FASHION — Luxury Jewellery & Silk Sarees" },
      {
        property: "og:description",
        content: "Handcrafted jewellery and premium silks for modern Indian women.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { data: collections } = useQuery({
    queryKey: ["home-collections"],
    queryFn: getHomeCollections,
  });
  const { data: tree } = useQuery({ queryKey: ["category-tree"], queryFn: getCategoryTree });

  return (
    <>
      <Hero />
      <Marquee />

      <Section
        eyebrow="Curated Edits"
        title="Shop by Category"
        description="From everyday elegance to festive sparkle."
      >
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {(tree ?? []).flatMap((parent) => parent.children).slice(0, 4).map((cat) => (
            <Link
              key={cat.id}
              to="/shop"
              search={{ category: cat.slug }}
              className="group relative overflow-hidden border border-border"
            >
              <img
                src={cat.image}
                alt={cat.name}
                loading="lazy"
                width={900}
                height={1100}
                className="aspect-3/4 w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 text-center">
                <h3 className="text-xl">{cat.name}</h3>
                <p className="mt-1 text-[0.65rem] tracking-[0.2em] text-primary uppercase">
                  Explore
                </p>
              </div>
            </Link>
          ))}
        </div>
      </Section>

      {/* <Grid title="New Arrivals" eyebrow="Fresh from the atelier" items={collections?.newArrivals} /> */}
      <Promo />
      <Grid title="Trending Now" eyebrow="Loved this season" items={collections?.trending} />
      {/* <Grid title="Festive Offers" eyebrow="Up to 40% off" items={collections?.onSale} /> */}

      <Section className="border-y border-border bg-card/30" eyebrow="Our Story" title="The House of Yudhas">
        <div className="mx-auto max-w-3xl space-y-5 text-center text-sm leading-loose text-muted-foreground">
          <img src={logo} alt="YUDHAS FASHION" loading="lazy" width={1152} height={576} className="mx-auto h-14 w-auto" />
          <p>
            Yudhas Fashion was founded in Thogamalai, Karur by Shamuga Priya, who started with one simple idea: every woman deserves jewellery that makes her feel special, without having to wait for a special occasion. What began as a small collection of earrings and bangles she loved herself has grown into a studio of carefully chosen pieces for every mood and every celebration.
          </p>
          <p>
            Each piece is photographed, priced and released by our own studio, so what you see is
            exactly what arrives in your gold-sealed Yudhas box.
          </p>
        </div>
      </Section>

      {/* <Section eyebrow="Kind Words" title="Loved by 12,000+ Women">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              name: "Divya R.",
              city: "Coimbatore",
              text: "The jhumkas are even more beautiful in person. Packaging felt like a designer store.",
            },
            {
              name: "Meenakshi S.",
              city: "Madurai",
              text: "Bought a Kanjivaram for my sister's wedding — the zari work is genuinely premium.",
            },
            {
              name: "Aarthi K.",
              city: "Chennai",
              text: "Delivered in two days and the gold finish hasn't faded after months of wear.",
            },
          ].map((t) => (
            <figure key={t.name} className="glass-panel p-7 text-center">
              <div className="mx-auto mb-4 flex justify-center gap-1 text-primary">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Sparkles key={i} className="size-3.5" />
                ))}
              </div>
              <blockquote className="text-sm leading-relaxed text-muted-foreground">
                “{t.text}”
              </blockquote>
              <figcaption className="mt-5 text-[0.68rem] tracking-[0.2em] text-primary uppercase">
                {t.name} · {t.city}
              </figcaption>
            </figure>
          ))}
        </div>
      </Section> */}
{/* 
      <Newsletter /> */}
    </>
  );
}

function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      {/* <img
        src={heroImage}
        alt="Model wearing a magenta silk saree with gold jewellery"
        width={1600}
        height={1200}
        className="absolute inset-0 size-full object-cover object-right"
      /> */}
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/20" />
      <div className="relative mx-auto flex min-h-[82vh] max-w-7xl items-center px-4 py-20 lg:px-8">
        <div className="animate-rise max-w-xl space-y-7">
          <p className="eyebrow">Festive Collection 2026</p>
          <h1 className="text-5xl leading-[1.05] sm:text-6xl lg:text-7xl">
            Adorn Every Moment with <span className="text-gold-gradient">Yudhas Fashion</span>
            <br />
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
            Earrings, bangles, chains, bracelets and hair clips, designed to turn everyday looks into statement ones. Made for the women who make every occasion their own.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link to="/shop" className="inline-flex">
              <GoldButton>
                Shop Now <ArrowRight className="size-4" />
              </GoldButton>
            </Link>
            {/* <Link to="/new-arrivals" className={OutlineLinkStyle()}>
              New Arrivals
            </Link> */}
          </div>
        </div>
      </div>
    </section>
  );
}

function Marquee() {
  const items = [
    { icon: Truck, label: "Free delivery above ₹5,000" },
    { icon: Lock, label: "SECURE PAYMENTS" },
    { icon: ShieldCheck, label: "	PAN-INDIA SHIPPING" },
    { icon: Sparkles, label: "GIFT-READY PACKAGING" },
  ];
  return (
    <div className="border-y border-border bg-card/40">
      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-6 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
        {items.map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center justify-center gap-3">
            <Icon className="size-4 text-primary" />
            <span className="text-[0.66rem] tracking-[0.18em] text-muted-foreground uppercase">
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Grid({
  title,
  eyebrow,
  items,
}: {
  title: string;
  eyebrow: string;
  items: Product[] | undefined;
}) {
  return (
    <Section
      eyebrow={eyebrow}
      title={title}
      action={
        <Link to="/shop" className={OutlineLinkStyle()}>
          View all <ArrowRight className="size-4" />
        </Link>
      }
    >
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {items
          ? items.map((p) => <ProductCard key={p.id} product={p} />)
          : Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-4/5 animate-pulse border border-border bg-card" />
            ))}
      </div>
    </Section>
  );
}

function Promo() {
  return (
    <section className="bg-wine-gradient">
      <div className="mx-auto max-w-7xl px-4 py-16 text-center lg:px-8">
        <p className="text-[0.66rem] tracking-[0.3em] text-ivory/80 uppercase">Limited Time</p>
        <h2 className="mt-4 text-4xl text-ivory sm:text-5xl">Festive Gold Sale — Up to 40% Off</h2>
        <p className="mx-auto mt-4 max-w-xl text-sm text-ivory/80">
          Use code <span className="text-champagne">YUDHAS10</span> for an extra 10% off orders above
          ₹2,000.
        </p>
        <Link to="/shop" search={{ discounted: true }} className="mt-8 inline-flex">
          <GoldButton>Shop the sale</GoldButton>
        </Link>
      </div>
    </section>
  );
}


