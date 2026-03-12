import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { SellerStoreFilter } from "../../components/seller/store-filter";
import { Screen } from "../../components/ui/screen";
import { SectionCard } from "../../components/ui/section-card";
import { useSellerContext, useSellerListings } from "../../hooks/use-seller";
import { formatPercent } from "../../lib/format";
import { useAuthStore } from "../../store/auth.store";

export default function SellerListingsScreen() {
  const params = useLocalSearchParams<{ storeId?: string }>();
  const hydrated = useAuthStore((state) => state.hydrated);
  const accessToken = useAuthStore((state) => state.accessToken);
  const [selectedStoreId, setSelectedStoreId] = useState<string | undefined>(
    typeof params.storeId === "string" ? params.storeId : undefined
  );
  const sellerContext = useSellerContext();
  const listings = useSellerListings({ storeId: selectedStoreId }, { enabled: sellerContext.isSuccess });

  if (!hydrated) {
    return (
      <Screen title="Listings" subtitle="Preparing seller analytics access.">
        <SectionCard title="Listing health">
          <Text className="text-sm text-muted">Loading seller session...</Text>
        </SectionCard>
      </Screen>
    );
  }

  if (!accessToken) {
    return (
      <Screen title="Listings" subtitle="Sign in to review listing health.">
        <SectionCard title="Authentication required">
          <Text className="text-sm text-muted">Seller listing health is only available in an authenticated session.</Text>
        </SectionCard>
      </Screen>
    );
  }

  return (
    <Screen title="Listings" subtitle="Read-only listing quality and buy-box risk for your seller scope.">
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

      <SectionCard title="Listing health">
        {listings.isLoading ? <Text className="text-sm text-muted">Loading listings...</Text> : null}
        {listings.isError ? (
          <Text className="text-sm text-red-600">
            {listings.error instanceof Error ? listings.error.message : "Unable to load listing health."}
          </Text>
        ) : null}
        {listings.data?.length ? (
          listings.data.map((listing) => (
            <View key={`${listing.productName}-${listing.storeName}`} className="rounded-2xl border border-ink/10 px-4 py-4">
              <Text className="font-semibold text-ink">{listing.productName}</Text>
              <Text className="text-sm text-muted">
                {listing.storeName} · {listing.status}
              </Text>
              <Text className="text-sm text-muted">
                Health {listing.healthScore.toFixed(1)} · SEO {listing.seoScore.toFixed(1)} · Buy Box {formatPercent(listing.buyboxShare)}
              </Text>
              <Text className="text-sm text-muted">
                Missing images {listing.missingImages} · Missing attributes {listing.missingAttributes}
              </Text>
            </View>
          ))
        ) : listings.isLoading || listings.isError ? null : (
          <Text className="text-sm text-muted">No listing issues are available for the current seller scope.</Text>
        )}
      </SectionCard>
    </Screen>
  );
}
