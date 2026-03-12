import { Text, TextInput, View } from "react-native";

import { Screen } from "../../components/ui/screen";

export default function RegisterScreen() {
  return (
    <Screen title="Register" subtitle="Placeholder form for buyer registration and guest-to-account flows.">
      <View className="gap-3 rounded-3xl bg-card p-5 shadow-sm">
        <TextInput placeholder="First name" className="rounded-xl border border-ink/10 px-4 py-3" />
        <TextInput placeholder="Last name" className="rounded-xl border border-ink/10 px-4 py-3" />
        <TextInput
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          className="rounded-xl border border-ink/10 px-4 py-3"
        />
        <TextInput placeholder="Password" secureTextEntry className="rounded-xl border border-ink/10 px-4 py-3" />
        <View className="rounded-xl bg-accent px-4 py-3">
          <Text className="text-center font-semibold text-white">Connect registration endpoint</Text>
        </View>
      </View>
    </Screen>
  );
}

