import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Section({
  eyebrow,
  title,
  description,
  children,
  className,
  action,
}: {
  eyebrow?: string;
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <section className={cn("mx-auto max-w-7xl px-4 py-16 lg:px-8 lg:py-24", className)}>
      {(eyebrow || title) && (
        <div className="mb-10 text-center">
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          {title && <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl">{title}</h2>}
          {description && (
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
          <div className="hairline mx-auto mt-6 w-24" />
        </div>
      )}
      {children}
      {action && <div className="mt-10 flex justify-center">{action}</div>}
    </section>
  );
}

export function GoldButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-2 bg-gold-gradient px-7 py-3 text-[0.7rem] tracking-[0.24em] text-primary-foreground uppercase transition-opacity hover:opacity-90 disabled:opacity-50",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function OutlineLinkStyle(className?: string) {
  return cn(
    "inline-flex items-center justify-center gap-2 border border-primary/60 px-7 py-3 text-[0.7rem] tracking-[0.24em] text-primary uppercase transition-colors hover:bg-primary hover:text-primary-foreground",
    className,
  );
}
