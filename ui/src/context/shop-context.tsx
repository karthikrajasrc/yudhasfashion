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
  wishlist: string[];
  ready: boolean;
  addToCart: (line: Omit<CartLine, "quantity">, quantity?: number) => void;
  removeFromCart: (productId: string, size?: string, color?: string) => void;
  setQuantity: (productId: string, quantity: number, size?: string, color?: string) => void;
  clearCart: () => void;
  toggleWishlist: (productId: string) => void;
  isWishlisted: (productId: string) => boolean;
  cartCount: number;
};

const ShopContext = createContext<ShopState | null>(null);
const CART_KEY = "yf.cart";
const WISH_KEY = "yf.wishlist";

const sameLine = (l: CartLine, id: string, size?: string, color?: string) =>
  l.productId === id && l.size === size && l.color === color;

export function ShopProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const c = localStorage.getItem(CART_KEY);
      const w = localStorage.getItem(WISH_KEY);
      if (c) setCart(JSON.parse(c));
      if (w) setWishlist(JSON.parse(w));
    } catch {
      /* ignore corrupted storage */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart, ready]);

  useEffect(() => {
    if (ready) localStorage.setItem(WISH_KEY, JSON.stringify(wishlist));
  }, [wishlist, ready]);

  const addToCart = useCallback((line: Omit<CartLine, "quantity">, quantity = 1) => {
    setCart((prev) => {
      const existing = prev.find((l) => sameLine(l, line.productId, line.size, line.color));
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
  }, []);

  const removeFromCart = useCallback((productId: string, size?: string, color?: string) => {
    setCart((prev) => prev.filter((l) => !sameLine(l, productId, size, color)));
  }, []);

  const setQuantity = useCallback(
    (productId: string, quantity: number, size?: string, color?: string) => {
      setCart((prev) =>
        prev
          .map((l) =>
            sameLine(l, productId, size, color) ? { ...l, quantity: Math.max(1, quantity) } : l,
          )
          .filter((l) => l.quantity > 0),
      );
    },
    [],
  );

  const clearCart = useCallback(() => setCart([]), []);

  const toggleWishlist = useCallback((productId: string) => {
    setWishlist((prev) => {
      const has = prev.includes(productId);
      toast.success(has ? "Removed from wishlist" : "Saved to wishlist");
      return has ? prev.filter((id) => id !== productId) : [...prev, productId];
    });
  }, []);

  const value = useMemo<ShopState>(
    () => ({
      cart,
      wishlist,
      ready,
      addToCart,
      removeFromCart,
      setQuantity,
      clearCart,
      toggleWishlist,
      isWishlisted: (id: string) => wishlist.includes(id),
      cartCount: cart.reduce((n, l) => n + l.quantity, 0),
    }),
    [cart, wishlist, ready, addToCart, removeFromCart, setQuantity, clearCart, toggleWishlist],
  );

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop() {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error("useShop must be used inside ShopProvider");
  return ctx;
}
