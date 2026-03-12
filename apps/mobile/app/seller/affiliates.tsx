import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { SellerStoreFilter } from "../../components/seller/store-filter";
import { Screen } from "../../components/ui/screen";
import { SectionCard } from "../../components/ui/section-card";
import { useSellerAffiliates, useSellerContext } from "../../hooks/use-seller";
import { formatCurrency, formatDateTime } from "../../lib/format";
import { useAuthStore } from "../../store/auth.store";

export default function SellerAffiliatesScreen() {
  const params = useLocalSearchParams<{ storeId?: string }>();
  const hydrated = useAuthStore((state) => state.hydrated);
  const accessToken = useAuthStore((state) => state.accessToken);
  const [selectedStoreId, setSelectedStoreId] = useState<string | undefined>(
    typeof params.storeId === "string" ? params.storeId : undefined
  );
  const sellerContext = useSellerContext();
  const affiliates = useSellerAffiliates({ storeId: selectedStoreId }, { enabled: sellerContext.isSuccess });

  if (!hydrated) {
    return (
      <Screen title="Affiliates" subtitle="Preparing seller analytics access.">
        <SectionCard title="Affiliate performance">
          <Text className="text-sm text-muted">Loading seller session...</Text>
        </SectionCard>
      </Screen>
    );
  }

  if (!accessToken) {
    return (
      <Screen title="Affiliates" subtitle="Sign in to review affiliate performance.">
        <SectionCard title="Authentication required">
          <Text className="text-sm text-muted">Seller affiliate performance is only available in an authenticated session.</Text>
        </SectionCard>
      </Screen>
    );
  }

  return (
    <Screen title="Affiliates" subtitle="Read-only affiliate and referral performance for the selected seller scope.">
      <SectionCard title="Seller scope">
        {sellerContext.isLoading ? <Text className="text-sm text-muted">Loading seller context...</Text> : null}
        {sellerContext.isError ? (
          <Text className="text-sm text-red-600">
            {sellerContext.error instanceof Error ? sellerContext.error.message : "Unable to load seller context."}
          </Text>
        ) : sellerContext.data ? (
          <>
            <Text className="text-base font-semibold text-ink">{sellerContext.data.seller.displayName}</Text>
            <Text className="text-sm text-muted">{sellerContext.data.seller.role}</Text>
            <SellerStoreFilter
              stores={sellerContext.data.seller.stores}
              selectedStoreId={selectedStoreId}
              onSelect={setSelectedStoreId}
            />
          </>
        ) : null}
      </SectionCard>

      <SectionCard title="Affiliate performance">
        {affiliates.isLoading ? <Text className="text-sm text-muted">Loading affiliates...</Text> : null}
        {affiliates.isError ? (
          <Text className="text-sm text-red-600">
            {affiliates.error instanceof Error ? affiliates.error.message : "Unable to load affiliate performance."}
          </Text>
        ) : null}
        {affiliates.data?.length ? (
          affiliates.data.map((affiliate) => (
            <View key={`${affiliate.name}-${affiliate.storeName}`} className="rounded-2xl border border-ink/10 px-4 py-4">
              <Text className="font-semibold text-ink">{affiliate.name}</Text>
              <Text className="text-sm text-muted">
                {affiliate.storeName} · {affiliate.status}
              </Text>
              <Text className="text-sm text-muted">
                Revenue {formatCurrency(affiliate.revenue, "USD")} · Commission {formatCurrency(affiliate.commission, "USD")}
              </Text>
              <Text className="text-sm text-muted">
                Conversions {affiliate.conversions} · Updated {formatDateTime(affiliate.updatedAt)}
              </Text>
            </View>
          ))
        ) : affiliates.isLoading || affiliates.isError ? null : (
          <Text className="text-sm text-muted">No affiliate activity is available for the current seller scope.</Text>
        )}
      </SectionCard>
    </Screen>
  );
}
