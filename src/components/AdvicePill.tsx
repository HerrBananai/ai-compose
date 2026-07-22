import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '../theme';

interface Props {
  text: string;
  loading?: boolean;
}

/**
 * Glasige Advice-Pill oben: zeigt Gemini-Kompositionstipp oder Ladezustand.
 * Antippen klappt den vollen Text aus (sonst auf 2 Zeilen gekürzt).
 */
export function AdvicePill({ text, loading }: Props) {
  const [expanded, setExpanded] = useState(false);

  // Bei neuem Tipp wieder eingeklappt starten.
  useEffect(() => {
    setExpanded(false);
  }, [text]);

  return (
    <Pressable
      style={styles.pill}
      onPress={() => setExpanded((v) => !v)}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel={expanded ? 'Tipp einklappen' : 'Tipp ausklappen'}
    >
      {loading ? (
        <ActivityIndicator size="small" color={theme.colors.accent2} />
      ) : (
        <View style={styles.dot} />
      )}
      <Text style={styles.text} numberOfLines={expanded ? undefined : 2}>
        {text}
      </Text>
    </Pressable>
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
    borderRadius: theme.radius.md,
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
    fontSize: theme.font.label,
    lineHeight: 18,
    fontWeight: '600',
  },
});
