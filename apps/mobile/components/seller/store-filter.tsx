import type { SellerStore } from "@boxandbuy/contracts";

import { Pressable, Text, View } from "react-native";

type SellerStoreFilterProps = {
  stores: SellerStore[];
  selectedStoreId?: string;
  onSelect: (storeId?: string) => void;
  includeAll?: boolean;
};

export function SellerStoreFilter({
  stores,
  selectedStoreId,
  onSelect,
  includeAll = true
}: SellerStoreFilterProps) {
  return (
    <View className="flex-row flex-wrap gap-3">
      {includeAll ? (
        <Pressable
          className={!selectedStoreId ? "rounded-full bg-ink px-4 py-2" : "rounded-full border border-ink/10 px-4 py-2"}
          onPress={() => onSelect(undefined)}
        >
          <Text className={!selectedStoreId ? "text-sm font-medium text-white" : "text-sm text-ink"}>All stores</Text>
        </Pressable>
      ) : null}
      {stores.map((store) => {
        const selected = selectedStoreId === store.id;

        return (
          <Pressable
            key={store.id}
            className={selected ? "rounded-full bg-ink px-4 py-2" : "rounded-full border border-ink/10 px-4 py-2"}
            onPress={() => onSelect(store.id)}
          >
            <Text className={selected ? "text-sm font-medium text-white" : "text-sm text-ink"}>
              {store.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
