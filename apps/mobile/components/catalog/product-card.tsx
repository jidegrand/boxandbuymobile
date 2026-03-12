import type { ProductSummary } from "@boxandbuy/contracts";

import { Link } from "expo-router";
import { Image, Text, View } from "react-native";

import { formatCurrency } from "../../lib/format";

type ProductCardProps = {
  product: ProductSummary;
};

export function ProductCard({ product }: ProductCardProps) {
  const sellerLabel = product.seller?.shopName ?? product.seller?.name;

  return (
    <View className="overflow-hidden rounded-3xl bg-card shadow-sm">
      <View className="h-48 bg-accent/5">
        {product.imageUrl ? (
          <Image
            source={{ uri: product.imageUrl }}
            resizeMode="cover"
            style={{ width: "100%", height: "100%" }}
          />
        ) : (
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-sm font-medium text-muted">No product image</Text>
          </View>
        )}
      </View>
      <View className="gap-3 p-5">
        <View className="gap-1">
          <Text className="text-lg font-semibold text-ink">{product.name}</Text>
          <Text className="text-base font-semibold text-accent">
            {formatCurrency(product.price, product.currencyCode)}
          </Text>
        </View>
        {sellerLabel ? (
          <Text className="text-xs uppercase tracking-[1px] text-muted">Sold by {sellerLabel}</Text>
        ) : null}
        {product.category?.name ? (
          <Text className="text-sm text-muted">{product.category.name}</Text>
        ) : null}
        {product.shortDescription ? (
          <Text className="text-sm leading-6 text-muted" numberOfLines={2}>
            {product.shortDescription}
          </Text>
        ) : null}
        <Text className={product.inStock ? "text-sm font-medium text-emerald-700" : "text-sm font-medium text-red-600"}>
          {product.inStock ? "In stock" : "Out of stock"}
        </Text>
        <Link
          href={`/product/${product.id}`}
          className="rounded-xl bg-ink px-4 py-3 text-center text-white"
        >
          View product
        </Link>
      </View>
    </View>
  );
}
