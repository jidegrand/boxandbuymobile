import { Link } from "expo-router";
import { Text, TextInput, View } from "react-native";

import { Screen } from "../../components/ui/screen";

export default function LoginScreen() {
  return (
    <Screen title="Login" subtitle="Placeholder form for the buyer auth flow.">
      <View className="gap-3 rounded-3xl bg-card p-5 shadow-sm">
        <TextInput
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          className="rounded-xl border border-ink/10 px-4 py-3"
        />
        <TextInput
          placeholder="Password"
          secureTextEntry
          className="rounded-xl border border-ink/10 px-4 py-3"
        />
        <View className="rounded-xl bg-accent px-4 py-3">
          <Text className="text-center font-semibold text-white">Connect auth endpoint</Text>
        </View>
        <Link href="/(auth)/register" className="text-center text-sm text-accent">
          Need an account? Register
        </Link>
      </View>
    </Screen>
  );
}

