import { createFileRoute, Link } from "@tanstack/react-router";
import { User } from "lucide-react";
import { GoldButton } from "@/components/section";
import { useAuth } from "@/context/auth-context";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "My Account | YUDHAS FASHION" },
      {
        name: "description",
        content: "Sign in to manage your Yudhas Fashion account.",
      },
      { property: "og:title", content: "My Account | YUDHAS FASHION" },
      {
        property: "og:description",
        content: "Manage your Yudhas Fashion account.",
      },
    ],
  }),
  component: Account,
});

function Account() {
  const { user, loading, error } = useAuth();

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 lg:px-8">
      <header className="mb-10 text-center">
        <p className="eyebrow">Yudhas Circle</p>
        <h1 className="mt-3 text-4xl">My Account</h1>
        <div className="hairline mx-auto mt-6 w-24" />
      </header>

      <div className="glass-panel space-y-4 p-8 text-center">
        <User className="mx-auto size-9 text-primary" />
        {loading ? (
          <p className="text-sm text-muted-foreground">
            Checking your account…
          </p>
        ) : user ? (
          <>
            <h2 className="text-2xl">Welcome, {user.name}</h2>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <p className="text-xs uppercase tracking-[0.2em] text-primary">
              {user.role} account
            </p>
            <Link
              to="/orders"
              className="inline-flex text-sm text-primary underline underline-offset-4"
            >
              View my orders
            </Link>{" "}
            &nbsp; &nbsp;
            {user.role === "admin" ? (
              <Link
                to="/admin"
                className="inline-flex text-sm text-primary underline underline-offset-4"
              >
                Open admin dashboard
              </Link>
            ) : null}
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex justify-center gap-3 pt-2">
              <Link to="/signout" className="inline-flex">
                <GoldButton type="button">Sign out</GoldButton>
              </Link>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-2xl">Your Yudhas Fashion account</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Sign in to manage your Yudhas Fashion account. Your bag is saved
              on this device.
            </p>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="pt-2">
              <Link to="/auth" className="inline-flex">
                <GoldButton>Sign in or register</GoldButton>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
