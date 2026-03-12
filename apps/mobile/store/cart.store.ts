import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { zustandStorage } from "../lib/storage";

export type CartItem = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
};

type CartState = {
  items: CartItem[];
  totalAmount: number;
  addPlaceholderItem: () => void;
  clear: () => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      totalAmount: 0,
      addPlaceholderItem() {
        const nextItems = [
          ...get().items,
          {
            id: `placeholder-${Date.now()}`,
            name: "Placeholder mobile cart item",
            quantity: 1,
            unitPrice: 49
          }
        ];

        set({
          items: nextItems,
          totalAmount: nextItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
        });
      },
      clear() {
        set({
          items: [],
          totalAmount: 0
        });
      }
    }),
    {
      name: "cart-store",
      storage: createJSONStorage(() => zustandStorage)
    }
  )
);
