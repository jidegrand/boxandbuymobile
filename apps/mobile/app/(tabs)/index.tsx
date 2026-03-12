import { Link } from "expo-router";
import { Text, View } from "react-native";

import { ProductCard } from "../../components/catalog/product-card";
import { Screen } from "../../components/ui/screen";
import { SectionCard } from "../../components/ui/section-card";
import { useCatalogHome } from "../../hooks/use-catalog";

export default function HomeScreen() {
  const home = useCatalogHome();

  return (
    <Screen title="BoxAndBuy Mobile" subtitle="Buyer catalog, B2B flows, and account actions in one app shell.">
      <SectionCard title="Browse">
        <Link href="/(tabs)/shop" className="rounded-xl bg-accent px-4 py-3 text-center text-white">
          Open catalog
        </Link>
        <Link href="/(auth)/login" className="rounded-xl border border-ink/10 px-4 py-3 text-center text-ink">
          Sign in
        </Link>
      </SectionCard>

      <SectionCard title="Top categories">
        {home.isLoading ? <Text className="text-sm text-muted">Loading categories...</Text> : null}
        {home.isError ? (
          <Text className="text-sm text-red-600">Unable to load categories right now.</Text>
        ) : null}
        {home.data?.categories.length ? (
          <View className="flex-row flex-wrap gap-3">
            {home.data.categories.map((category) => (
              <Link
                key={category.id}
                href={{
                  pathname: "/(tabs)/shop",
                  params: { categoryId: category.id }
                }}
                className="rounded-full border border-ink/10 px-4 py-2 text-sm text-ink"
              >
                {category.name}
              </Link>
            ))}
          </View>
        ) : null}
      </SectionCard>

      <SectionCard title="Featured products">
        {home.isLoading ? <Text className="text-sm text-muted">Loading products...</Text> : null}
        {home.isError ? (
          <Text className="text-sm text-red-600">Unable to load products right now.</Text>
        ) : null}
        {home.data?.featuredProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </SectionCard>
    </Screen>
  );
}
