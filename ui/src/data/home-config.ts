export type HomeBanner = {
  desktopImage: string;
  mobileImage: string;
  title: string;
  link: string;
};

export const homeBanners: HomeBanner[] = [
  {
    desktopImage: "/images/Luxurious New Arrivals Jewellery Banner.webp",
    mobileImage: "/images/01_new_arrivals_mobile_335x188.webp",
    title: "New Arrivals",
    link: "/new-arrivals",
  },
  {
    desktopImage: "/images/YUDHAS Everyday Elegance Jewelry Collection.webp",
    mobileImage: "/images/02_everyday_elegance_mobile_335x188.webp",
    title: "Everyday Elegance",
    link: "/shop",
  },
  {
    desktopImage: "/images/Emerald Festival Jewelry Collection.webp",
    mobileImage: "/images/03_festival_collection_mobile_335x188.webp",
    title: "Festival Collection",
    link: "/shop",
  },
];
