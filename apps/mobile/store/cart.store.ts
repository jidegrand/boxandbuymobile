import { create } from "zustand";

type CartUiState = {
  addressFormOpen: boolean;
  editingAddressId: string | null;
  openCreateAddress: () => void;
  openEditAddress: (addressId: string) => void;
  closeAddressForm: () => void;
};

export const useCartStore = create<CartUiState>((set) => ({
  addressFormOpen: false,
  editingAddressId: null,
  openCreateAddress() {
    set({
      addressFormOpen: true,
      editingAddressId: null
    });
  },
  openEditAddress(addressId) {
    set({
      addressFormOpen: true,
      editingAddressId: addressId
    });
  },
  closeAddressForm() {
    set({
      addressFormOpen: false,
      editingAddressId: null
    });
  }
}));
