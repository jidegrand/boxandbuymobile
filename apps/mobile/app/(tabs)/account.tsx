import type {
  BusinessApplicationStatus,
  GuestBusinessApplicationInput,
  TermsApplicationStatus
} from "@boxandbuy/contracts";

import { Link, router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";

import { RfqStatusBadge } from "../../components/rfqs/status-badge";
import { Screen } from "../../components/ui/screen";
import { SectionCard } from "../../components/ui/section-card";
import {
  useBusinessOverview,
  useSubmitBusinessApplication,
  useSubmitGuestBusinessApplication,
  useSubmitTermsApplication
} from "../../hooks/use-business";
import { useRfqs } from "../../hooks/use-rfqs";
import { useSession } from "../../hooks/use-session";
import { formatCurrency, formatDateTime, formatStatusLabel } from "../../lib/format";
import { api } from "../../lib/api";
import { queryClient } from "../../lib/query-client";
import { useAuthStore } from "../../store/auth.store";

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: "default" | "email-address" | "phone-pad";
  secureTextEntry?: boolean;
  autoCapitalize?: "none" | "sentences" | "words";
};

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  keyboardType = "default",
  secureTextEntry = false,
  autoCapitalize = "sentences"
}: FieldProps) {
  return (
    <View className="gap-1">
      <Text className="text-sm font-medium text-ink">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "auto"}
        className={`rounded-xl border border-ink/10 px-4 py-3 ${multiline ? "min-h-[104px]" : ""}`}
      />
    </View>
  );
}

function StatusBadge({ status }: { status: BusinessApplicationStatus | TermsApplicationStatus }) {
  const palette =
    status === "approved"
      ? { borderColor: "#3D7A47", backgroundColor: "#EAF6EC", textColor: "#2E5E36" }
      : status === "pending"
        ? { borderColor: "#9A7A2A", backgroundColor: "#FBF4DE", textColor: "#80631A" }
        : { borderColor: "#A84C4C", backgroundColor: "#FBE8E8", textColor: "#8A3737" };

  return (
    <View
      className="self-start rounded-full border px-3 py-1"
      style={{ borderColor: palette.borderColor, backgroundColor: palette.backgroundColor }}
    >
      <Text className="text-xs font-semibold" style={{ color: palette.textColor }}>
        {formatStatusLabel(status)}
      </Text>
    </View>
  );
}

export default function AccountScreen() {
  const session = useSession();
  const hydrated = useAuthStore((state) => state.hydrated);
  const accessToken = useAuthStore((state) => state.accessToken);
  const businessOverview = useBusinessOverview();
  const rfqs = useRfqs();
  const submitBusinessApplication = useSubmitBusinessApplication();
  const submitTermsApplication = useSubmitTermsApplication();
  const submitGuestBusinessApplication = useSubmitGuestBusinessApplication();
  const [companyName, setCompanyName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessMessage, setBusinessMessage] = useState("");
  const [requestedTermsDays, setRequestedTermsDays] = useState<15 | 30>(15);
  const [termsNote, setTermsNote] = useState("");
  const [guestForm, setGuestForm] = useState<GuestBusinessApplicationInput>({
    firstName: "",
    lastName: "",
    email: "",
    companyName: "",
    taxId: "",
    phone: "",
    message: "",
    password: "",
    passwordConfirmation: ""
  });

  useEffect(() => {
    if (!businessOverview.data) {
      return;
    }

    setCompanyName(businessOverview.data.application?.companyName ?? "");
    setTaxId(businessOverview.data.application?.taxId ?? "");
    setBusinessPhone(businessOverview.data.application?.phone ?? "");
    setBusinessMessage(businessOverview.data.application?.message ?? "");
    setRequestedTermsDays(
      businessOverview.data.termsApplication?.requestedTermsDays === 30 ? 30 : 15
    );
    setTermsNote(businessOverview.data.termsApplication?.customerNote ?? "");
  }, [
    businessOverview.data?.application?.companyName,
    businessOverview.data?.application?.taxId,
    businessOverview.data?.application?.phone,
    businessOverview.data?.application?.message,
    businessOverview.data?.termsApplication?.requestedTermsDays,
    businessOverview.data?.termsApplication?.customerNote
  ]);

  const handleLogout = async () => {
    await api.logout();
    await queryClient.removeQueries({ queryKey: ["session"] });
    await queryClient.removeQueries({ queryKey: ["business"] });
    await queryClient.removeQueries({ queryKey: ["rfqs"] });
    await queryClient.removeQueries({ queryKey: ["seller"] });
    router.replace("/(auth)/login");
  };

  const handleSubmitBusinessApplication = async () => {
    try {
      const response = await submitBusinessApplication.mutateAsync({
        companyName,
        taxId,
        phone: businessPhone,
        message: businessMessage
      });
      Alert.alert("Business application updated", response.message);
    } catch (error) {
      Alert.alert(
        "Unable to submit application",
        error instanceof Error ? error.message : "Please try again."
      );
    }
  };

  const handleSubmitTermsApplication = async () => {
    try {
      const response = await submitTermsApplication.mutateAsync({
        requestedTermsDays,
        customerNote: termsNote
      });
      Alert.alert("Terms request submitted", response.message);
    } catch (error) {
      Alert.alert(
        "Unable to submit terms request",
        error instanceof Error ? error.message : "Please try again."
      );
    }
  };

  const handleSubmitGuestApplication = async () => {
    try {
      const response = await submitGuestBusinessApplication.mutateAsync(guestForm);
      Alert.alert("Application received", response.message);
      setGuestForm({
        firstName: "",
        lastName: "",
        email: "",
        companyName: "",
        taxId: "",
        phone: "",
        message: "",
        password: "",
        passwordConfirmation: ""
      });
    } catch (error) {
      Alert.alert(
        "Unable to submit guest application",
        error instanceof Error ? error.message : "Please try again."
      );
    }
  };

  const updateGuestField = <K extends keyof GuestBusinessApplicationInput>(
    key: K,
    value: GuestBusinessApplicationInput[K]
  ) => {
    setGuestForm((current) => ({
      ...current,
      [key]: value
    }));
  };

  const businessStatus = businessOverview.data?.application?.status;
  const termsStatus = businessOverview.data?.termsApplication?.status;

  return (
    <Screen title="Account" subtitle="Buyer session, Business access, and invoice terms are managed here.">
      <SectionCard title="Session">
        {hydrated && accessToken ? (
          <View className="gap-2">
            <Text className="text-sm text-muted">{session.data?.user.email ?? "Loading buyer profile..."}</Text>
            {session.data?.user.name ? (
              <Text className="text-sm text-muted">{session.data.user.name}</Text>
            ) : null}
          </View>
        ) : (
          <Text className="text-sm text-muted">No active API session yet.</Text>
        )}
      </SectionCard>

      <SectionCard title="Actions">
        {!accessToken ? (
          <>
            <Link href="/(auth)/login" className="rounded-xl bg-ink px-4 py-3 text-center text-white">
              Sign in
            </Link>
            <Link href="/(auth)/register" className="mt-3 rounded-xl border border-ink/10 px-4 py-3 text-center text-ink">
              Register
            </Link>
          </>
        ) : (
          <Pressable className="rounded-xl border border-red-300 px-4 py-3" onPress={handleLogout}>
            <Text className="text-center font-semibold text-red-600">Logout</Text>
          </Pressable>
        )}
      </SectionCard>

      {!accessToken ? (
        <SectionCard title="Guest Business Application">
          <Text className="text-sm leading-6 text-muted">
            Apply for Business access before creating a normal buyer session. Approval is still required before RFQ or invoice terms are enabled.
          </Text>
          <Field
            label="First Name"
            value={guestForm.firstName}
            onChangeText={(value) => updateGuestField("firstName", value)}
            placeholder="Procurement"
            autoCapitalize="words"
          />
          <Field
            label="Last Name"
            value={guestForm.lastName}
            onChangeText={(value) => updateGuestField("lastName", value)}
            placeholder="Manager"
            autoCapitalize="words"
          />
          <Field
            label="Email"
            value={guestForm.email}
            onChangeText={(value) => updateGuestField("email", value)}
            placeholder="buyer@company.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Field
            label="Company Name"
            value={guestForm.companyName}
            onChangeText={(value) => updateGuestField("companyName", value)}
            placeholder="Company LLC"
            autoCapitalize="words"
          />
          <Field
            label="Tax ID"
            value={guestForm.taxId ?? ""}
            onChangeText={(value) => updateGuestField("taxId", value)}
            placeholder="Optional"
            autoCapitalize="none"
          />
          <Field
            label="Business Phone"
            value={guestForm.phone ?? ""}
            onChangeText={(value) => updateGuestField("phone", value)}
            placeholder="Optional"
            keyboardType="phone-pad"
          />
          <Field
            label="Notes"
            value={guestForm.message ?? ""}
            onChangeText={(value) => updateGuestField("message", value)}
            placeholder="Volumes, categories, delivery expectations, or procurement details."
            multiline
          />
          <Field
            label="Password"
            value={guestForm.password}
            onChangeText={(value) => updateGuestField("password", value)}
            placeholder="Minimum 8 characters"
            secureTextEntry
            autoCapitalize="none"
          />
          <Field
            label="Confirm Password"
            value={guestForm.passwordConfirmation}
            onChangeText={(value) => updateGuestField("passwordConfirmation", value)}
            placeholder="Repeat password"
            secureTextEntry
            autoCapitalize="none"
          />
          <Pressable
            className="rounded-xl bg-accent px-4 py-3"
            disabled={submitGuestBusinessApplication.isPending}
            onPress={() => {
              void handleSubmitGuestApplication();
            }}
          >
            <Text className="text-center font-semibold text-white">
              {submitGuestBusinessApplication.isPending ? "Submitting..." : "Submit guest business application"}
            </Text>
          </Pressable>
        </SectionCard>
      ) : (
        <>
          <SectionCard title="Business Application">
            {businessOverview.isLoading ? <Text className="text-sm text-muted">Loading business status...</Text> : null}
            {businessOverview.isError ? (
              <Text className="text-sm text-red-600">
                {businessOverview.error instanceof Error
                  ? businessOverview.error.message
                  : "Unable to load your Business status right now."}
              </Text>
            ) : null}
            {businessOverview.data ? (
              <>
                {businessStatus ? (
                  <>
                    <StatusBadge status={businessStatus} />
                    <Text className="text-sm text-muted">
                      Last updated {formatDateTime(businessOverview.data.application!.updatedAt)}
                    </Text>
                  </>
                ) : (
                  <Text className="text-sm text-muted">
                    No business application has been submitted from this account yet.
                  </Text>
                )}

                {!businessOverview.data.accountActive ? (
                  <Text className="text-sm text-red-600">
                    Your customer account is currently disabled. Business services are paused until support re-enables access.
                  </Text>
                ) : null}

                {businessStatus === "approved" ? (
                  <Text className="text-sm leading-6 text-muted">
                    Business access is active. RFQ checkout and other Business buyer tools are available from this account.
                  </Text>
                ) : null}

                {businessOverview.data.application?.adminNote ? (
                  <Text className="text-sm text-muted">
                    Review note: {businessOverview.data.application.adminNote}
                  </Text>
                ) : null}

                {businessOverview.data.canSubmitApplication ? (
                  <>
                    <Field
                      label="Company Name"
                      value={companyName}
                      onChangeText={setCompanyName}
                      placeholder="Company LLC"
                      autoCapitalize="words"
                    />
                    <Field
                      label="Tax ID"
                      value={taxId}
                      onChangeText={setTaxId}
                      placeholder="Optional"
                      autoCapitalize="none"
                    />
                    <Field
                      label="Business Phone"
                      value={businessPhone}
                      onChangeText={setBusinessPhone}
                      placeholder="Optional"
                      keyboardType="phone-pad"
                    />
                    <Field
                      label="Notes"
                      value={businessMessage}
                      onChangeText={setBusinessMessage}
                      placeholder="Company profile, purchasing volume, delivery requirements, or approval context."
                      multiline
                    />
                    <Pressable
                      className="rounded-xl bg-accent px-4 py-3"
                      disabled={submitBusinessApplication.isPending}
                      onPress={() => {
                        void handleSubmitBusinessApplication();
                      }}
                    >
                      <Text className="text-center font-semibold text-white">
                        {submitBusinessApplication.isPending
                          ? "Submitting..."
                          : businessStatus
                            ? "Update and resubmit"
                            : "Submit business application"}
                      </Text>
                    </Pressable>
                  </>
                ) : null}
              </>
            ) : null}
          </SectionCard>

          <SectionCard title="Invoice Terms">
            {businessOverview.isLoading ? <Text className="text-sm text-muted">Loading invoice terms...</Text> : null}
            {businessOverview.data ? (
              <>
                {!businessOverview.data.accountActive ? (
                  <Text className="text-sm text-red-600">
                    Invoice checkout is disabled while your account is inactive.
                  </Text>
                ) : !businessOverview.data.isBusinessCustomer ? (
                  <Text className="text-sm text-muted">
                    Invoice terms unlock after Business approval.
                  </Text>
                ) : (
                  <>
                    {termsStatus ? <StatusBadge status={termsStatus} /> : null}
                    {businessOverview.data.termsApplication ? (
                      <Text className="text-sm text-muted">
                        Last updated {formatDateTime(businessOverview.data.termsApplication.updatedAt)}
                      </Text>
                    ) : (
                      <Text className="text-sm text-muted">No invoice terms request has been submitted yet.</Text>
                    )}

                    {termsStatus === "approved" ? (
                      <Text className="text-sm leading-6 text-muted">
                        Invoice checkout is enabled on this account: Net {businessOverview.data.approvedTermsDays}.
                      </Text>
                    ) : null}

                    {termsStatus === "pending" ? (
                      <Text className="text-sm text-muted">
                        Your invoice terms request is under review.
                      </Text>
                    ) : null}

                    {businessOverview.data.termsApplication?.adminNote ? (
                      <Text className="text-sm text-muted">
                        Review note: {businessOverview.data.termsApplication.adminNote}
                      </Text>
                    ) : null}

                    {businessOverview.data.canApplyForTerms ? (
                      <>
                        <View className="gap-2">
                          <Text className="text-sm font-medium text-ink">Requested Terms</Text>
                          <View className="flex-row gap-3">
                            {[15, 30].map((days) => (
                              <Pressable
                                key={days}
                                className={`flex-1 rounded-xl border px-4 py-3 ${
                                  requestedTermsDays === days ? "border-accent bg-accent/10" : "border-ink/10"
                                }`}
                                onPress={() => setRequestedTermsDays(days as 15 | 30)}
                              >
                                <Text className="text-center font-medium text-ink">Net {days}</Text>
                              </Pressable>
                            ))}
                          </View>
                        </View>
                        <Field
                          label="Terms Notes"
                          value={termsNote}
                          onChangeText={setTermsNote}
                          placeholder="Requested limit, buying cadence, or payment context."
                          multiline
                        />
                        <Pressable
                          className="rounded-xl bg-ink px-4 py-3"
                          disabled={submitTermsApplication.isPending}
                          onPress={() => {
                            void handleSubmitTermsApplication();
                          }}
                        >
                          <Text className="text-center font-semibold text-white">
                            {submitTermsApplication.isPending ? "Submitting..." : "Apply for invoice terms"}
                          </Text>
                        </Pressable>
                      </>
                    ) : null}
                  </>
                )}
              </>
            ) : null}
          </SectionCard>

          <SectionCard title="Quote History">
            {rfqs.isLoading ? <Text className="text-sm text-muted">Loading quote history...</Text> : null}
            {rfqs.isError ? (
              <Text className="text-sm text-red-600">
                {rfqs.error instanceof Error ? rfqs.error.message : "Unable to load your quote history right now."}
              </Text>
            ) : null}
            {rfqs.data?.length ? (
              <View className="gap-3">
                {rfqs.data.map((rfq) => (
                  <Link
                    key={rfq.id}
                    href={`/rfqs/${rfq.id}`}
                    className="rounded-2xl border border-ink/10 px-4 py-4"
                  >
                    <View className="gap-2">
                      <RfqStatusBadge status={rfq.status} />
                      <Text className="font-semibold text-ink">{rfq.reference}</Text>
                      <Text className="text-sm text-muted">
                        Submitted {formatDateTime(rfq.submittedAt)}
                      </Text>
                      <Text className="text-sm text-muted">
                        {rfq.itemCount} item{rfq.itemCount === 1 ? "" : "s"} · {formatCurrency(rfq.totalAmount, rfq.currencyCode)}
                      </Text>
                      {rfq.quoteExpiresAt ? (
                        <Text className="text-sm text-muted">
                          Quote expires {formatDateTime(rfq.quoteExpiresAt)}
                        </Text>
                      ) : null}
                    </View>
                  </Link>
                ))}
              </View>
            ) : rfqs.isLoading || rfqs.isError ? null : (
              <Text className="text-sm text-muted">No RFQs have been submitted from this account yet.</Text>
            )}
          </SectionCard>
        </>
      )}
    </Screen>
  );
}
