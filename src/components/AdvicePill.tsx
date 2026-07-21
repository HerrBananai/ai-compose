import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { theme } from '../theme';

interface Props {
  text: string;
  loading?: boolean;
}

/** Glasige Advice-Pill oben: zeigt Gemini-Kompositionstipp oder Ladezustand. */
export function AdvicePill({ text, loading }: Props) {
  return (
    <View style={styles.pill}>
      {loading ? (
        <ActivityIndicator size="small" color={theme.colors.accent2} />
      ) : (
        <View style={styles.dot} />
      )}
      <Text style={styles.text} numberOfLines={2}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: '92%',
    alignSelf: 'center',
    backgroundColor: theme.colors.glassStrong,
    borderRadius: theme.radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.stroke,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.accent2,
  },
  text: {
    flexShrink: 1,
    color: theme.colors.text,
    fontSize: theme.font.pill,
    fontWeight: '600',
  },
});
