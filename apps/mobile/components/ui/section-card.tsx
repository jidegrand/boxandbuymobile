import { ReactNode } from "react";
import { Text, View } from "react-native";

type SectionCardProps = {
  title: string;
  children: ReactNode;
};

export function SectionCard({ title, children }: SectionCardProps) {
  return (
    <View className="rounded-3xl bg-card p-5 shadow-sm">
      <Text className="mb-4 text-lg font-semibold text-ink">{title}</Text>
      <View className="gap-3">{children}</View>
    </View>
  );
}

