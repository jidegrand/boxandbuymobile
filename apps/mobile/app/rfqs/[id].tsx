import { useLocalSearchParams } from "expo-router";
import { Alert, Linking, Pressable, Text, View } from "react-native";

import { RfqStatusBadge } from "../../components/rfqs/status-badge";
import { Screen } from "../../components/ui/screen";
import { SectionCard } from "../../components/ui/section-card";
import { useRfqDetail } from "../../hooks/use-rfqs";
import { formatCurrency, formatDateTime } from "../../lib/format";

export default function RfqDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const rfq = useRfqDetail(id);

  const handleOpenUrl = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert("Unable to open link", error instanceof Error ? error.message : "Please try again.");
    }
  };

  return (
    <Screen title="RFQ detail" subtitle={`Quote and RFQ detail for ${id ?? "unknown"}.`}>
      {rfq.isLoading ? (
        <SectionCard title="Loading RFQ">
          <Text className="text-sm text-muted">Fetching quote status, line items, and private checkout actions...</Text>
        </SectionCard>
      ) : null}

      {rfq.isError ? (
        <SectionCard title="Unable to load RFQ">
          <Text className="text-sm text-red-600">
            {rfq.error instanceof Error ? rfq.error.message : "Unable to load this RFQ right now."}
          </Text>
        </SectionCard>
      ) : null}

      {rfq.data ? (
        <>
          <SectionCard title={rfq.data.reference}>
            <RfqStatusBadge status={rfq.data.status} />
            <Text className="text-sm text-muted">Submitted {formatDateTime(rfq.data.submittedAt)}</Text>
            <Text className="text-lg font-semibold text-ink">
              {formatCurrency(rfq.data.totalAmount, rfq.data.currencyCode)}
            </Text>
            <Text className="text-sm text-muted">
              {rfq.data.itemCount} item{rfq.data.itemCount === 1 ? "" : "s"}
            </Text>
            {rfq.data.quoteExpiresAt ? (
              <Text className="text-sm text-muted">
                Quote expires {formatDateTime(rfq.data.quoteExpiresAt)}
              </Text>
            ) : null}
            {rfq.data.customerNote ? (
              <Text className="text-sm leading-6 text-muted">Buyer note: {rfq.data.customerNote}</Text>
            ) : null}
            {rfq.data.adminNote ? (
              <Text className="text-sm leading-6 text-muted">Review note: {rfq.data.adminNote}</Text>
            ) : null}
            {rfq.data.downloadUrl ? (
              <Pressable
                className="rounded-xl border border-ink/10 px-4 py-3"
                onPress={() => {
                  void handleOpenUrl(rfq.data.downloadUrl!);
                }}
              >
                <Text className="text-center font-medium text-ink">Open quote PDF</Text>
              </Pressable>
            ) : null}
            {rfq.data.checkoutUrl ? (
              <Pressable
                className="rounded-xl bg-ink px-4 py-3"
                onPress={() => {
                  void handleOpenUrl(rfq.data.checkoutUrl!);
                }}
              >
                <Text className="text-center font-semibold text-white">Open private checkout</Text>
              </Pressable>
            ) : null}
          </SectionCard>

          <SectionCard title="Items">
            {rfq.data.items.map((item) => (
              <View key={item.id} className="rounded-2xl border border-ink/10 px-4 py-4">
                <View className="gap-2">
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1 gap-1">
                      <Text className="font-semibold text-ink">{item.name}</Text>
                      {item.sku ? <Text className="text-sm text-muted">SKU: {item.sku}</Text> : null}
                    </View>
                    <Text className="text-sm font-semibold text-ink">
                      {formatCurrency(item.lineTotal, rfq.data.currencyCode)}
                    </Text>
                  </View>
                  <Text className="text-sm text-muted">
                    {item.quantity} x {formatCurrency(item.unitPrice, rfq.data.currencyCode)}
                  </Text>
                </View>
              </View>
            ))}
          </SectionCard>
        </>
      ) : null}
    </Screen>
  );
}
