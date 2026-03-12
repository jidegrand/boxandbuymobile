import { useLocalSearchParams } from "expo-router";
import { Text } from "react-native";

import { Screen } from "../../components/ui/screen";
import { SectionCard } from "../../components/ui/section-card";

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <Screen title="Product detail" subtitle={`Placeholder route for product ${id ?? "unknown"}.`}>
      <SectionCard title="Implementation note">
        <Text className="text-sm leading-6 text-muted">
          This screen will use the product detail endpoint and render live pricing, stock,
          seller summary, and add-to-cart controls.
        </Text>
      </SectionCard>
    </Screen>
  );
}

