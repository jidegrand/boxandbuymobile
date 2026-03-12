import { Link } from "expo-router";
import { Text } from "react-native";

import { Screen } from "../../components/ui/screen";
import { SectionCard } from "../../components/ui/section-card";

export default function HomeScreen() {
  return (
    <Screen title="BoxAndBuy Mobile" subtitle="Sprint 1 shell for buyer and B2B flows.">
      <SectionCard title="Immediate next screens">
        <Link href="/(tabs)/shop" className="rounded-xl bg-accent px-4 py-3 text-center text-white">
          Browse catalog
        </Link>
        <Link href="/(auth)/login" className="mt-3 rounded-xl border border-ink/10 px-4 py-3 text-center text-ink">
          Open login
        </Link>
      </SectionCard>
      <SectionCard title="Current scaffold">
        <Text className="text-sm leading-6 text-muted">
          Providers, routing, storage wrappers, auth store, cart store, and placeholder
          screens are in place.
        </Text>
      </SectionCard>
    </Screen>
  );
}

