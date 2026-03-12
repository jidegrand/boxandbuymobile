import { Link } from "expo-router";
import { Text } from "react-native";

import { Screen } from "../../components/ui/screen";
import { SectionCard } from "../../components/ui/section-card";

export default function OrdersScreen() {
  return (
    <Screen title="Orders" subtitle="Order history and invoice access will render from mobile BFF endpoints.">
      <SectionCard title="Recent order">
        <Text className="text-sm text-muted">Order #BBM-10024 · Awaiting live API wiring.</Text>
        <Link href="/orders/BBM-10024" className="mt-3 rounded-xl border border-ink/10 px-4 py-3 text-center text-ink">
          View placeholder detail
        </Link>
      </SectionCard>
    </Screen>
  );
}

