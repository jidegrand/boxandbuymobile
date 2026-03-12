import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";

import { Screen } from "../../components/ui/screen";
import { SectionCard } from "../../components/ui/section-card";
import {
  useSellerPayoutOverview,
  useSubmitSellerPayoutRequest
} from "../../hooks/use-seller-actions";
import { formatCurrency, formatDateTime, formatStatusLabel } from "../../lib/format";

export default function SellerPayoutsScreen() {
  const overview = useSellerPayoutOverview();
  const submitPayout = useSubmitSellerPayoutRequest();
  const [selectedMethodId, setSelectedMethodId] = useState<string>();
  const [amount, setAmount] = useState("");
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!overview.data || selectedMethodId) {
      return;
    }

    const firstAvailableMethod = overview.data.methods.find((method) => method.supportsMobileSubmission);
    setSelectedMethodId(firstAvailableMethod?.id ?? overview.data.methods[0]?.id);
  }, [overview.data, selectedMethodId]);

  const selectedMethod = useMemo(
    () => overview.data?.methods.find((method) => method.id === selectedMethodId),
    [overview.data, selectedMethodId]
  );

  useEffect(() => {
    if (!selectedMethod) {
      return;
    }

    setFieldValues((current) => {
      const next = { ...current };

      for (const field of selectedMethod.fields) {
        if (next[field.id] === undefined) {
          next[field.id] = field.lastValue ?? "";
        }
      }

      return next;
    });
  }, [selectedMethod]);

  const handleSubmit = async () => {
    const parsedAmount = Number.parseFloat(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || !selectedMethod) {
      Alert.alert("Invalid payout request", "Select a payout method and enter a valid amount.");
      return;
    }

    try {
      const response = await submitPayout.mutateAsync({
        paymentMethodId: selectedMethod.id,
        amount: parsedAmount,
        fields: fieldValues
      });
      setAmount("");
      Alert.alert("Payout submitted", response.message);
    } catch (error) {
      Alert.alert(
        "Unable to submit payout",
        error instanceof Error ? error.message : "Please try again."
      );
    }
  };

  return (
    <Screen title="Seller payouts" subtitle="Review available balance, payout methods, and recent requests.">
      {overview.isLoading ? (
        <SectionCard title="Loading payouts">
          <Text className="text-sm text-muted">Fetching payout balance and seller withdrawal methods...</Text>
        </SectionCard>
      ) : null}

      {overview.isError ? (
        <SectionCard title="Unable to load payouts">
          <Text className="text-sm text-red-600">
            {overview.error instanceof Error ? overview.error.message : "Seller payouts are unavailable right now."}
          </Text>
        </SectionCard>
      ) : null}

      {overview.data ? (
        <>
          <SectionCard title="Balance">
            <Text className="text-lg font-semibold text-ink">
              {formatCurrency(overview.data.summary.availableBalance, "USD")}
            </Text>
            <Text className="text-sm text-muted">
              Total commission {formatCurrency(overview.data.summary.totalCommission, "USD")}
            </Text>
            <Text className="text-sm text-muted">
              Total withdrawn {formatCurrency(overview.data.summary.totalWithdrawn, "USD")}
            </Text>
            <Text className="text-sm text-muted">
              Verification {formatStatusLabel(overview.data.summary.verificationStatus)}
            </Text>
            {overview.data.summary.minimumAmount !== null ? (
              <Text className="text-sm text-muted">
                Minimum {formatCurrency(overview.data.summary.minimumAmount, "USD")}
              </Text>
            ) : null}
            {overview.data.summary.maximumAmount !== null ? (
              <Text className="text-sm text-muted">
                Maximum {formatCurrency(overview.data.summary.maximumAmount, "USD")}
              </Text>
            ) : null}
          </SectionCard>

          <SectionCard title="Payout methods">
            {overview.data.methods.map((method) => (
              <Pressable
                key={method.id}
                className={`rounded-2xl border px-4 py-4 ${
                  selectedMethodId === method.id ? "border-ink bg-card" : "border-ink/10"
                }`}
                onPress={() => setSelectedMethodId(method.id)}
              >
                <View className="gap-1">
                  <Text className="font-semibold text-ink">{method.title}</Text>
                  {method.description ? <Text className="text-sm text-muted">{method.description}</Text> : null}
                  <Text className="text-sm text-muted">
                    Fee {method.feeType === "percent" ? `${method.feePercent}%` : formatCurrency(method.feeFixed, "USD")}
                  </Text>
                  <Text className="text-sm text-muted">
                    Estimated {method.estimatedProcessingDays} day
                    {method.estimatedProcessingDays === 1 ? "" : "s"}
                  </Text>
                  {!method.supportsMobileSubmission ? (
                    <Text className="text-sm text-red-600">{method.blockedReason ?? "Unsupported on mobile."}</Text>
                  ) : null}
                </View>
              </Pressable>
            ))}
          </SectionCard>

          {selectedMethod ? (
            <SectionCard title="Request payout">
              <TextInput
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="Amount"
                className="rounded-xl border border-ink/10 px-4 py-3"
              />

              {selectedMethod.fields.map((field) => (
                <View key={field.id} className="gap-1">
                  <Text className="text-sm font-medium text-ink">
                    {field.title}
                    {field.required ? " *" : ""}
                  </Text>
                  <TextInput
                    value={fieldValues[field.id] ?? ""}
                    onChangeText={(value) =>
                      setFieldValues((current) => ({
                        ...current,
                        [field.id]: value
                      }))
                    }
                    placeholder={field.description ?? "Enter payout field value"}
                    className="rounded-xl border border-ink/10 px-4 py-3"
                  />
                </View>
              ))}

              <Pressable
                className={`rounded-xl px-4 py-3 ${
                  submitPayout.isPending || !selectedMethod.supportsMobileSubmission ? "bg-ink/40" : "bg-ink"
                }`}
                disabled={submitPayout.isPending || !selectedMethod.supportsMobileSubmission}
                onPress={() => {
                  void handleSubmit();
                }}
              >
                <Text className="text-center font-semibold text-white">
                  {submitPayout.isPending ? "Submitting..." : "Submit payout request"}
                </Text>
              </Pressable>
            </SectionCard>
          ) : null}

          <SectionCard title="Recent requests">
            {overview.data.recentRequests.length ? (
              overview.data.recentRequests.map((request) => (
                <View key={request.id} className="rounded-2xl border border-ink/10 px-4 py-4">
                  <Text className="font-semibold text-ink">
                    {formatCurrency(request.amount, "USD")} via {request.paymentMethodName}
                  </Text>
                  <Text className="text-sm text-muted">
                    Net {formatCurrency(request.netAmount, "USD")} · Fee {formatCurrency(request.fee, "USD")}
                  </Text>
                  <Text className="text-sm text-muted">
                    {formatStatusLabel(request.status)} · {formatDateTime(request.requestedAt)}
                  </Text>
                </View>
              ))
            ) : (
              <Text className="text-sm text-muted">No payout requests have been created yet.</Text>
            )}
          </SectionCard>
        </>
      ) : null}
    </Screen>
  );
}
