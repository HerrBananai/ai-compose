import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '../theme';

interface Props {
  onPress: () => void;
  busy?: boolean;
}

/** "AI Compose"-Button: löst EINEN Gemini-Call auf das aktuelle Frame aus. */
export function ComposeButton({ onPress, busy }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      style={({ pressed }) => [styles.wrap, pressed && styles.pressed]}
      accessibilityLabel="AI Compose starten"
      accessibilityRole="button"
    >
      {busy ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <View style={styles.spark} />
      )}
      <Text style={styles.label}>{busy ? 'Analyse…' : 'AI Compose'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.pill,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  spark: {
    width: 10,
    height: 10,
    borderRadius: 3,
    backgroundColor: theme.colors.accent2,
    transform: [{ rotate: '45deg' }],
  },
  label: {
    color: '#fff',
    fontSize: theme.font.label,
    fontWeight: '800',
  },
});
