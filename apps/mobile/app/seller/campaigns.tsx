import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { SellerStoreFilter } from "../../components/seller/store-filter";
import { Screen } from "../../components/ui/screen";
import { SectionCard } from "../../components/ui/section-card";
import { useSellerCampaigns, useSellerContext } from "../../hooks/use-seller";
import { formatCurrency, formatPercent } from "../../lib/format";
import { useAuthStore } from "../../store/auth.store";

export default function SellerCampaignsScreen() {
  const params = useLocalSearchParams<{ storeId?: string }>();
  const hydrated = useAuthStore((state) => state.hydrated);
  const accessToken = useAuthStore((state) => state.accessToken);
  const [selectedStoreId, setSelectedStoreId] = useState<string | undefined>(
    typeof params.storeId === "string" ? params.storeId : undefined
  );
  const sellerContext = useSellerContext();
  const campaigns = useSellerCampaigns({ storeId: selectedStoreId }, { enabled: sellerContext.isSuccess });

  if (!hydrated) {
    return (
      <Screen title="Campaigns" subtitle="Preparing seller analytics access.">
        <SectionCard title="Campaign performance">
          <Text className="text-sm text-muted">Loading seller session...</Text>
        </SectionCard>
      </Screen>
    );
  }

  if (!accessToken) {
    return (
      <Screen title="Campaigns" subtitle="Sign in to view seller campaign performance.">
        <SectionCard title="Authentication required">
          <Text className="text-sm text-muted">Seller campaign performance is only available in an authenticated session.</Text>
        </SectionCard>
      </Screen>
    );
  }

  return (
    <Screen title="Campaigns" subtitle="Read-only campaign performance across the selected seller scope.">
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

      <SectionCard title="Campaign performance">
        {campaigns.isLoading ? <Text className="text-sm text-muted">Loading campaigns...</Text> : null}
        {campaigns.isError ? (
          <Text className="text-sm text-red-600">
            {campaigns.error instanceof Error ? campaigns.error.message : "Unable to load seller campaigns."}
          </Text>
        ) : null}
        {campaigns.data?.length ? (
          campaigns.data.map((campaign) => (
            <View key={`${campaign.name}-${campaign.reportDate}-${campaign.storeName}`} className="rounded-2xl border border-ink/10 px-4 py-4">
              <Text className="font-semibold text-ink">{campaign.name}</Text>
              <Text className="text-sm text-muted">
                {campaign.channel} · {campaign.storeName} · {campaign.status}
              </Text>
              <Text className="text-sm text-muted">
                Spend {formatCurrency(campaign.spend, "USD")} · Revenue {formatCurrency(campaign.revenue, "USD")} · ROAS {campaign.roas}
              </Text>
              <Text className="text-sm text-muted">
                Clicks {campaign.clicks} · Impressions {campaign.impressions} · Acquisitions {campaign.acquisitions}
              </Text>
              <Text className="text-sm text-muted">Report date {campaign.reportDate}</Text>
            </View>
          ))
        ) : campaigns.isLoading || campaigns.isError ? null : (
          <Text className="text-sm text-muted">No campaigns are available for the current seller scope.</Text>
        )}
      </SectionCard>
    </Screen>
  );
}
