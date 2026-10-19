import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { authService, type AuthUser } from "@/services/auth.service";

type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  register: (name: string, email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshUser = useCallback(async () => {
    try {
      const result = await authService.currentUser();
      setUser(result.user);
      setError(null);
    } catch (requestError) {
      if (
        requestError instanceof Error &&
        requestError.message === "Authentication required"
      ) {
        setUser(null);
        setError(null);
      } else {
        setUser(null);
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to check sign-in status",
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const result = await authService.register(name, email, password);
      setUser(result.user);
      setError(null);
    },
    [],
  );

  const login = useCallback(async (email: string, password: string) => {
    const result = await authService.login(email, password);
    setUser(result.user);
    setError(null);
  }, []);

  const loginWithGoogle = useCallback(async (credential: string) => {
    const result = await authService.loginWithGoogle(credential);
    setUser(result.user);
    setError(null);
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
    setError(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, error, register, login, loginWithGoogle, logout }),
    [user, loading, error, register, login, loginWithGoogle, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
