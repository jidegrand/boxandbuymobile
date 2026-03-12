import { startTransition, useDeferredValue, useEffect, useState } from "react";

import { TextInput, Pressable, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";

import { ProductCard } from "../../components/catalog/product-card";
import { Screen } from "../../components/ui/screen";
import { SectionCard } from "../../components/ui/section-card";
import { useCatalogHome, useProductList } from "../../hooks/use-catalog";

export default function ShopScreen() {
  const params = useLocalSearchParams<{ categoryId?: string }>();
  const [search, setSearch] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(
    typeof params.categoryId === "string" ? params.categoryId : undefined
  );
  const deferredSearch = useDeferredValue(search.trim());
  const home = useCatalogHome();
  const products = useProductList({
    search: deferredSearch || undefined,
    categoryId: selectedCategoryId,
    page: 1,
    pageSize: 20
  });

  useEffect(() => {
    if (typeof params.categoryId === "string") {
      setSelectedCategoryId(params.categoryId);
    }
  }, [params.categoryId]);

  return (
    <Screen title="Shop" subtitle="Live catalog data from PrestaShop with search and category filters.">
      <SectionCard title="Search">
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by product name or SKU"
          placeholderTextColor="#6b7280"
          className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-base text-ink"
        />
      </SectionCard>

      <SectionCard title="Categories">
        <View className="flex-row flex-wrap gap-3">
          <Pressable
            className={!selectedCategoryId ? "rounded-full bg-ink px-4 py-2" : "rounded-full border border-ink/10 px-4 py-2"}
            onPress={() => {
              startTransition(() => {
                setSelectedCategoryId(undefined);
              });
            }}
          >
            <Text className={!selectedCategoryId ? "text-sm font-medium text-white" : "text-sm text-ink"}>
              All
            </Text>
          </Pressable>
          {home.data?.categories.map((category) => {
            const selected = selectedCategoryId === category.id;

            return (
              <Pressable
                key={category.id}
                className={selected ? "rounded-full bg-ink px-4 py-2" : "rounded-full border border-ink/10 px-4 py-2"}
                onPress={() => {
                  startTransition(() => {
                    setSelectedCategoryId(category.id);
                  });
                }}
              >
                <Text className={selected ? "text-sm font-medium text-white" : "text-sm text-ink"}>
                  {category.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </SectionCard>

      <SectionCard title="Products">
        {products.isLoading ? <Text className="text-sm text-muted">Loading products...</Text> : null}
        {products.isError ? (
          <Text className="text-sm text-red-600">Unable to load the catalog right now.</Text>
        ) : null}
        {products.data ? (
          <Text className="text-sm text-muted">
            {products.data.total} products
            {deferredSearch ? ` matching "${deferredSearch}"` : ""}
          </Text>
        ) : null}
        {products.data?.items.length ? (
          products.data.items.map((product) => <ProductCard key={product.id} product={product} />)
        ) : products.isLoading || products.isError ? null : (
          <Text className="text-sm text-muted">No products match the current filters.</Text>
        )}
      </SectionCard>
    </Screen>
  );
}
