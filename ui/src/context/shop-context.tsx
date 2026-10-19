import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

export type CartLine = {
  productId: string;
  name: string;
  slug: string;
  image: string;
  price: number;
  salePrice: number | null;
  size?: string | undefined;
  color?: string | undefined;
  quantity: number;
};

type ShopState = {
  cart: CartLine[];
  ready: boolean;
  addToCart: (line: Omit<CartLine, "quantity">, quantity?: number) => void;
  removeFromCart: (productId: string, size?: string, color?: string) => void;
  setQuantity: (
    productId: string,
    quantity: number,
    size?: string,
    color?: string,
  ) => void;
  clearCart: () => void;
  cartCount: number;
};

const ShopContext = createContext<ShopState | null>(null);
const CART_KEY = "yf.cart";

const sameLine = (l: CartLine, id: string, size?: string, color?: string) =>
  l.productId === id && l.size === size && l.color === color;

const isPersistedCartLine = (value: unknown): value is CartLine => {
  if (!value || typeof value !== "object") return false;
  const line = value as Partial<CartLine>;
  return (
    typeof line.productId === "string" &&
    /^[a-f\d]{24}$/i.test(line.productId) &&
    typeof line.name === "string" &&
    typeof line.slug === "string" &&
    typeof line.image === "string" &&
    typeof line.price === "number" &&
    (typeof line.salePrice === "number" || line.salePrice === null) &&
    typeof line.quantity === "number"
  );
};

export function ShopProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const c = localStorage.getItem(CART_KEY);
      if (c) {
        const savedCart: unknown = JSON.parse(c);
        if (Array.isArray(savedCart))
          setCart(savedCart.filter(isPersistedCartLine));
      }
      localStorage.removeItem("yf.wishlist");
    } catch {
      /* ignore corrupted storage */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart, ready]);

  const addToCart = useCallback(
    (line: Omit<CartLine, "quantity">, quantity = 1) => {
      setCart((prev) => {
        const existing = prev.find((l) =>
          sameLine(l, line.productId, line.size, line.color),
        );
        if (existing) {
          return prev.map((l) =>
            sameLine(l, line.productId, line.size, line.color)
              ? { ...l, quantity: l.quantity + quantity }
              : l,
          );
        }
        return [...prev, { ...line, quantity }];
      });
      toast.success("Added to bag", { description: line.name });
    },
    [],
  );

  const removeFromCart = useCallback(
    (productId: string, size?: string, color?: string) => {
      setCart((prev) =>
        prev.filter((l) => !sameLine(l, productId, size, color)),
      );
    },
    [],
  );

  const setQuantity = useCallback(
    (productId: string, quantity: number, size?: string, color?: string) => {
      setCart((prev) =>
        prev
          .map((l) =>
            sameLine(l, productId, size, color)
              ? { ...l, quantity: Math.max(1, quantity) }
              : l,
          )
          .filter((l) => l.quantity > 0),
      );
    },
    [],
  );

  const clearCart = useCallback(() => setCart([]), []);

  const value = useMemo<ShopState>(
    () => ({
      cart,
      ready,
      addToCart,
      removeFromCart,
      setQuantity,
      clearCart,
      cartCount: cart.reduce((n, l) => n + l.quantity, 0),
    }),
    [cart, ready, addToCart, removeFromCart, setQuantity, clearCart],
  );

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop() {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error("useShop must be used inside ShopProvider");
  return ctx;
}
