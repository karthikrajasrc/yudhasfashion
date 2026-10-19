import { createFileRoute } from "@tanstack/react-router";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { toast } from "sonner";
import { GoldButton } from "@/components/section";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Us | YUDHAS FASHION" },
      {
        name: "description",
        content:
          "Talk to the Yudhas Fashion studio in Chennai about orders, sizing, styling or wholesale enquiries.",
      },
      { property: "og:title", content: "Contact Us | YUDHAS FASHION" },
      { property: "og:description", content: "Reach the Yudhas Fashion client care team." },
    ],
  }),
  component: Contact,
});

function Contact() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
      <header className="mb-12 text-center">
        <p className="eyebrow">Client Care</p>
        <h1 className="mt-3 text-4xl sm:text-5xl">Contact Us</h1>
        <div className="hairline mx-auto mt-6 w-24" />
      </header>

      <div className="grid gap-10 lg:grid-cols-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            toast.success("Message sent", { description: "Our team replies within one business day." });
            (e.currentTarget as HTMLFormElement).reset();
          }}
          className="space-y-4"
        >
          <Field label="Full name" name="name" />
          <Field label="Mobile number" name="phone" type="tel" />
          <Field label="Email" name="email" type="email" />
          <div className="space-y-2">
            <label className="eyebrow block" htmlFor="message">
              Message
            </label>
            <textarea
              id="message"
              name="message"
              required
              rows={5}
              className="w-full border border-input bg-transparent px-4 py-3 text-sm outline-none focus:border-primary"
            />
          </div>
          <GoldButton type="submit">Send message</GoldButton>
        </form>

        <div className="space-y-5">
          <InfoCard icon={<Phone className="size-4" />} title="Call us" body="+91 97152 25578 · Mon–Sun" />
          <InfoCard icon={<MessageCircle className="size-4" />} title="WhatsApp" body="+91 97152 25578" />
          <InfoCard icon={<Mail className="size-4" />} title="Email" body="yudhasfashion@gmail.com" />
          <InfoCard
            icon={<MapPin className="size-4" />}
            title="Address"
            body="20/175, vedhasalapuram street, Thogaimalai, kulithalai-tk, Karur-621313"
          />
        </div>
      </div>
    </div>
  );
}

function Field({ label, name, type = "text" }: { label: string; name: string; type?: string }) {
  return (
    <div className="space-y-2">
      <label className="eyebrow block" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required
        className="w-full border border-input bg-transparent px-4 py-3 text-sm outline-none focus:border-primary"
      />
    </div>
  );
}

function InfoCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="glass-panel flex items-start gap-4 p-6">
      <span className="mt-0.5 text-primary">{icon}</span>
      <div>
        <h2 className="text-lg">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}
