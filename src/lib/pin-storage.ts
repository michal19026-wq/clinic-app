import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const PIN_KEY = 'app_pin_code';

export async function getPin(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return window.localStorage.getItem(PIN_KEY);
  }
  return await SecureStore.getItemAsync(PIN_KEY);
}

export async function setPin(pin: string): Promise<void> {
  if (Platform.OS === 'web') {
    window.localStorage.setItem(PIN_KEY, pin);
    return;
  }
  await SecureStore.setItemAsync(PIN_KEY, pin);
}

export async function clearPin(): Promise<void> {
  if (Platform.OS === 'web') {
    window.localStorage.removeItem(PIN_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(PIN_KEY);
}

export async function hasPin(): Promise<boolean> {
  const pin = await getPin();
  return pin !== null;
}