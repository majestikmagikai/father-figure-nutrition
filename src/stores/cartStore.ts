import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface CartItem {
  lineId: string;
  productId: string;
  handle: string;
  title: string;
  image: { url: string; altText: string };
  variantId: string;
  price: string;
  currencyCode: string;
  quantity: number;
  // Present when this line was added as part of a bundle purchase. All lines that
  // share a bundleInstanceId were added together by one "Add Bundle to Cart" click
  // and are priced as a single unit at checkout (see create-payment-intent).
  bundleInstanceId?: string;
  bundleHandle?: string;
  bundleName?: string;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity" | "lineId"> & { quantity?: number }) => void;
  updateQuantity: (lineId: string, quantity: number) => void;
  removeItem: (lineId: string) => void;
  clearCart: () => void;
}

const createLineId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `line-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        const { items } = get();
        const qty = item.quantity ?? 1;

        // Bundle lines are never merged into existing rows: each "Add Bundle to Cart"
        // click must stay a distinct, identifiable group for checkout pricing.
        const existing = item.bundleInstanceId
          ? undefined
          : items.find((i) => i.variantId === item.variantId && !i.bundleInstanceId);

        if (existing) {
          set({
            items: items.map((i) =>
              i.lineId === existing.lineId ? { ...i, quantity: i.quantity + qty } : i
            ),
          });
        } else {
          set({ items: [...items, { ...item, quantity: qty, lineId: createLineId() }] });
        }
      },

      updateQuantity: (lineId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(lineId);
          return;
        }
        set({
          items: get().items.map((i) =>
            i.lineId === lineId ? { ...i, quantity } : i
          ),
        });
      },

      removeItem: (lineId) => {
        set({ items: get().items.filter((i) => i.lineId !== lineId) });
      },

      clearCart: () => set({ items: [] }),
    }),
    {
      name: "ff-cart",
      storage: createJSONStorage(() => localStorage),
      version: 2,
      migrate: (persistedState) => {
        const state = persistedState as { items?: Array<Record<string, unknown>> } | undefined;
        if (!state?.items) return state as unknown as CartStore;
        return {
          ...state,
          items: state.items.map((item) => ({
            ...item,
            lineId: typeof item.lineId === "string" ? item.lineId : createLineId(),
          })),
        } as unknown as CartStore;
      },
    }
  )
);
