import { Text, View } from "react-native";

type SellerMetricCardProps = {
  label: string;
  value: string;
  hint?: string;
};

export function SellerMetricCard({ label, value, hint }: SellerMetricCardProps) {
  return (
    <View className="min-w-[148px] flex-1 rounded-2xl border border-ink/10 bg-white px-4 py-4">
      <Text className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{label}</Text>
      <Text className="mt-2 text-2xl font-bold text-ink">{value}</Text>
      {hint ? <Text className="mt-2 text-sm text-muted">{hint}</Text> : null}
    </View>
  );
}
