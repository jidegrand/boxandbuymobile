import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { StatusPill } from "../../components/orders/status-pill";
import { Screen } from "../../components/ui/screen";
import { SectionCard } from "../../components/ui/section-card";
import { useOrders } from "../../hooks/use-orders";
import { formatCurrency, formatDateTime } from "../../lib/format";
import { useAuthStore } from "../../store/auth.store";

export default function OrdersScreen() {
  const hydrated = useAuthStore((state) => state.hydrated);
  const accessToken = useAuthStore((state) => state.accessToken);
  const orders = useOrders();

  if (!hydrated) {
    return (
      <Screen title="Orders" subtitle="Loading your account session.">
        <SectionCard title="Please wait">
          <Text className="text-sm text-muted">Checking whether you already have an active mobile session.</Text>
        </SectionCard>
      </Screen>
    );
  }

  if (!accessToken) {
    return (
      <Screen title="Orders" subtitle="Sign in to view order history, invoices, and delivery status.">
        <SectionCard title="Buyer account required">
          <Text className="text-sm leading-6 text-muted">
            Order history is protected behind your buyer account.
          </Text>
          <Link href="/(auth)/login" asChild>
            <Pressable className="rounded-xl bg-accent px-4 py-3">
              <Text className="text-center font-semibold text-white">Sign in</Text>
            </Pressable>
          </Link>
        </SectionCard>
      </Screen>
    );
  }

  return (
    <Screen title="Orders" subtitle="Track payment status, delivery progress, and invoice access from the mobile API.">
      <SectionCard title="Recent orders">
        {orders.isLoading ? <Text className="text-sm text-muted">Loading your orders...</Text> : null}
        {orders.isError ? (
          <Text className="text-sm text-red-600">
            {orders.error instanceof Error ? orders.error.message : "Unable to load your orders right now."}
          </Text>
        ) : null}
        {orders.data && orders.data.length === 0 ? (
          <Text className="text-sm text-muted">No completed orders yet. Your first purchase will appear here.</Text>
        ) : null}
        {orders.data?.map((order) => (
          <Link key={order.id} href={`/orders/${order.id}`} asChild>
            <Pressable className="rounded-2xl border border-ink/10 px-4 py-4">
              <View className="gap-3">
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1 gap-1">
                    <Text className="text-base font-semibold text-ink">{order.reference}</Text>
                    <Text className="text-sm text-muted">{formatDateTime(order.placedAt)}</Text>
                  </View>
                  <StatusPill status={order.status} />
                </View>
                <View className="flex-row items-center justify-between gap-3">
                  <Text className="text-sm text-muted">
                    {order.itemCount} item{order.itemCount === 1 ? "" : "s"}
                  </Text>
                  <Text className="text-sm font-semibold text-ink">
                    {formatCurrency(order.totalAmount, order.currencyCode)}
                  </Text>
                </View>
                {order.paymentMethod ? (
                  <Text className="text-sm text-muted">Payment: {order.paymentMethod}</Text>
                ) : null}
              </View>
            </Pressable>
          </Link>
        ))}
      </SectionCard>
    </Screen>
  );
}
