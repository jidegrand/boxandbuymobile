import { useLocalSearchParams } from "expo-router";
import { Text } from "react-native";

import { Screen } from "../../components/ui/screen";
import { SectionCard } from "../../components/ui/section-card";

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <Screen title="Order detail" subtitle={`Placeholder route for order ${id ?? "unknown"}.`}>
      <SectionCard title="Implementation note">
        <Text className="text-sm leading-6 text-muted">
          Order summary, invoice links, tracking, and reorder actions will render from the mobile
          BFF once the orders contract is live.
        </Text>
      </SectionCard>
    </Screen>
  );
}

