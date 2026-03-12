import { Alert, Linking, Pressable, Text } from "react-native";

import { Screen } from "../../components/ui/screen";
import { SectionCard } from "../../components/ui/section-card";
import { useCheckoutSession } from "../../hooks/use-orders";
import { formatCurrency } from "../../lib/format";
import { useAuthStore } from "../../store/auth.store";

export default function CheckoutScreen() {
  const hydrated = useAuthStore((state) => state.hydrated);
  const accessToken = useAuthStore((state) => state.accessToken);
  const session = useCheckoutSession();

  const handleOpenCheckout = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert("Unable to open checkout", error instanceof Error ? error.message : "Please try again.");
    }
  };

  if (!hydrated) {
    return (
      <Screen title="Checkout" subtitle="Loading your session before checkout handoff.">
        <SectionCard title="Please wait">
          <Text className="text-sm text-muted">Checking whether you already have a signed-in buyer session.</Text>
        </SectionCard>
      </Screen>
    );
  }

  if (!accessToken) {
    return (
      <Screen title="Checkout" subtitle="Sign in before continuing to checkout.">
        <SectionCard title="Buyer session required">
          <Text className="text-sm text-muted">
            Checkout handoff is only available for signed-in buyer accounts.
          </Text>
        </SectionCard>
      </Screen>
    );
  }

  return (
    <Screen title="Checkout" subtitle="Checkout is currently orchestrated as a secure web handoff.">
      <SectionCard title="Checkout session">
        {session.isLoading ? <Text className="text-sm text-muted">Preparing checkout handoff...</Text> : null}
        {session.isError ? (
          <Text className="text-sm text-red-600">
            {session.error instanceof Error ? session.error.message : "Unable to prepare checkout right now."}
          </Text>
        ) : null}
        {session.data ? (
          <>
            <Text className="text-sm text-muted">
              {session.data.itemCount} item{session.data.itemCount === 1 ? "" : "s"} in cart
            </Text>
            <Text className="text-lg font-semibold text-ink">
              {formatCurrency(session.data.estimatedTotalAmount, session.data.currencyCode)}
            </Text>
            <Text className="text-sm leading-6 text-muted">{session.data.message}</Text>
            {session.data.requiresStorefrontLogin ? (
              <Text className="text-sm text-muted">
                The first release keeps payment on the storefront, so you may need to authenticate again in web checkout.
              </Text>
            ) : null}
            {session.data.checkoutUrl ? (
              <Pressable
                className="rounded-xl bg-ink px-4 py-3"
                onPress={() => {
                  void handleOpenCheckout(session.data.checkoutUrl!);
                }}
              >
                <Text className="text-center font-semibold text-white">Open secure web checkout</Text>
              </Pressable>
            ) : null}
          </>
        ) : null}
      </SectionCard>
    </Screen>
  );
}
