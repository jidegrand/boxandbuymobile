import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { Screen } from "../../components/ui/screen";
import { api } from "../../lib/api";
import { queryClient } from "../../lib/query-client";

export default function RegisterScreen() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    setPending(true);
    setError(null);

    try {
      await api.register({
        firstName,
        lastName,
        email,
        password
      });
      await queryClient.invalidateQueries({ queryKey: ["session"] });
      router.replace("/(tabs)/account");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to register.");
    } finally {
      setPending(false);
    }
  };

  return (
    <Screen title="Register" subtitle="Placeholder form for buyer registration and guest-to-account flows.">
      <View className="gap-3 rounded-3xl bg-card p-5 shadow-sm">
        <TextInput
          placeholder="First name"
          value={firstName}
          onChangeText={setFirstName}
          className="rounded-xl border border-ink/10 px-4 py-3"
        />
        <TextInput
          placeholder="Last name"
          value={lastName}
          onChangeText={setLastName}
          className="rounded-xl border border-ink/10 px-4 py-3"
        />
        <TextInput
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          className="rounded-xl border border-ink/10 px-4 py-3"
        />
        <TextInput
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          className="rounded-xl border border-ink/10 px-4 py-3"
        />
        {error ? <Text className="text-sm text-red-600">{error}</Text> : null}
        <Pressable className="rounded-xl bg-accent px-4 py-3" disabled={pending} onPress={handleRegister}>
          <Text className="text-center font-semibold text-white">
            {pending ? "Creating account..." : "Create account"}
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}
