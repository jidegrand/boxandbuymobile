import { useLocalSearchParams } from "expo-router";
import { Alert, Linking, Pressable, Text, View } from "react-native";

import { StatusPill } from "../../components/orders/status-pill";
import { Screen } from "../../components/ui/screen";
import { SectionCard } from "../../components/ui/section-card";
import { useOrderDetail } from "../../hooks/use-orders";
import { formatCurrency, formatDateTime } from "../../lib/format";

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const order = useOrderDetail(id);

  const handleOpenUrl = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert("Unable to open link", error instanceof Error ? error.message : "Please try again in a browser.");
    }
  };

  return (
    <Screen title="Order detail" subtitle={`Detailed order view for order ${id ?? "unknown"}.`}>
      {order.isLoading ? (
        <SectionCard title="Loading order">
          <Text className="text-sm text-muted">Fetching order summary, line items, and status history...</Text>
        </SectionCard>
      ) : null}

      {order.isError ? (
        <SectionCard title="Unable to load order">
          <Text className="text-sm text-red-600">
            {order.error instanceof Error ? order.error.message : "Unable to load this order right now."}
          </Text>
        </SectionCard>
      ) : null}

      {order.data ? (
        <>
          <SectionCard title={order.data.reference}>
            <StatusPill status={order.data.status} />
            <Text className="text-sm text-muted">Placed {formatDateTime(order.data.placedAt)}</Text>
            <Text className="text-lg font-semibold text-ink">
              {formatCurrency(order.data.totalAmount, order.data.currencyCode)}
            </Text>
            <View className="gap-2">
              <Text className="text-sm text-muted">
                Subtotal: {formatCurrency(order.data.subtotalAmount, order.data.currencyCode)}
              </Text>
              <Text className="text-sm text-muted">
                Shipping: {formatCurrency(order.data.shippingAmount, order.data.currencyCode)}
              </Text>
              {order.data.paymentMethod ? (
                <Text className="text-sm text-muted">Payment: {order.data.paymentMethod}</Text>
              ) : null}
              {order.data.trackingNumber ? (
                <Text className="text-sm text-muted">Tracking: {order.data.trackingNumber}</Text>
              ) : null}
            </View>
            {order.data.invoiceUrl ? (
              <Pressable
                className="rounded-xl border border-ink/10 px-4 py-3"
                onPress={() => {
                  void handleOpenUrl(order.data.invoiceUrl!);
                }}
              >
                <Text className="text-center font-medium text-ink">Open invoice PDF</Text>
              </Pressable>
            ) : null}
            {order.data.confirmationUrl ? (
              <Pressable
                className="rounded-xl border border-ink/10 px-4 py-3"
                onPress={() => {
                  void handleOpenUrl(order.data.confirmationUrl!);
                }}
              >
                <Text className="text-center font-medium text-ink">Open storefront confirmation</Text>
              </Pressable>
            ) : null}
          </SectionCard>

          <SectionCard title="Items">
            {order.data.lines.map((line) => (
              <View key={line.id} className="rounded-2xl border border-ink/10 px-4 py-4">
                <View className="gap-2">
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1 gap-1">
                      <Text className="font-semibold text-ink">{line.name}</Text>
                      {line.sku ? <Text className="text-sm text-muted">SKU: {line.sku}</Text> : null}
                    </View>
                    <Text className="text-sm font-semibold text-ink">
                      {formatCurrency(line.lineTotal, order.data.currencyCode)}
                    </Text>
                  </View>
                  <Text className="text-sm text-muted">
                    {line.quantity} x {formatCurrency(line.unitPrice, order.data.currencyCode)}
                  </Text>
                </View>
              </View>
            ))}
          </SectionCard>

          <SectionCard title="Status history">
            {order.data.history.map((entry) => (
              <View key={entry.id} className="rounded-2xl border border-ink/10 px-4 py-4">
                <View className="gap-2">
                  <Text className="font-semibold text-ink">{entry.label}</Text>
                  <Text className="text-sm text-muted">{formatDateTime(entry.occurredAt)}</Text>
                </View>
              </View>
            ))}
          </SectionCard>
        </>
      ) : null}
    </Screen>
  );
}
