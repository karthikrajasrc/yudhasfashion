import { createFileRoute } from "@tanstack/react-router";
import { Section } from "@/components/section";

export const Route = createFileRoute("/return-exchange")({
  head: () => ({
    meta: [
      { title: "Return/Exchange Policy | YUDHAS FASHION" },
      {
        name: "description",
        content:
          "Returns or exchanges are available only for products damaged during transport. An uncut unboxing video is mandatory.",
      },
    ],
  }),
  component: ReturnExchangePolicy,
});

function ReturnExchangePolicy() {
  return (
    <Section
      eyebrow="Customer Care"
      title="Return/Exchange Policy"
      className="max-w-4xl"
    >
      <div className="space-y-6 border border-primary/50 bg-primary/5 p-6 sm:p-8">
        <p className="text-lg font-bold leading-relaxed text-primary">
          Return/Exchange Policy:
        </p>
        <p className="text-base font-bold leading-relaxed">
          Product received damaged due to transport issue only — Return/Exchange
          available.
        </p>
        <div className="space-y-2 border-l-4 border-amber-500 bg-amber-500/10 p-4">
          <p className="font-bold leading-relaxed">
            ⚠️ Uncut Unboxing Video is mandatory for Return/Exchange.
          </p>
          <p className="font-bold leading-relaxed">
            Video should be recorded continuously while opening the parcel.
          </p>
        </div>
        <p className="text-base font-bold leading-relaxed text-destructive">
          No Return/Exchange for any other reasons.
        </p>
      </div>
    </Section>
  );
}
