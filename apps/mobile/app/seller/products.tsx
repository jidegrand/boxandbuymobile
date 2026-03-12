import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { SellerStoreFilter } from "../../components/seller/store-filter";
import { Screen } from "../../components/ui/screen";
import { SectionCard } from "../../components/ui/section-card";
import { useSellerContext, useSellerProducts } from "../../hooks/use-seller";
import { formatCurrency, formatPercent } from "../../lib/format";
import { useAuthStore } from "../../store/auth.store";

export default function SellerProductsScreen() {
  const params = useLocalSearchParams<{ storeId?: string }>();
  const hydrated = useAuthStore((state) => state.hydrated);
  const accessToken = useAuthStore((state) => state.accessToken);
  const [selectedStoreId, setSelectedStoreId] = useState<string | undefined>(
    typeof params.storeId === "string" ? params.storeId : undefined
  );
  const sellerContext = useSellerContext();
  const products = useSellerProducts({ storeId: selectedStoreId }, { enabled: sellerContext.isSuccess });

  if (!hydrated) {
    return (
      <Screen title="Products" subtitle="Preparing seller analytics access.">
        <SectionCard title="Seller products">
          <Text className="text-sm text-muted">Loading seller session...</Text>
        </SectionCard>
      </Screen>
    );
  }

  if (!accessToken) {
    return (
      <Screen title="Products" subtitle="Sign in to view seller product analytics.">
        <SectionCard title="Authentication required">
          <Text className="text-sm text-muted">Seller product analytics are only available in an authenticated session.</Text>
        </SectionCard>
      </Screen>
    );
  }

  return (
    <Screen title="Products" subtitle="Read-only product performance from the Growth Center dataset.">
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

      <SectionCard title="Product analytics">
        {products.isLoading ? <Text className="text-sm text-muted">Loading products...</Text> : null}
        {products.isError ? (
          <Text className="text-sm text-red-600">
            {products.error instanceof Error ? products.error.message : "Unable to load seller products."}
          </Text>
        ) : null}
        {products.data?.length ? (
          products.data.map((product) => (
            <View key={`${product.sku}-${product.storeName}`} className="rounded-2xl border border-ink/10 px-4 py-4">
              <Text className="font-semibold text-ink">{product.name}</Text>
              <Text className="text-sm text-muted">
                {product.sku} · {product.storeName} · {product.status}
              </Text>
              <Text className="text-sm text-muted">
                Price {formatCurrency(product.price, "USD")} · Inventory {product.inventory}
              </Text>
              <Text className="text-sm text-muted">
                Views {product.productViews} · Add to cart {formatPercent(product.addToCartRate)} · Conversion {formatPercent(product.conversionRate)}
              </Text>
            </View>
          ))
        ) : products.isLoading || products.isError ? null : (
          <Text className="text-sm text-muted">No seller products are available for the current store scope.</Text>
        )}
      </SectionCard>
    </Screen>
  );
}
