import * as SecureStore from "expo-secure-store";
import { createMMKV } from "react-native-mmkv";

export const mmkv = createMMKV({
  id: "boxandbuy-mobile"
});

export const secureStorage = {
  async getItem(key: string) {
    return SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string) {
    await SecureStore.setItemAsync(key, value);
  },
  async removeItem(key: string) {
    await SecureStore.deleteItemAsync(key);
  }
};

export const zustandStorage = {
  getItem(key: string) {
    return mmkv.getString(key) ?? null;
  },
  setItem(key: string, value: string) {
    mmkv.set(key, value);
  },
  removeItem(key: string) {
    mmkv.remove(key);
  }
};
