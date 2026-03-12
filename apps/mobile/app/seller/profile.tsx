import type { SellerProfileUpdateInput } from "@boxandbuy/contracts";

import { useEffect, useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";

import { Screen } from "../../components/ui/screen";
import { SectionCard } from "../../components/ui/section-card";
import { useSellerProfile, useUpdateSellerProfile } from "../../hooks/use-seller-actions";
import { formatDateTime, formatStatusLabel } from "../../lib/format";

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: "default" | "email-address" | "phone-pad" | "url";
};

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  keyboardType = "default"
}: FieldProps) {
  return (
    <View className="gap-1">
      <Text className="text-sm font-medium text-ink">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "auto"}
        className={`rounded-xl border border-ink/10 px-4 py-3 ${multiline ? "min-h-[108px]" : ""}`}
      />
    </View>
  );
}

export default function SellerProfileScreen() {
  const profile = useSellerProfile();
  const updateProfile = useUpdateSellerProfile();
  const [form, setForm] = useState<SellerProfileUpdateInput>({
    shopName: "",
    shopDescription: "",
    shopAddress: "",
    shopPhone: "",
    vatNumber: "",
    bannerUrl: "",
    linkFacebook: "",
    linkGoogle: "",
    linkInstagram: "",
    linkTwitter: "",
    latitude: "",
    longitude: "",
    vacationNotice: ""
  });

  useEffect(() => {
    if (!profile.data) {
      return;
    }

    const seller = profile.data.profile;
    setForm({
      shopName: seller.shopName,
      shopDescription: seller.shopDescription,
      shopAddress: seller.shopAddress,
      shopPhone: seller.shopPhone,
      vatNumber: seller.vatNumber ?? "",
      bannerUrl: seller.bannerUrl ?? "",
      linkFacebook: seller.linkFacebook ?? "",
      linkGoogle: seller.linkGoogle ?? "",
      linkInstagram: seller.linkInstagram ?? "",
      linkTwitter: seller.linkTwitter ?? "",
      latitude: seller.latitude !== undefined ? String(seller.latitude) : "",
      longitude: seller.longitude !== undefined ? String(seller.longitude) : "",
      vacationNotice: seller.vacationNotice ?? ""
    });
  }, [profile.data]);

  const updateField = <K extends keyof SellerProfileUpdateInput>(key: K, value: SellerProfileUpdateInput[K]) => {
    setForm((current) => ({
      ...current,
      [key]: value
    }));
  };

  const handleSubmit = async () => {
    try {
      const response = await updateProfile.mutateAsync(form);
      Alert.alert("Seller profile updated", response.message);
    } catch (error) {
      Alert.alert(
        "Unable to update profile",
        error instanceof Error ? error.message : "Please try again."
      );
    }
  };

  return (
    <Screen title="Seller profile" subtitle="Manage the textual marketplace profile used by your seller account.">
      {profile.isLoading ? (
        <SectionCard title="Loading profile">
          <Text className="text-sm text-muted">Fetching your seller profile and marketplace permissions...</Text>
        </SectionCard>
      ) : null}

      {profile.isError ? (
        <SectionCard title="Unable to load profile">
          <Text className="text-sm text-red-600">
            {profile.error instanceof Error ? profile.error.message : "Seller profile is not available right now."}
          </Text>
        </SectionCard>
      ) : null}

      {profile.data ? (
        <>
          <SectionCard title="Seller account">
            <Text className="text-base font-semibold text-ink">{profile.data.profile.displayName}</Text>
            <Text className="text-sm text-muted">
              {profile.data.profile.ownerName}
              {profile.data.profile.ownerEmail ? ` · ${profile.data.profile.ownerEmail}` : ""}
            </Text>
            <Text className="text-sm text-muted">
              Verification: {formatStatusLabel(profile.data.profile.verificationStatus)}
            </Text>
            {profile.data.profile.verificationExpiresAt ? (
              <Text className="text-sm text-muted">
                Expires {formatDateTime(profile.data.profile.verificationExpiresAt)}
              </Text>
            ) : null}
            {profile.data.profile.updatedAt ? (
              <Text className="text-sm text-muted">
                Last updated {formatDateTime(profile.data.profile.updatedAt)}
              </Text>
            ) : null}
          </SectionCard>

          <SectionCard title="Editable fields">
            <Field
              label="Shop Name"
              value={form.shopName}
              onChangeText={(value) => updateField("shopName", value)}
              placeholder="BoxAndBuy Seller"
            />
            <Field
              label="Shop Description"
              value={form.shopDescription}
              onChangeText={(value) => updateField("shopDescription", value)}
              multiline
              placeholder="Tell buyers what your store specializes in."
            />
            <Field
              label="Shop Address"
              value={form.shopAddress}
              onChangeText={(value) => updateField("shopAddress", value)}
              multiline
              placeholder="Warehouse or dispatch address"
            />
            <Field
              label="Shop Phone"
              value={form.shopPhone}
              onChangeText={(value) => updateField("shopPhone", value)}
              keyboardType="phone-pad"
              placeholder="+1 555 123 4567"
            />
            <Field
              label="VAT Number"
              value={form.vatNumber ?? ""}
              onChangeText={(value) => updateField("vatNumber", value)}
              placeholder="Optional"
            />
            <Field
              label="Banner URL"
              value={form.bannerUrl ?? ""}
              onChangeText={(value) => updateField("bannerUrl", value)}
              keyboardType="url"
              placeholder="https://..."
            />
            <Field
              label="Facebook"
              value={form.linkFacebook ?? ""}
              onChangeText={(value) => updateField("linkFacebook", value)}
              keyboardType="url"
              placeholder="https://facebook.com/..."
            />
            <Field
              label="Google"
              value={form.linkGoogle ?? ""}
              onChangeText={(value) => updateField("linkGoogle", value)}
              keyboardType="url"
              placeholder="https://..."
            />
            <Field
              label="Instagram"
              value={form.linkInstagram ?? ""}
              onChangeText={(value) => updateField("linkInstagram", value)}
              keyboardType="url"
              placeholder="https://instagram.com/..."
            />
            <Field
              label="Twitter"
              value={form.linkTwitter ?? ""}
              onChangeText={(value) => updateField("linkTwitter", value)}
              keyboardType="url"
              placeholder="https://x.com/..."
            />
            <Field
              label="Latitude"
              value={form.latitude ?? ""}
              onChangeText={(value) => updateField("latitude", value)}
              placeholder="Optional"
            />
            <Field
              label="Longitude"
              value={form.longitude ?? ""}
              onChangeText={(value) => updateField("longitude", value)}
              placeholder="Optional"
            />
            <Field
              label="Vacation Notice"
              value={form.vacationNotice ?? ""}
              onChangeText={(value) => updateField("vacationNotice", value)}
              multiline
              placeholder="Optional seller holiday notice"
            />
            <Pressable
              className={`rounded-xl px-4 py-3 ${updateProfile.isPending ? "bg-ink/40" : "bg-ink"}`}
              disabled={updateProfile.isPending}
              onPress={() => {
                void handleSubmit();
              }}
            >
              <Text className="text-center font-semibold text-white">
                {updateProfile.isPending ? "Saving..." : "Save seller profile"}
              </Text>
            </Pressable>
          </SectionCard>

          <SectionCard title="Permissions">
            <Text className="text-sm text-muted">
              Profile updates: {profile.data.permissions.canManageProfile ? "Allowed" : "Blocked"}
            </Text>
            <Text className="text-sm text-muted">
              Messages: {profile.data.permissions.canManageMessages ? "Allowed" : "Blocked"}
            </Text>
            <Text className="text-sm text-muted">
              Payout requests: {profile.data.permissions.canRequestPayouts ? "Allowed" : "Blocked"}
            </Text>
          </SectionCard>
        </>
      ) : null}
    </Screen>
  );
}
