import { Link } from "@tanstack/react-router";
import { Facebook, Instagram, Mail, MessageCircle, Phone } from "lucide-react";
import logo from "@/assets/logo.png";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card/40">
      <div className="mx-auto max-w-7xl px-4 py-14 lg:px-8">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="space-y-4">
            <img src={logo} alt="YUDHAS FASHION" loading="lazy" width={1152} height={576} className="h-11 w-auto" />
            <p className="text-sm leading-relaxed text-muted-foreground">
              We bring you earrings, bangles, chains, bracelets and clips that turn everyday looks into statement ones, designed by a woman who believes every woman deserves to shine.
            </p>
            <div className="flex gap-3 text-primary">
              <a href="https://instagram.com" aria-label="Instagram" className="hover:opacity-70">
                <Instagram className="size-5" />
              </a>
              <a href="https://wa.me/919000000000" aria-label="WhatsApp" className="hover:opacity-70">
                <MessageCircle className="size-5" />
              </a>
            </div>
          </div>

          <FooterCol title="Shop">
            <Link to="/shop" className="block hover:text-primary">All Products</Link>
            <Link to="/new-arrivals" className="block hover:text-primary">New Arrivals</Link>
            <Link to="/categories" className="block hover:text-primary">Categories</Link>
          </FooterCol>

          <FooterCol title="Help">
            <Link to="/contact" className="block hover:text-primary">Contact Us</Link>
            <Link to="/cart" className="block hover:text-primary">Your Bag</Link>
          </FooterCol>

          <FooterCol title="Contact">
            <p className="flex items-center gap-2">
              <Phone className="size-4 text-primary" /> +91 90000 00000
            </p>
            <p className="flex items-center gap-2">
              <Mail className="size-4 text-primary" /> yudhasfashion@gmail.com
            </p>
            <p>Anna Salai, Chennai, Tamil Nadu 600002</p>
          </FooterCol>
        </div>

        <div className="hairline my-10" />
        <div className="flex flex-col items-center justify-between gap-3 text-[0.68rem] tracking-[0.18em] text-muted-foreground uppercase sm:flex-row">
          <p>© {new Date().getFullYear()} Yudhas Fashion. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h4 className="eyebrow">{title}</h4>
      <div className="space-y-2 text-sm text-muted-foreground">{children}</div>
    </div>
  );
}
