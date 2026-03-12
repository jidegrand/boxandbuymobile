import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { Screen } from "../../../components/ui/screen";
import { SectionCard } from "../../../components/ui/section-card";
import { useSellerMessageThreads } from "../../../hooks/use-seller-actions";
import { formatDateTime, formatStatusLabel } from "../../../lib/format";

export default function SellerMessagesScreen() {
  const threads = useSellerMessageThreads();

  return (
    <Screen title="Seller messages" subtitle="Review order threads and shop contact conversations from mobile.">
      {threads.isLoading ? (
        <SectionCard title="Loading messages">
          <Text className="text-sm text-muted">Fetching seller order and contact threads...</Text>
        </SectionCard>
      ) : null}

      {threads.isError ? (
        <SectionCard title="Unable to load messages">
          <Text className="text-sm text-red-600">
            {threads.error instanceof Error ? threads.error.message : "Seller messages are unavailable right now."}
          </Text>
        </SectionCard>
      ) : null}

      {threads.data ? (
        <>
          <SectionCard title="Permissions">
            <Text className="text-sm text-muted">
              Message replies: {threads.data.permissions.canManageMessages ? "Allowed" : "Blocked"}
            </Text>
          </SectionCard>

          <SectionCard title="Threads">
            {threads.data.items.length ? (
              threads.data.items.map((thread) => (
                <Link
                  key={thread.id}
                  asChild
                  href={{ pathname: "/seller/messages/[id]", params: { id: thread.id } }}
                >
                  <Pressable className="rounded-2xl border border-ink/10 px-4 py-4">
                    <View className="gap-1">
                      <Text className="font-semibold text-ink">{thread.subject}</Text>
                      <Text className="text-sm text-muted">
                        {formatStatusLabel(thread.type)}
                        {thread.customerName ? ` · ${thread.customerName}` : ""}
                      </Text>
                      {thread.preview ? (
                        <Text className="text-sm leading-6 text-muted">{thread.preview}</Text>
                      ) : null}
                      <Text className="text-xs text-muted">
                        {formatDateTime(thread.lastMessageAt)} · {thread.unreadCount} unread
                      </Text>
                    </View>
                  </Pressable>
                </Link>
              ))
            ) : (
              <Text className="text-sm text-muted">No seller message threads are available right now.</Text>
            )}
          </SectionCard>
        </>
      ) : null}
    </Screen>
  );
}
