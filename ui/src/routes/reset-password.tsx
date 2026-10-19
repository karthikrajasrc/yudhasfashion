import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { GoldButton } from "@/components/section";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset Password | YUDHAS FASHION" },
      { name: "description", content: "Set a new password for your Yudhas Fashion account." },
      { property: "og:title", content: "Reset Password | YUDHAS FASHION" },
      { property: "og:description", content: "Set a new password for your account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = z.string().min(8, "Password must be at least 8 characters").max(72).safeParse(password);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid password");
      return;
    }
    setBusy(true);
    setBusy(false);
    toast.success("Password saved for this UI demo");
    navigate({ to: "/", replace: true });
  };

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-5 py-16">
      <div className="rounded-2xl border border-border bg-card/60 p-7 backdrop-blur">
        <h1 className="font-serif text-3xl text-foreground">Set a new password</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Open this page from the reset link in your email, then choose a new password.
        </p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password"
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none"
            required
          />
          <GoldButton type="submit" className="w-full justify-center" disabled={busy}>
            Update password
          </GoldButton>
        </form>
      </div>
    </div>
  );
}
