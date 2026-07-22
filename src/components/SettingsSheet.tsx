import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { theme } from '../theme';
import { DEFAULT_MODEL, FALLBACK_MODEL, GeminiModel } from '../lib/types';

interface Props {
  visible: boolean;
  apiKey: string | null;
  model: GeminiModel;
  onClose: () => void;
  onSaveApiKey: (value: string) => Promise<void>;
  onSaveModel: (model: GeminiModel) => Promise<void>;
}

const MODELS: { id: GeminiModel; label: string; note: string }[] = [
  { id: DEFAULT_MODEL, label: DEFAULT_MODEL, note: 'Standard' },
  { id: FALLBACK_MODEL, label: FALLBACK_MODEL, note: 'Schneller' },
];

/** Settings-Sheet: Gemini API-Key eintragen + Modell wählen. */
export function SettingsSheet({
  visible,
  apiKey,
  model,
  onClose,
  onSaveApiKey,
  onSaveModel,
}: Props) {
  const [draft, setDraft] = useState(apiKey ?? '');
  const [reveal, setReveal] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setDraft(apiKey ?? '');
      setReveal(false);
    }
  }, [visible, apiKey]);

  const save = async () => {
    setSaving(true);
    try {
      await onSaveApiKey(draft);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.kav}
        >
          <SafeAreaView edges={['bottom']} style={styles.sheet}>
            <View style={styles.grip} />
            <ScrollView
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.title}>Einstellungen</Text>

              <Text style={styles.section}>Gemini API-Key</Text>
              <View style={styles.inputRow}>
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  placeholder="AIza…"
                  placeholderTextColor={theme.colors.textDim}
                  secureTextEntry={!reveal}
                  autoCapitalize="none"
                  autoCorrect={false}
                  spellCheck={false}
                  style={styles.input}
                />
                <Pressable onPress={() => setReveal((r) => !r)} hitSlop={8} style={styles.reveal}>
                  <Text style={styles.revealText}>{reveal ? 'Verbergen' : 'Zeigen'}</Text>
                </Pressable>
              </View>
              <Pressable
                onPress={() => Linking.openURL('https://aistudio.google.com/app/apikey')}
                hitSlop={6}
              >
                <Text style={styles.help}>
                  Kostenlosen Key holen: aistudio.google.com/app/apikey ↗
                </Text>
              </Pressable>
              <Text style={styles.secure}>🔒 Wird im iOS-Keychain (secure-store) gespeichert.</Text>

              <Text style={styles.section}>Modell</Text>
              <View style={styles.models}>
                {MODELS.map((m) => {
                  const active = m.id === model;
                  return (
                    <Pressable
                      key={m.id}
                      onPress={() => onSaveModel(m.id)}
                      style={[styles.model, active && styles.modelActive]}
                    >
                      <Text style={[styles.modelLabel, active && styles.modelLabelActive]}>
                        {m.label}
                      </Text>
                      <Text style={styles.modelNote}>{m.note}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.privacy}>
                Hinweis: Beim Antippen von „AI Compose“ wird das aktuelle Kamera-Frame an Google
                Gemini gesendet. Im Free-Tier können Daten zum Training verwendet werden. Für
                private Nutzung ok – schick keine sensiblen Motive.
              </Text>

              <View style={styles.actions}>
                <Pressable style={[styles.btn, styles.btnGhost]} onPress={onClose}>
                  <Text style={styles.btnGhostText}>Abbrechen</Text>
                </Pressable>
                <Pressable
                  style={[styles.btn, styles.btnPrimary, saving && styles.btnDisabled]}
                  onPress={save}
                  disabled={saving}
                >
                  <Text style={styles.btnPrimaryText}>{saving ? 'Speichern…' : 'Speichern'}</Text>
                </Pressable>
              </View>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  kav: {
    width: '100%',
  },
  sheet: {
    backgroundColor: theme.colors.glassStrong,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.stroke,
  },
  grip: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginTop: 8,
    marginBottom: 4,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 8,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.font.title,
    fontWeight: '800',
    marginBottom: 6,
  },
  section: {
    color: theme.colors.textDim,
    fontSize: theme.font.small,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: theme.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.stroke,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    color: theme.colors.text,
    fontSize: theme.font.pill,
    paddingVertical: 14,
  },
  reveal: {
    paddingLeft: 10,
  },
  revealText: {
    color: theme.colors.accent2,
    fontSize: theme.font.small,
    fontWeight: '700',
  },
  help: {
    color: theme.colors.accent,
    fontSize: theme.font.small,
    marginTop: 6,
  },
  secure: {
    color: theme.colors.textDim,
    fontSize: theme.font.small,
    marginTop: 2,
  },
  models: {
    flexDirection: 'row',
    gap: 10,
  },
  model: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.stroke,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  modelActive: {
    borderColor: theme.colors.accent,
    backgroundColor: 'rgba(139,92,246,0.16)',
  },
  modelLabel: {
    color: theme.colors.text,
    fontSize: theme.font.label,
    fontWeight: '700',
  },
  modelLabelActive: {
    color: theme.colors.text,
  },
  modelNote: {
    color: theme.colors.textDim,
    fontSize: theme.font.small,
    marginTop: 2,
  },
  privacy: {
    color: theme.colors.textDim,
    fontSize: theme.font.small,
    lineHeight: 17,
    marginTop: 14,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  btn: {
    flex: 1,
    borderRadius: theme.radius.pill,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnGhost: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  btnGhostText: {
    color: theme.colors.text,
    fontWeight: '700',
    fontSize: theme.font.pill,
  },
  btnPrimary: {
    backgroundColor: theme.colors.accent,
  },
  btnPrimaryText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: theme.font.pill,
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
