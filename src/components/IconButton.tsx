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
    backgroundColor: theme.colors.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.stroke,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  glyph: {
    fontSize: 20,
  },
});
