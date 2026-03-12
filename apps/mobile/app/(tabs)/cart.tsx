import type { AddressInput } from "@boxandbuy/contracts";

import { Link } from "expo-router";
import { Alert, Pressable, Text, View } from "react-native";

import { AddressForm } from "../../components/cart/address-form";
import { Screen } from "../../components/ui/screen";
import { SectionCard } from "../../components/ui/section-card";
import {
  useCart,
  useCountries,
  useCreateAddress,
  useDeleteAddress,
  useRemoveCartItem,
  useSelectCartAddresses,
  useUpdateAddress,
  useUpdateCartItem
} from "../../hooks/use-cart";
import { formatCurrency } from "../../lib/format";
import { useAuthStore } from "../../store/auth.store";
import { useCartStore } from "../../store/cart.store";

export default function CartScreen() {
  const hydrated = useAuthStore((state) => state.hydrated);
  const accessToken = useAuthStore((state) => state.accessToken);
  const cart = useCart();
  const countries = useCountries();
  const addressFormOpen = useCartStore((state) => state.addressFormOpen);
  const editingAddressId = useCartStore((state) => state.editingAddressId);
  const openCreateAddress = useCartStore((state) => state.openCreateAddress);
  const openEditAddress = useCartStore((state) => state.openEditAddress);
  const closeAddressForm = useCartStore((state) => state.closeAddressForm);
  const updateCartItem = useUpdateCartItem();
  const removeCartItem = useRemoveCartItem();
  const selectCartAddresses = useSelectCartAddresses();
  const createAddress = useCreateAddress();
  const updateAddress = useUpdateAddress();
  const deleteAddress = useDeleteAddress();
  const editingAddress = cart.data?.addresses.find((address) => address.id === editingAddressId);

  const handleQuantityChange = async (productId: string, quantity: number) => {
    try {
      if (quantity <= 0) {
        await removeCartItem.mutateAsync(productId);
        return;
      }

      await updateCartItem.mutateAsync({ productId, quantity });
    } catch (error) {
      Alert.alert("Cart update failed", error instanceof Error ? error.message : "Unable to update the cart.");
    }
  };

  const handleSelectDelivery = async (addressId: string) => {
    try {
      await selectCartAddresses.mutateAsync({
        deliveryAddressId: addressId,
        invoiceAddressId: cart.data?.cart.invoiceAddressId ?? addressId
      });
    } catch (error) {
      Alert.alert("Address selection failed", error instanceof Error ? error.message : "Unable to update the cart.");
    }
  };

  const handleSelectInvoice = async (addressId: string) => {
    try {
      await selectCartAddresses.mutateAsync({
        deliveryAddressId: cart.data?.cart.deliveryAddressId ?? addressId,
        invoiceAddressId: addressId
      });
    } catch (error) {
      Alert.alert("Address selection failed", error instanceof Error ? error.message : "Unable to update the cart.");
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    try {
      await deleteAddress.mutateAsync(addressId);
      closeAddressForm();
    } catch (error) {
      Alert.alert("Delete failed", error instanceof Error ? error.message : "Unable to delete the address.");
    }
  };

  const handleSaveAddress = async (payload: AddressInput) => {
    try {
      if (editingAddressId) {
        await updateAddress.mutateAsync({
          addressId: editingAddressId,
          payload
        });
      } else {
        await createAddress.mutateAsync(payload);
      }

      closeAddressForm();
    } catch (error) {
      Alert.alert("Address save failed", error instanceof Error ? error.message : "Unable to save the address.");
    }
  };

  if (!hydrated) {
    return (
      <Screen title="Cart" subtitle="Loading your mobile session.">
        <SectionCard title="Cart">
          <Text className="text-sm text-muted">Preparing cart access...</Text>
        </SectionCard>
      </Screen>
    );
  }

  if (!accessToken) {
    return (
      <Screen title="Cart" subtitle="Sign in to manage your buyer cart and delivery addresses.">
        <SectionCard title="Authentication required">
          <Text className="text-sm leading-6 text-muted">
            Cart syncing and address selection are tied to your BoxAndBuy customer account.
          </Text>
          <Link href="/(auth)/login" className="rounded-xl bg-accent px-4 py-3 text-center text-white">
            Sign in
          </Link>
        </SectionCard>
      </Screen>
    );
  }

  return (
    <Screen title="Cart" subtitle="PrestaShop-backed cart items and customer addresses.">
      <SectionCard title="Cart summary">
        {cart.isLoading ? <Text className="text-sm text-muted">Loading your cart...</Text> : null}
        {cart.isError ? (
          <Text className="text-sm text-red-600">Unable to load your cart right now.</Text>
        ) : null}
        {cart.data?.cart.items.length ? (
          <View className="gap-3">
            {cart.data.cart.items.map((item) => (
              <View key={item.id} className="rounded-2xl border border-ink/10 px-4 py-4">
                <View className="gap-1">
                  <Text className="font-semibold text-ink">{item.product.name}</Text>
                  <Text className="text-sm text-muted">
                    {formatCurrency(item.unitPrice, item.product.currencyCode)} each
                  </Text>
                </View>
                <View className="mt-4 flex-row items-center justify-between">
                  <View className="flex-row items-center gap-3">
                    <Pressable
                      className="rounded-full border border-ink/10 px-3 py-2"
                      onPress={() => {
                        void handleQuantityChange(item.productId, item.quantity - 1);
                      }}
                    >
                      <Text className="font-semibold text-ink">-</Text>
                    </Pressable>
                    <Text className="text-base font-medium text-ink">Qty {item.quantity}</Text>
                    <Pressable
                      className="rounded-full border border-ink/10 px-3 py-2"
                      onPress={() => {
                        void handleQuantityChange(item.productId, item.quantity + 1);
                      }}
                    >
                      <Text className="font-semibold text-ink">+</Text>
                    </Pressable>
                  </View>
                  <Pressable
                    className="rounded-full border border-red-200 px-3 py-2"
                    onPress={() => {
                      void handleQuantityChange(item.productId, 0);
                    }}
                  >
                    <Text className="font-medium text-red-600">Remove</Text>
                  </Pressable>
                </View>
                <Text className="mt-3 text-sm font-semibold text-ink">
                  Line total: {formatCurrency(item.lineTotal, item.product.currencyCode)}
                </Text>
              </View>
            ))}
          </View>
        ) : cart.isLoading || cart.isError ? null : (
          <Text className="text-sm text-muted">Your cart is empty. Add products from the catalog first.</Text>
        )}
        {cart.data ? (
          <View className="mt-4 gap-1">
            <Text className="text-sm text-muted">Items: {cart.data.cart.totalQuantity}</Text>
            <Text className="text-base font-semibold text-ink">
              Estimated total: {formatCurrency(cart.data.cart.estimatedTotalAmount, cart.data.cart.currencyCode)}
            </Text>
          </View>
        ) : null}
      </SectionCard>

      <SectionCard title="Address book">
        {cart.data?.addresses.length ? (
          <View className="gap-3">
            {cart.data.addresses.map((address) => (
              <View key={address.id} className="rounded-2xl border border-ink/10 px-4 py-4">
                <Text className="font-semibold text-ink">{address.alias}</Text>
                <Text className="text-sm text-muted">
                  {address.firstName} {address.lastName}
                </Text>
                <Text className="text-sm text-muted">{address.address1}</Text>
                {address.address2 ? <Text className="text-sm text-muted">{address.address2}</Text> : null}
                <Text className="text-sm text-muted">
                  {address.city}
                  {address.stateName ? `, ${address.stateName}` : ""}
                  {address.postcode ? ` ${address.postcode}` : ""}
                </Text>
                <Text className="text-sm text-muted">
                  {address.countryName}
                  {address.phone ? ` · ${address.phone}` : address.phoneMobile ? ` · ${address.phoneMobile}` : ""}
                </Text>
                <View className="mt-4 flex-row flex-wrap gap-3">
                  <Pressable
                    className={address.isDeliverySelected ? "rounded-full bg-ink px-4 py-2" : "rounded-full border border-ink/10 px-4 py-2"}
                    onPress={() => {
                      void handleSelectDelivery(address.id);
                    }}
                  >
                    <Text className={address.isDeliverySelected ? "font-medium text-white" : "font-medium text-ink"}>
                      {address.isDeliverySelected ? "Delivery selected" : "Use for delivery"}
                    </Text>
                  </Pressable>
                  <Pressable
                    className={address.isInvoiceSelected ? "rounded-full bg-ink px-4 py-2" : "rounded-full border border-ink/10 px-4 py-2"}
                    onPress={() => {
                      void handleSelectInvoice(address.id);
                    }}
                  >
                    <Text className={address.isInvoiceSelected ? "font-medium text-white" : "font-medium text-ink"}>
                      {address.isInvoiceSelected ? "Invoice selected" : "Use for invoice"}
                    </Text>
                  </Pressable>
                  <Pressable
                    className="rounded-full border border-ink/10 px-4 py-2"
                    onPress={() => openEditAddress(address.id)}
                  >
                    <Text className="font-medium text-ink">Edit</Text>
                  </Pressable>
                  <Pressable
                    className="rounded-full border border-red-200 px-4 py-2"
                    onPress={() => {
                      void handleDeleteAddress(address.id);
                    }}
                  >
                    <Text className="font-medium text-red-600">Delete</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Text className="text-sm text-muted">No saved addresses yet.</Text>
        )}

        {!addressFormOpen ? (
          <Pressable className="mt-4 rounded-xl bg-accent px-4 py-3" onPress={openCreateAddress}>
            <Text className="text-center font-medium text-white">Add new address</Text>
          </Pressable>
        ) : null}
      </SectionCard>

      {addressFormOpen ? (
        <SectionCard title={editingAddress ? "Edit address" : "Add address"}>
          {countries.isLoading ? <Text className="text-sm text-muted">Loading countries...</Text> : null}
          {countries.isError ? (
            <Text className="text-sm text-red-600">Unable to load countries right now.</Text>
          ) : countries.data ? (
            <AddressForm
              initialAddress={editingAddress}
              countries={countries.data}
              submitting={createAddress.isPending || updateAddress.isPending}
              onCancel={closeAddressForm}
              onSubmit={(payload) => {
                void handleSaveAddress(payload);
              }}
            />
          ) : null}
        </SectionCard>
      ) : null}

      <SectionCard title="Checkout">
        {cart.data?.cart.checkoutReady ? (
          <Text className="text-sm text-muted">
            Delivery and invoice addresses are selected. Sprint 5 will connect this to checkout orchestration.
          </Text>
        ) : (
          <Text className="text-sm text-muted">
            Select both delivery and invoice addresses before checkout.
          </Text>
        )}
        <Link href="/cart/checkout" className="rounded-xl bg-ink px-4 py-3 text-center text-white">
          Continue to checkout
        </Link>
      </SectionCard>
    </Screen>
  );
}
