import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Lock, Mail } from "lucide-react";
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import { z } from "zod";
import { GoldButton } from "@/components/section";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";

const searchSchema = z.object({
  redirect: z.string().optional(),
  mode: z.enum(["login", "register"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Sign In or Create Account | YUDHAS FASHION" },
      {
        name: "description",
        content:
          "Sign in to Yudhas Fashion to view product details, save favourites and track your silk and jewellery orders.",
      },
      { property: "og:title", content: "Sign In | YUDHAS FASHION" },
      {
        property: "og:description",
        content: "Access your Yudhas Fashion account.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

const credentials = z.object({
  email: z.string().trim().email("Enter a valid email address").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
});
const registration = credentials.extend({
  name: z.string().trim().min(1).max(100),
});
const googleClientId = import.meta.env["VITE_GOOGLE_CLIENT_ID"];

const safePath = (value: string | undefined) =>
  value && value.startsWith("/") && !value.startsWith("//") ? value : "/";

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { register, login, loginWithGoogle } = useAuth();
  const [mode, setMode] = useState<"login" | "register">(
    search.mode ?? "login",
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const target = safePath(search.redirect);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);
    setBusy(true);
    try {
      if (mode === "register") {
        const parsed = registration.safeParse({ name, email, password });
        if (!parsed.success) {
          setErrorMessage(
            parsed.error.issues[0]?.message ?? "Check your details",
          );
          return;
        }
        await register(
          parsed.data.name,
          parsed.data.email,
          parsed.data.password,
        );
        toast.success("Your account has been created");
      } else {
        const parsed = credentials.safeParse({ email, password });
        if (!parsed.success) {
          setErrorMessage(
            parsed.error.issues[0]?.message ?? "Check your details",
          );
          return;
        }
        await login(parsed.data.email, parsed.data.password);
        toast.success("Signed in successfully");
      }
      navigate({ to: target, replace: true });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "An unexpected server error occurred",
      );
    } finally {
      setBusy(false);
    }
  };

  const google = async (credential: string) => {
    setErrorMessage(null);
    setBusy(true);
    try {
      await loginWithGoogle(credential);
      toast.success("Signed in with Google");
      navigate({ to: target, replace: true });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "An unexpected server error occurred",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[80vh] w-full max-w-md flex-col justify-center px-5 py-16">
      <div className="rounded-2xl border border-border bg-card/60 p-7 backdrop-blur">
        <p className="text-[0.7rem] uppercase tracking-[0.35em] text-primary">
          Yudhas Fashion
        </p>
        <h1 className="mt-3 font-serif text-3xl text-foreground">
          {mode === "login" ? "Sign in" : "Create your account"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "login"
            ? "Sign in to view product details, save favourites and check out."
            : "Create an account to explore the full collection and save your bag."}
        </p>
        {errorMessage && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {errorMessage}
          </p>
        )}

        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === "register" ? (
            <label className="block">
              <span className="text-[0.7rem] uppercase tracking-[0.2em] text-muted-foreground">
                Name
              </span>
              <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-input bg-background px-3">
                <input
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-transparent py-2.5 text-sm text-foreground outline-none"
                  placeholder="Your name"
                  maxLength={100}
                  required
                />
              </div>
            </label>
          ) : null}
          <label className="block">
            <span className="text-[0.7rem] uppercase tracking-[0.2em] text-muted-foreground">
              Email
            </span>
            <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-input bg-background px-3">
              <Mail className="size-4 text-muted-foreground" />
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent py-2.5 text-sm text-foreground outline-none"
                placeholder="you@example.com"
                required
              />
            </div>
          </label>
          <label className="block">
            <span className="text-[0.7rem] uppercase tracking-[0.2em] text-muted-foreground">
              Password
            </span>
            <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-input bg-background px-3">
              <Lock className="size-4 text-muted-foreground" />
              <input
                type="password"
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent py-2.5 text-sm text-foreground outline-none"
                placeholder="••••••••"
                required
              />
            </div>
          </label>

          <GoldButton
            type="submit"
            className="w-full justify-center"
            disabled={busy}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            {mode === "login" ? "Sign in" : "Create account"}
          </GoldButton>
        </form>

        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="text-[0.65rem] uppercase tracking-[0.3em] text-muted-foreground">
            or
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>

        {googleClientId ? (
          <div
            className={cn(
              "flex justify-center",
              busy && "pointer-events-none opacity-60",
            )}
          >
            <GoogleOAuthProvider clientId={googleClientId}>
              <GoogleLogin
                onSuccess={(response) => {
                  if (!response.credential) {
                    setErrorMessage(
                      "Google did not return a sign-in credential",
                    );
                    return;
                  }
                  void google(response.credential);
                }}
                onError={() =>
                  setErrorMessage(
                    "Google sign-in failed. Check that this site origin is authorized for your Google OAuth client.",
                  )
                }
                theme="outline"
                size="large"
                text="continue_with"
                shape="rectangular"
                logo_alignment="left"
                width={300}
              />
            </GoogleOAuthProvider>
          </div>
        ) : (
          <p className="text-center text-xs text-muted-foreground">
            Google sign-in needs VITE_GOOGLE_CLIENT_ID in the frontend
            environment.
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <button
            type="button"
            className="underline underline-offset-4 hover:text-primary"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
            }}
          >
            {mode === "login"
              ? "New here? Create an account"
              : "Already have an account? Sign in"}
          </button>
          {mode === "login" ? (
            <button
              type="button"
              onClick={() =>
                toast.info("Password reset is not configured yet.")
              }
              className="underline underline-offset-4 hover:text-primary"
            >
              Forgot password?
            </button>
          ) : null}
        </div>
      </div>

      <Link
        to="/"
        className="mx-auto mt-6 text-xs uppercase tracking-[0.25em] text-muted-foreground hover:text-primary"
      >
        Back to store
      </Link>
    </div>
  );
}
