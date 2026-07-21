import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '../theme';

interface Props {
  title: string;
  body: string;
  cta: string;
  onPress: () => void;
  secondaryCta?: string;
}

/** Vollflächiger, freundlicher Zustand wenn eine Berechtigung fehlt. */
export function PermissionGate({ title, body, cta, onPress, secondaryCta }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>AI</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      <Pressable style={styles.button} onPress={onPress}>
        <Text style={styles.buttonText}>{cta}</Text>
      </Pressable>
      {secondaryCta ? (
        <Pressable onPress={() => Linking.openSettings()} hitSlop={8}>
          <Text style={styles.secondary}>{secondaryCta}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 14,
  },
  badge: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  badgeText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.font.title,
    fontWeight: '700',
    textAlign: 'center',
  },
  body: {
    color: theme.colors.textDim,
    fontSize: theme.font.label,
    textAlign: 'center',
    lineHeight: 20,
  },
  button: {
    marginTop: 8,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.pill,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  buttonText: {
    color: '#fff',
    fontSize: theme.font.pill,
    fontWeight: '700',
  },
  secondary: {
    color: theme.colors.textDim,
    fontSize: theme.font.label,
    marginTop: 4,
    textDecorationLine: 'underline',
  },
});
