import { Text } from "react-native";

import { Screen } from "../../components/ui/screen";
import { SectionCard } from "../../components/ui/section-card";

export default function CheckoutScreen() {
  return (
    <Screen title="Checkout" subtitle="Checkout orchestration placeholder.">
      <SectionCard title="Current direction">
        <Text className="text-sm leading-6 text-muted">
          Sprint 5 will route here after the mobile BFF creates a checkout session. The first
          supported path is hosted or web checkout fallback, with native Stripe kept conditional.
        </Text>
      </SectionCard>
    </Screen>
  );
}

