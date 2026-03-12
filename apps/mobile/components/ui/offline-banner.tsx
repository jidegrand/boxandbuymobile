import { Text, View } from "react-native";

import { useNetInfo } from "@react-native-community/netinfo";

export function OfflineBanner() {
  const netInfo = useNetInfo();
  const offline = netInfo.isConnected === false || netInfo.isInternetReachable === false;

  if (!offline) {
    return null;
  }

  return (
    <View className="absolute left-4 right-4 top-12 z-50 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 shadow-sm">
      <Text className="text-center text-sm font-medium text-amber-800">
        Network connectivity is limited. Cached data may be stale and writes can fail.
      </Text>
    </View>
  );
}
