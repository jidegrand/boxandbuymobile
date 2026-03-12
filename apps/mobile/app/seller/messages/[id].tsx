import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";

import { Screen } from "../../../components/ui/screen";
import { SectionCard } from "../../../components/ui/section-card";
import {
  useReplyToSellerMessageThread,
  useSellerMessageThread
} from "../../../hooks/use-seller-actions";
import { formatDateTime, formatStatusLabel } from "../../../lib/format";

export default function SellerMessageThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const thread = useSellerMessageThread(id);
  const reply = useReplyToSellerMessageThread(id ?? "");
  const [message, setMessage] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");

  const handleReply = async () => {
    if (!id) {
      return;
    }

    try {
      const response = await reply.mutateAsync({
        message,
        visibility
      });
      setMessage("");
      Alert.alert("Reply sent", response.message);
    } catch (error) {
      Alert.alert("Unable to send reply", error instanceof Error ? error.message : "Please try again.");
    }
  };

  return (
    <Screen title="Seller thread" subtitle={`Conversation detail for ${id ?? "unknown"}.`}>
      {thread.isLoading ? (
        <SectionCard title="Loading thread">
          <Text className="text-sm text-muted">Fetching messages and conversation details...</Text>
        </SectionCard>
      ) : null}

      {thread.isError ? (
        <SectionCard title="Unable to load thread">
          <Text className="text-sm text-red-600">
            {thread.error instanceof Error ? thread.error.message : "This seller thread is unavailable right now."}
          </Text>
        </SectionCard>
      ) : null}

      {thread.data ? (
        <>
          <SectionCard title={thread.data.thread.subject}>
            <Text className="text-sm text-muted">
              {formatStatusLabel(thread.data.thread.type)}
              {thread.data.thread.customerName ? ` · ${thread.data.thread.customerName}` : ""}
            </Text>
            {thread.data.thread.customerEmail ? (
              <Text className="text-sm text-muted">{thread.data.thread.customerEmail}</Text>
            ) : null}
            {thread.data.thread.orderReference ? (
              <Text className="text-sm text-muted">Order reference: {thread.data.thread.orderReference}</Text>
            ) : null}
          </SectionCard>

          <SectionCard title="Conversation">
            {thread.data.thread.messages.length ? (
              thread.data.thread.messages.map((item) => (
                <View key={item.id} className="rounded-2xl border border-ink/10 px-4 py-4">
                  <View className="gap-1">
                    <Text className="font-semibold text-ink">
                      {item.senderName} · {formatStatusLabel(item.senderRole)}
                    </Text>
                    <Text className="text-xs text-muted">
                      {formatDateTime(item.createdAt)} · {formatStatusLabel(item.visibility)}
                    </Text>
                    <Text className="text-sm leading-6 text-muted">{item.body}</Text>
                  </View>
                </View>
              ))
            ) : (
              <Text className="text-sm text-muted">This thread does not have any messages yet.</Text>
            )}
          </SectionCard>

          <SectionCard title="Reply">
            {thread.data.thread.type === "order" ? (
              <View className="flex-row gap-3">
                <Pressable
                  className={`flex-1 rounded-xl border px-4 py-3 ${
                    visibility === "public" ? "border-ink bg-ink" : "border-ink/10"
                  }`}
                  onPress={() => setVisibility("public")}
                >
                  <Text className={`text-center font-medium ${visibility === "public" ? "text-white" : "text-ink"}`}>
                    Public
                  </Text>
                </Pressable>
                <Pressable
                  className={`flex-1 rounded-xl border px-4 py-3 ${
                    visibility === "private" ? "border-ink bg-ink" : "border-ink/10"
                  }`}
                  onPress={() => setVisibility("private")}
                >
                  <Text className={`text-center font-medium ${visibility === "private" ? "text-white" : "text-ink"}`}>
                    Private
                  </Text>
                </Pressable>
              </View>
            ) : null}

            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Type your reply"
              multiline
              textAlignVertical="top"
              className="min-h-[128px] rounded-xl border border-ink/10 px-4 py-3"
            />
            <Pressable
              className={`rounded-xl px-4 py-3 ${reply.isPending ? "bg-ink/40" : "bg-ink"}`}
              disabled={reply.isPending}
              onPress={() => {
                void handleReply();
              }}
            >
              <Text className="text-center font-semibold text-white">
                {reply.isPending ? "Sending..." : "Send seller reply"}
              </Text>
            </Pressable>
          </SectionCard>
        </>
      ) : null}
    </Screen>
  );
}
