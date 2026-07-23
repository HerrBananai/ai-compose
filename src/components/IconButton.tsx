import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { theme } from '../theme';

interface Props {
  glyph: string;
  onPress: () => void;
  label: string;
}

/** Runder, glasiger Icon-Button (nutzt Emoji-Glyphen, keine Icon-Lib nötig). */
export function IconButton({ glyph, onPress, label }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
      hitSlop={8}
      accessibilityLabel={label}
      accessibilityRole="button"
    >
      <Text style={styles.glyph}>{glyph}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    // Deutlich sichtbar auch auf schwarzem Grund (Top-Bar über dem 4:3-Feld).
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  glyph: {
    fontSize: 22,
    color: theme.colors.text, // ohne Farbe war der Glyph schwarz -> auf Schwarz unsichtbar
  },
});
