import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";

export const Route = createFileRoute("/signout")({
  head: () => ({
    meta: [
      { title: "Signing out | YUDHAS FASHION" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SignOutPage,
});

function SignOutPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const started = useRef(false);
  const [error, setError] = useState<string | null>(null);

  const signOut = useCallback(async () => {
    setError(null);
    try {
      await logout();
      toast.success("Signed out");
      await navigate({ to: "/", replace: true });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to sign out",
      );
    }
  }, [logout, navigate]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void signOut();
  }, [signOut]);

  return (
    <section className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="eyebrow">Yudhas Circle</p>
      <h1 className="mt-3 text-4xl">Sign out</h1>
      {error ? (
        <div role="alert" className="mt-6 space-y-4">
          <p className="text-sm text-destructive">{error}</p>
          <button
            type="button"
            onClick={() => void signOut()}
            className="text-sm text-primary underline underline-offset-4"
          >
            Try again
          </button>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          Signing out of your account…
        </p>
      )}
    </section>
  );
}
