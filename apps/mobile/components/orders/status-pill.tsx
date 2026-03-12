import type { OrderStatus } from "@boxandbuy/contracts";

import { Text, View } from "react-native";

type StatusPillProps = {
  status: OrderStatus;
};

export function StatusPill({ status }: StatusPillProps) {
  const accent = status.color ?? "#8A6C2F";

  return (
    <View
      className="self-start rounded-full border px-3 py-1"
      style={{ borderColor: accent, backgroundColor: "#F5EFE2" }}
    >
      <Text className="text-xs font-semibold" style={{ color: accent }}>
        {status.label}
      </Text>
    </View>
  );
}
