const apiUrl = (
  import.meta.env["VITE_API_URL"] ?? "http://localhost:4000"
).replace(/\/$/, "");

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
};

type AuthResponse = { user: AuthUser };

async function request<T>(path: string, body?: unknown): Promise<T> {
  const options: RequestInit = {
    method: body === undefined ? "GET" : "POST",
    credentials: "include",
  };
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 10_000);
  options.signal = controller.signal;

  if (body !== undefined) {
    options.headers = { "Content-Type": "application/json" };
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${apiUrl}/api/auth${path}`, options);
    const result = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    if (!response.ok) {
      throw new Error(
        result?.message ?? "Unable to complete the authentication request",
      );
    }
    return result as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        "The authentication server took too long to respond. Check that the API and MongoDB are running.",
      );
    }
    if (error instanceof TypeError) {
      throw new Error(
        "Cannot reach the authentication server. Start the API with `npm run dev` from the api folder.",
      );
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export const authService = {
  register: (name: string, email: string, password: string) =>
    request<AuthResponse>("/register", { name, email, password }),
  login: (email: string, password: string) =>
    request<AuthResponse>("/login", { email, password }),
  loginWithGoogle: (credential: string) =>
    request<AuthResponse>("/google", { credential }),
  currentUser: () => request<AuthResponse>("/me"),
  logout: () => request<{ message: string }>("/logout"),
};
