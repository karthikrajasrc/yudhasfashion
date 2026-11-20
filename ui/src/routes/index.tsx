import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import logo from "@/assets/logo.png";
import { Section } from "@/components/section";
import { ProductCard } from "@/components/product-card";
import {
  getCategoryProducts,
  getCategoryTree,
} from "@/services/shop.service";
import { homeBanners } from "@/data/home-config";
import type { Category } from "@/data/catalog";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "YUDHAS FASHION — Fashion Forward" },
      {
        name: "description",
        content:
          "Shop handcrafted gold-finish jewellery, temple necklaces and pure silk sarees at Yudhas Fashion.",
      },
      {
        property: "og:title",
        content: "YUDHAS FASHION — Fashion Forward",
      },
      {
        property: "og:description",
        content:
          "Handcrafted jewellery and premium silks for modern Indian women.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { data: tree } = useQuery({
    queryKey: ["category-tree"],
    queryFn: getCategoryTree,
  });
  const homeCategories = (tree ?? []).flatMap((category) => [
    category,
    ...category.children,
  ]);
  const categorySlugs = homeCategories.map((category) => category.slug);
  const { data: categoryProducts } = useQuery({
    queryKey: ["home-category-products", categorySlugs],
    queryFn: () => getCategoryProducts(categorySlugs),
    enabled: categorySlugs.length > 0,
  });
  const mergedProducts = homeCategories.flatMap(
    (category) => categoryProducts?.[category.slug] ?? [],
  );
  const uniqueProducts = Array.from(
    new Map(mergedProducts.map((product) => [product.id, product])).values(),
  );

  return (
    <>
      <Hero />
      <CategoryIcons categories={homeCategories} />

      <Section
        eyebrow="Recently Added"
        title="Our Products"
        description="Explore the latest additions from every collection."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-6 lg:grid-cols-5">
          {categoryProducts
            ? uniqueProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))
            : Array.from({ length: 10 }).map((_, index) => (
                <div
                  key={index}
                  className="aspect-4/5 animate-pulse border border-border bg-card"
                />
              ))}
        </div>
        {categoryProducts && uniqueProducts.length > 0 ? (
          <div className="mt-10 flex justify-center">
            <Link
              to="/shop"
              className="inline-flex items-center justify-center gap-2 border border-primary/60 px-7 py-3 text-[0.7rem] tracking-[0.24em] text-primary uppercase transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              View More <ArrowRight className="size-4" />
            </Link>
          </div>
        ) : null}
      </Section>

      <Section
        className="border-y border-border bg-card/30"
        eyebrow="Our Story"
        title="The House of Yudhas"
      >
        <div className="mx-auto max-w-3xl space-y-5 text-center text-sm leading-loose text-muted-foreground">
          <img
            src={logo}
            alt="YUDHAS FASHION"
            loading="lazy"
            width={1152}
            height={576}
            className="mx-auto h-14 w-auto"
          />
          <p>
            Yudhas Fashion was founded in Thogamalai, Karur by Shamuga Priya,
            who started with one simple idea: every woman deserves jewellery
            that makes her feel special, without having to wait for a special
            occasion. What began as a small collection of earrings and bangles
            she loved herself has grown into a studio of carefully chosen pieces
            for every mood and every celebration.
          </p>
          <p>
            Each piece is photographed, priced and released by our own studio,
            so what you see is exactly what arrives in your gold-sealed Yudhas
            box.
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

function CategoryIcons({ categories }: { categories: Category[] }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
      <div className="flex gap-5 overflow-x-auto pb-2 sm:justify-center sm:gap-8">
        {categories.map((category) => (
          <Link
            key={category.id}
            to="/shop"
            search={{ category: category.slug }}
            className="group flex w-[82px] shrink-0 flex-col items-center text-center"
          >
            <span className="grid size-[72px] place-items-center overflow-hidden rounded-full border border-primary/25 bg-card shadow-sm transition-transform group-hover:-translate-y-1 group-hover:border-primary">
              {category.imageUrl ? (
                <img
                  src={category.imageUrl}
                  alt={category.name}
                  className="size-full object-cover"
                  loading="lazy"
                />
              ) : (
                <span className="text-2xl text-primary">
                  {category.name.charAt(0).toUpperCase()}
                </span>
              )}
            </span>
            <span className="mt-2 line-clamp-2 text-xs leading-tight text-foreground">
              {category.name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function Hero() {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [activeBanner, setActiveBanner] = useState(0);

  const scrollBanner = (index: number) => {
    const carousel = carouselRef.current;
    const slide = carousel?.children[index] as HTMLElement | undefined;
    if (!carousel || !slide) return;
    const carouselRect = carousel.getBoundingClientRect();
    const slideRect = slide.getBoundingClientRect();
    carousel.scrollTo({
      left: carousel.scrollLeft + slideRect.left - carouselRect.left,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    if (homeBanners.length < 2) return;

    const interval = window.setInterval(() => {
      const carousel = carouselRef.current;
      if (!carousel) return;
      const slides = Array.from(carousel.children) as HTMLElement[];
      if (slides.length === 0) return;

      setActiveBanner((current) => {
        const next = (current + 1) % slides.length;
        const carouselRect = carousel.getBoundingClientRect();
        const slideRect = slides[next].getBoundingClientRect();
        carousel.scrollTo({
          left: carousel.scrollLeft + slideRect.left - carouselRect.left,
          behavior: "smooth",
        });
        return next;
      });
    }, 5000);

    return () => window.clearInterval(interval);
  }, []);

  if (homeBanners.length === 0) return null;
  return (
    <section className="mx-auto w-full max-w-[1400px] px-4 pt-6 lg:px-0">
      <div
        ref={carouselRef}
        dir="ltr"
        className="flex touch-pan-x snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain scroll-smooth pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Featured promotions"
        onScroll={(event) => {
          const carousel = event.currentTarget;
          const slides = Array.from(carousel.children) as HTMLElement[];
          if (slides.length === 0) return;
          const carouselRect = carousel.getBoundingClientRect();
          const nearest = slides.reduce(
            (closest, slide, index) =>
              Math.abs(
                slide.getBoundingClientRect().left - carouselRect.left,
              ) <
              Math.abs(
                slides[closest].getBoundingClientRect().left -
                  carouselRect.left,
              )
                ? index
                : closest,
            0,
          );
          setActiveBanner(nearest);
        }}
      >
        {homeBanners.map((banner) => (
          <Link
            key={banner.title}
            to={banner.link as "/shop"}
            className="group relative block h-[188px] w-[335px] shrink-0 snap-center overflow-hidden rounded-[15px] border border-border sm:h-[370px] sm:w-[1400px]"
            aria-label={banner.title}
          >
            <picture>
              <source
                media="(max-width: 640px)"
                srcSet={banner.mobileImage}
              />
              <img
                src={banner.desktopImage}
                alt={banner.title}
                loading="eager"
                className="size-full object-cover transition-transform duration-700 group-hover:scale-[1.015]"
              />
            </picture>
          </Link>
        ))}
      </div>
      {homeBanners.length > 1 ? (
        <div className="mt-4 flex justify-center gap-2">
          {homeBanners.map((banner, index) => (
            <button
              key={banner.title}
              type="button"
              aria-label={`Go to ${banner.title} banner`}
              onClick={() => {
                scrollBanner(index);
                setActiveBanner(index);
              }}
              className={activeBanner === index
                ? "size-2.5 rounded-full bg-primary"
                : "size-2.5 rounded-full border border-primary/60 bg-transparent"}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}


