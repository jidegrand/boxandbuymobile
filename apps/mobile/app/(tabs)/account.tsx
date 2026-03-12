import { Link } from "expo-router";
import { Text } from "react-native";

import { Screen } from "../../components/ui/screen";
import { SectionCard } from "../../components/ui/section-card";
import { useSession } from "../../hooks/use-session";

export default function AccountScreen() {
  const session = useSession();

  return (
    <Screen title="Account" subtitle="Buyer account, B2B status, and addresses will be managed here.">
      <SectionCard title="Session">
        <Text className="text-sm text-muted">
          {session.data?.user?.email ?? "No active API session yet."}
        </Text>
      </SectionCard>
      <SectionCard title="Actions">
        <Link href="/(auth)/login" className="rounded-xl bg-ink px-4 py-3 text-center text-white">
          Sign in
        </Link>
        <Link href="/(auth)/register" className="mt-3 rounded-xl border border-ink/10 px-4 py-3 text-center text-ink">
          Register
        </Link>
      </SectionCard>
    </Screen>
  );
}

