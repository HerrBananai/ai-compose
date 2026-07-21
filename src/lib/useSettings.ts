import { useCallback, useEffect, useState } from 'react';

import { getApiKey, getModel, setApiKey, setModel } from './storage';
import { DEFAULT_MODEL, GeminiModel } from './types';

export interface Settings {
  apiKey: string | null;
  model: GeminiModel;
  loaded: boolean;
}

/** Lädt/persistiert API-Key + Modell aus expo-secure-store. */
export function useSettings() {
  const [state, setState] = useState<Settings>({
    apiKey: null,
    model: DEFAULT_MODEL,
    loaded: false,
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      const [apiKey, model] = await Promise.all([getApiKey(), getModel()]);
      if (alive) setState({ apiKey, model, loaded: true });
    })();
    return () => {
      alive = false;
    };
  }, []);

  const saveApiKey = useCallback(async (value: string) => {
    await setApiKey(value);
    const trimmed = value.trim();
    setState((s) => ({ ...s, apiKey: trimmed.length ? trimmed : null }));
  }, []);

  const saveModel = useCallback(async (model: GeminiModel) => {
    await setModel(model);
    setState((s) => ({ ...s, model }));
  }, []);

  return { ...state, saveApiKey, saveModel };
}
