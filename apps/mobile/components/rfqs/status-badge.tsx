import type { RfqStatus } from "@boxandbuy/contracts";

import { Text, View } from "react-native";

import { formatStatusLabel } from "../../lib/format";

type RfqStatusBadgeProps = {
  status: RfqStatus;
};

export function RfqStatusBadge({ status }: RfqStatusBadgeProps) {
  const palette =
    status === "approved"
      ? { borderColor: "#3D7A47", backgroundColor: "#EAF6EC", textColor: "#2E5E36" }
      : status === "submitted"
        ? { borderColor: "#9A7A2A", backgroundColor: "#FBF4DE", textColor: "#80631A" }
        : status === "expired"
          ? { borderColor: "#6F5D3E", backgroundColor: "#F2EBDD", textColor: "#5F4F34" }
          : { borderColor: "#A84C4C", backgroundColor: "#FBE8E8", textColor: "#8A3737" };

  return (
    <View
      className="self-start rounded-full border px-3 py-1"
      style={{ borderColor: palette.borderColor, backgroundColor: palette.backgroundColor }}
    >
      <Text className="text-xs font-semibold" style={{ color: palette.textColor }}>
        {formatStatusLabel(status)}
      </Text>
    </View>
  );
}
