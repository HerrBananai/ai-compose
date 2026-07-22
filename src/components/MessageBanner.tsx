import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '../theme';

export type BannerKind = 'info' | 'error' | 'success';

interface Props {
  kind: BannerKind;
  text: string;
  onDismiss?: () => void;
  actionLabel?: string;
  onAction?: () => void;
}

/** Nicht-blockierendes Statusbanner für Fehler/Erfolg/Hinweise. */
export function MessageBanner({ kind, text, onDismiss, actionLabel, onAction }: Props) {
  const accent =
    kind === 'error'
      ? theme.colors.danger
      : kind === 'success'
        ? theme.colors.accent2
        : theme.colors.accent;
  return (
    <View style={[styles.wrap, { borderColor: accent }]}>
      <View style={[styles.bar, { backgroundColor: accent }]} />
      <Text style={styles.text} numberOfLines={6}>
        {text}
      </Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8} style={styles.action}>
          <Text style={[styles.actionText, { color: accent }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
      {onDismiss ? (
        <Pressable onPress={onDismiss} hitSlop={8} style={styles.close}>
          <Text style={styles.closeText}>×</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    maxWidth: '94%',
    gap: 10,
    backgroundColor: theme.colors.glassStrong,
    borderRadius: theme.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    paddingHorizontal: 14,
    overflow: 'hidden',
  },
  bar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  text: {
    flexShrink: 1,
    color: theme.colors.text,
    fontSize: theme.font.label,
    fontWeight: '600',
  },
  action: {
    paddingHorizontal: 6,
  },
  actionText: {
    fontSize: theme.font.label,
    fontWeight: '700',
  },
  close: {
    paddingHorizontal: 4,
  },
  closeText: {
    color: theme.colors.textDim,
    fontSize: 20,
    lineHeight: 20,
    fontWeight: '600',
  },
});
