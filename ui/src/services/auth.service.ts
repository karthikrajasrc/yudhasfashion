import { readApiResponse } from "@/services/api-response";

const apiUrl = (
  import.meta.env["BACKEND_API_URL"] ?? "http://localhost:4000"
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
    return await readApiResponse<T>(
      fetch(`${apiUrl}/api/auth${path}`, options),
      "Unable to complete the authentication request",
    );
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
  logout: () => request<{ message: string }>("/logout", {}),
};
