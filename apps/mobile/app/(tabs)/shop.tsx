import { Link } from "expo-router";
import { Text } from "react-native";

import { Screen } from "../../components/ui/screen";
import { SectionCard } from "../../components/ui/section-card";

const sampleProducts = [
  { id: "sku-1001", name: "Warehouse Label Printer", price: "$249.00" },
  { id: "sku-1002", name: "Industrial Barcode Scanner", price: "$189.00" },
  { id: "sku-1003", name: "Thermal Shipping Labels", price: "$39.00" }
];

export default function ShopScreen() {
  return (
    <Screen title="Shop" subtitle="Catalog, search, filters, and seller summaries will land here.">
      {sampleProducts.map((product) => (
        <SectionCard key={product.id} title={product.name}>
          <Text className="text-sm text-muted">{product.price}</Text>
          <Link href={`/product/${product.id}`} className="mt-3 rounded-xl bg-ink px-4 py-3 text-center text-white">
            View product
          </Link>
        </SectionCard>
      ))}
    </Screen>
  );
}

