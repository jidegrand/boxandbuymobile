import type { Address, AddressInput, CountrySummary } from "@boxandbuy/contracts";

import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { useStates } from "../../hooks/use-cart";

type AddressFormProps = {
  initialAddress?: Address;
  countries: CountrySummary[];
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (payload: AddressInput) => void;
};

export function AddressForm({
  initialAddress,
  countries,
  submitting,
  onCancel,
  onSubmit
}: AddressFormProps) {
  const [alias, setAlias] = useState(initialAddress?.alias ?? "Mobile");
  const [firstName, setFirstName] = useState(initialAddress?.firstName ?? "");
  const [lastName, setLastName] = useState(initialAddress?.lastName ?? "");
  const [company, setCompany] = useState(initialAddress?.company ?? "");
  const [address1, setAddress1] = useState(initialAddress?.address1 ?? "");
  const [address2, setAddress2] = useState(initialAddress?.address2 ?? "");
  const [city, setCity] = useState(initialAddress?.city ?? "");
  const [postcode, setPostcode] = useState(initialAddress?.postcode ?? "");
  const [phone, setPhone] = useState(initialAddress?.phone ?? "");
  const [phoneMobile, setPhoneMobile] = useState(initialAddress?.phoneMobile ?? "");
  const [countryId, setCountryId] = useState(initialAddress?.countryId ?? countries[0]?.id ?? "");
  const [countryQuery, setCountryQuery] = useState(initialAddress?.countryName ?? "");
  const [stateId, setStateId] = useState(initialAddress?.stateId ?? "");
  const [stateQuery, setStateQuery] = useState(initialAddress?.stateName ?? "");

  useEffect(() => {
    setAlias(initialAddress?.alias ?? "Mobile");
    setFirstName(initialAddress?.firstName ?? "");
    setLastName(initialAddress?.lastName ?? "");
    setCompany(initialAddress?.company ?? "");
    setAddress1(initialAddress?.address1 ?? "");
    setAddress2(initialAddress?.address2 ?? "");
    setCity(initialAddress?.city ?? "");
    setPostcode(initialAddress?.postcode ?? "");
    setPhone(initialAddress?.phone ?? "");
    setPhoneMobile(initialAddress?.phoneMobile ?? "");
    setCountryId(initialAddress?.countryId ?? countries[0]?.id ?? "");
    setCountryQuery(initialAddress?.countryName ?? "");
    setStateId(initialAddress?.stateId ?? "");
    setStateQuery(initialAddress?.stateName ?? "");
  }, [countries, initialAddress]);

  const selectedCountry = countries.find((entry) => entry.id === countryId);
  const states = useStates(selectedCountry?.id).data ?? [];
  const filteredCountries = countries
    .filter((entry) =>
      countryQuery.trim()
        ? entry.name.toLowerCase().includes(countryQuery.trim().toLowerCase()) ||
          entry.isoCode.toLowerCase().includes(countryQuery.trim().toLowerCase())
        : true
    )
    .slice(0, 8);
  const filteredStates = states
    .filter((entry) =>
      stateQuery.trim()
        ? entry.name.toLowerCase().includes(stateQuery.trim().toLowerCase()) ||
          entry.isoCode.toLowerCase().includes(stateQuery.trim().toLowerCase())
        : true
    )
    .slice(0, 8);

  return (
    <View className="gap-3">
      <TextInput
        value={alias}
        onChangeText={setAlias}
        placeholder="Alias"
        placeholderTextColor="#6b7280"
        className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-base text-ink"
      />
      <TextInput
        value={firstName}
        onChangeText={setFirstName}
        placeholder="First name"
        placeholderTextColor="#6b7280"
        className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-base text-ink"
      />
      <TextInput
        value={lastName}
        onChangeText={setLastName}
        placeholder="Last name"
        placeholderTextColor="#6b7280"
        className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-base text-ink"
      />
      <TextInput
        value={company}
        onChangeText={setCompany}
        placeholder="Company (optional)"
        placeholderTextColor="#6b7280"
        className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-base text-ink"
      />
      <TextInput
        value={address1}
        onChangeText={setAddress1}
        placeholder="Address line 1"
        placeholderTextColor="#6b7280"
        className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-base text-ink"
      />
      <TextInput
        value={address2}
        onChangeText={setAddress2}
        placeholder="Address line 2 (optional)"
        placeholderTextColor="#6b7280"
        className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-base text-ink"
      />
      <TextInput
        value={city}
        onChangeText={setCity}
        placeholder="City"
        placeholderTextColor="#6b7280"
        className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-base text-ink"
      />
      <TextInput
        value={postcode}
        onChangeText={setPostcode}
        placeholder="Postal code"
        placeholderTextColor="#6b7280"
        className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-base text-ink"
      />
      <TextInput
        value={phone}
        onChangeText={setPhone}
        placeholder="Phone (optional)"
        placeholderTextColor="#6b7280"
        className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-base text-ink"
      />
      <TextInput
        value={phoneMobile}
        onChangeText={setPhoneMobile}
        placeholder="Mobile phone (optional)"
        placeholderTextColor="#6b7280"
        className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-base text-ink"
      />

      <View className="gap-2">
        <Text className="text-sm font-medium text-ink">Country</Text>
        <TextInput
          value={countryQuery}
          onChangeText={setCountryQuery}
          placeholder="Search country"
          placeholderTextColor="#6b7280"
          className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-base text-ink"
        />
        <View className="gap-2">
          {filteredCountries.map((country) => {
            const selected = country.id === countryId;

            return (
              <Pressable
                key={country.id}
                className={selected ? "rounded-2xl bg-ink px-4 py-3" : "rounded-2xl border border-ink/10 px-4 py-3"}
                onPress={() => {
                  setCountryId(country.id);
                  setCountryQuery(country.name);
                  setStateId("");
                  setStateQuery("");
                }}
              >
                <Text className={selected ? "font-medium text-white" : "font-medium text-ink"}>
                  {country.name} ({country.isoCode})
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {selectedCountry?.containsStates ? (
        <View className="gap-2">
          <Text className="text-sm font-medium text-ink">State</Text>
          <TextInput
            value={stateQuery}
            onChangeText={setStateQuery}
            placeholder="Search state"
            placeholderTextColor="#6b7280"
            className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-base text-ink"
          />
          <View className="gap-2">
            {filteredStates.map((state) => {
              const selected = state.id === stateId;

              return (
                <Pressable
                  key={state.id}
                  className={selected ? "rounded-2xl bg-ink px-4 py-3" : "rounded-2xl border border-ink/10 px-4 py-3"}
                  onPress={() => {
                    setStateId(state.id);
                    setStateQuery(state.name);
                  }}
                >
                  <Text className={selected ? "font-medium text-white" : "font-medium text-ink"}>
                    {state.name} ({state.isoCode})
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      <View className="flex-row gap-3">
        <Pressable
          className="flex-1 rounded-2xl border border-ink/10 px-4 py-3"
          onPress={onCancel}
        >
          <Text className="text-center font-medium text-ink">Cancel</Text>
        </Pressable>
        <Pressable
          className="flex-1 rounded-2xl bg-accent px-4 py-3"
          onPress={() =>
            onSubmit({
              alias,
              firstName,
              lastName,
              company,
              address1,
              address2,
              city,
              postcode,
              phone,
              phoneMobile,
              countryId,
              stateId
            })
          }
          disabled={submitting}
        >
          <Text className="text-center font-medium text-white">
            {submitting ? "Saving..." : initialAddress ? "Update address" : "Save address"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
