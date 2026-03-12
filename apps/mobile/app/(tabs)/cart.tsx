import { Link } from "expo-router";
import { Text, View } from "react-native";

import { Screen } from "../../components/ui/screen";
import { SectionCard } from "../../components/ui/section-card";
import { useCartStore } from "../../store/cart.store";

export default function CartScreen() {
  const items = useCartStore((state) => state.items);
  const total = useCartStore((state) => state.totalAmount);

  return (
    <Screen title="Cart" subtitle="Server-backed cart state will replace this placeholder data.">
      <SectionCard title="Cart summary">
        {items.length === 0 ? (
          <Text className="text-sm text-muted">Your cart is empty.</Text>
        ) : (
          <View className="gap-2">
            {items.map((item) => (
              <View key={item.id} className="rounded-xl border border-ink/10 px-4 py-3">
                <Text className="font-semibold text-ink">{item.name}</Text>
                <Text className="text-sm text-muted">
                  Qty {item.quantity} · ${item.unitPrice.toFixed(2)}
                </Text>
              </View>
            ))}
          </View>
        )}
        <Text className="mt-4 text-base font-semibold text-ink">Estimated total: ${total.toFixed(2)}</Text>
        <Link href="/cart/checkout" className="mt-4 rounded-xl bg-accent px-4 py-3 text-center text-white">
          Continue to checkout
        </Link>
      </SectionCard>
    </Screen>
  );
}

