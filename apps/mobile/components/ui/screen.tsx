import { ReactNode } from "react";
import { ScrollView, Text, View } from "react-native";

type ScreenProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function Screen({ title, subtitle, children }: ScreenProps) {
  return (
    <ScrollView className="flex-1 bg-canvas" contentContainerStyle={{ padding: 20, gap: 16 }}>
      <View className="gap-2">
        <Text className="text-3xl font-bold text-ink">{title}</Text>
        {subtitle ? <Text className="text-sm leading-6 text-muted">{subtitle}</Text> : null}
      </View>
      {children}
    </ScrollView>
  );
}

