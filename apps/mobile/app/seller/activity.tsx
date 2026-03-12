import { Text, View } from "react-native";

import { Screen } from "../../components/ui/screen";
import { SectionCard } from "../../components/ui/section-card";
import { useSellerAuditLog } from "../../hooks/use-seller-actions";
import { formatDateTime, formatStatusLabel } from "../../lib/format";

export default function SellerActivityScreen() {
  const audit = useSellerAuditLog();

  return (
    <Screen title="Seller activity" subtitle="Recent mobile seller actions are recorded here for validation and review.">
      {audit.isLoading ? (
        <SectionCard title="Loading activity">
          <Text className="text-sm text-muted">Fetching seller action log entries...</Text>
        </SectionCard>
      ) : null}

      {audit.isError ? (
        <SectionCard title="Unable to load activity">
          <Text className="text-sm text-red-600">
            {audit.error instanceof Error ? audit.error.message : "Seller activity is unavailable right now."}
          </Text>
        </SectionCard>
      ) : null}

      {audit.data ? (
        <>
          <SectionCard title="Permissions">
            <Text className="text-sm text-muted">
              Audit log access: {audit.data.permissions.canViewAuditLog ? "Allowed" : "Blocked"}
            </Text>
          </SectionCard>

          <SectionCard title="Recent actions">
            {audit.data.items.length ? (
              audit.data.items.map((entry) => (
                <View key={entry.id} className="rounded-2xl border border-ink/10 px-4 py-4">
                  <Text className="font-semibold text-ink">{entry.summary}</Text>
                  <Text className="text-sm text-muted">
                    {formatStatusLabel(entry.action)} · {entry.actorName} · {formatStatusLabel(entry.actorRole)}
                  </Text>
                  <Text className="text-sm text-muted">{formatDateTime(entry.createdAt)}</Text>
                </View>
              ))
            ) : (
              <Text className="text-sm text-muted">No seller actions have been recorded yet.</Text>
            )}
          </SectionCard>
        </>
      ) : null}
    </Screen>
  );
}
