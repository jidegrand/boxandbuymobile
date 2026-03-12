import { Link, router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { Screen } from "../../components/ui/screen";
import { api } from "../../lib/api";
import { queryClient } from "../../lib/query-client";

export default function LoginScreen() {
  const [email, setEmail] = useState("buyer@boxandbuy.local");
  const [password, setPassword] = useState("Password123!");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setPending(true);
    setError(null);

    try {
      await api.login({ email, password });
      await queryClient.invalidateQueries({ queryKey: ["session"] });
      router.replace("/(tabs)/account");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to sign in.");
    } finally {
      setPending(false);
    }
  };

  return (
    <Screen title="Login" subtitle="Placeholder form for the buyer auth flow.">
      <View className="gap-3 rounded-3xl bg-card p-5 shadow-sm">
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
        <Pressable className="rounded-xl bg-accent px-4 py-3" disabled={pending} onPress={handleLogin}>
          <Text className="text-center font-semibold text-white">
            {pending ? "Signing in..." : "Sign in"}
          </Text>
        </Pressable>
        <Link href="/(auth)/register" className="text-center text-sm text-accent">
          Need an account? Register
        </Link>
      </View>
    </Screen>
  );
}
