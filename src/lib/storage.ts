import * as SecureStore from 'expo-secure-store';

import { DEFAULT_MODEL, GeminiModel } from './types';

const KEY_API = 'gemini_api_key';
const KEY_MODEL = 'gemini_model';

/**
 * Sichere Persistenz von API-Key + Modell in expo-secure-store
 * (iOS Keychain). Kein Klartext im AsyncStorage.
 */
export async function getApiKey(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(KEY_API);
  } catch {
    return null;
  }
}

export async function setApiKey(value: string): Promise<void> {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    await SecureStore.deleteItemAsync(KEY_API);
    return;
  }
  await SecureStore.setItemAsync(KEY_API, trimmed);
}

export async function getModel(): Promise<GeminiModel> {
  try {
    const stored = await SecureStore.getItemAsync(KEY_MODEL);
    // Alte/ungültige Werte (z. B. das nicht existierende 'gemini-3-flash')
    // fallen automatisch auf DEFAULT_MODEL zurück.
    if (stored === 'gemini-2.5-flash' || stored === 'gemini-2.0-flash') {
      return stored;
    }
  } catch {
    // ignore
  }
  return DEFAULT_MODEL;
}

export async function setModel(model: GeminiModel): Promise<void> {
  await SecureStore.setItemAsync(KEY_MODEL, model);
}
