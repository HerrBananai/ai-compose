import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { theme } from '../theme';

interface Props {
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
}

/** Klassischer Kamera-Auslöser (Ring + Innenkreis). */
export function ShutterButton({ onPress, busy, disabled }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      style={({ pressed }) => [styles.ring, pressed && styles.pressed]}
      accessibilityLabel="Foto aufnehmen"
      accessibilityRole="button"
    >
      <View style={[styles.inner, disabled && styles.innerDisabled]}>
        {busy ? <ActivityIndicator color={theme.colors.bg} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  ring: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 4,
    borderColor: theme.colors.shutterRing,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },
  inner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerDisabled: {
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
});
