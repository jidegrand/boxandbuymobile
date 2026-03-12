import { Link, useLocalSearchParams } from "expo-router";
import { Image, Text, View } from "react-native";

import { Screen } from "../../components/ui/screen";
import { SectionCard } from "../../components/ui/section-card";
import { useProductDetail } from "../../hooks/use-catalog";
import { formatCurrency } from "../../lib/format";

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const product = useProductDetail(id);
  const detail = product.data;
  const primaryImageUrl = detail?.imageUrls[0] ?? detail?.imageUrl;
  const sellerLabel = detail?.seller?.shopName ?? detail?.seller?.name;

  return (
    <Screen title={detail?.name ?? "Product detail"} subtitle={detail?.category?.name ?? `Product ${id ?? "unknown"}`}>
      <SectionCard title="Overview">
        {product.isLoading ? <Text className="text-sm text-muted">Loading product...</Text> : null}
        {product.isError ? (
          <Text className="text-sm text-red-600">Unable to load this product right now.</Text>
        ) : null}
        {detail ? (
          <View className="gap-4">
            <View className="h-72 overflow-hidden rounded-3xl bg-accent/5">
              {primaryImageUrl ? (
                <Image
                  source={{ uri: primaryImageUrl }}
                  resizeMode="cover"
                  style={{ width: "100%", height: "100%" }}
                />
              ) : (
                <View className="flex-1 items-center justify-center px-6">
                  <Text className="text-sm font-medium text-muted">No product image</Text>
                </View>
              )}
            </View>
            <View className="gap-2">
              <Text className="text-2xl font-semibold text-ink">{detail.name}</Text>
              <Text className="text-lg font-semibold text-accent">
                {formatCurrency(detail.price, detail.currencyCode)}
              </Text>
              {detail.sku ? <Text className="text-sm text-muted">SKU: {detail.sku}</Text> : null}
              <Text className={detail.inStock ? "text-sm font-medium text-emerald-700" : "text-sm font-medium text-red-600"}>
                {detail.inStock ? "In stock" : "Out of stock"}
              </Text>
            </View>
          </View>
        ) : null}
      </SectionCard>

      {detail?.shortDescription ? (
        <SectionCard title="Summary">
          <Text className="text-sm leading-6 text-muted">{detail.shortDescription}</Text>
        </SectionCard>
      ) : null}

      {detail?.description ? (
        <SectionCard title="Description">
          <Text className="text-sm leading-6 text-muted">{detail.description}</Text>
        </SectionCard>
      ) : null}

      <SectionCard title="Seller">
        {sellerLabel ? (
          <View className="gap-2">
            <Text className="text-base font-semibold text-ink">{sellerLabel}</Text>
            {detail?.seller?.shopName && detail.seller.shopName !== detail.seller.name ? (
              <Text className="text-sm text-muted">{detail.seller.name}</Text>
            ) : null}
          </View>
        ) : (
          <Text className="text-sm text-muted">Seller data is not available for this product.</Text>
        )}
      </SectionCard>

      <SectionCard title="Next">
        <Link href="/(tabs)/shop" className="rounded-xl border border-ink/10 px-4 py-3 text-center text-ink">
          Back to catalog
        </Link>
        <Link href="/(tabs)/cart" className="rounded-xl bg-ink px-4 py-3 text-center text-white">
          Open cart
        </Link>
      </SectionCard>
    </Screen>
  );
}
