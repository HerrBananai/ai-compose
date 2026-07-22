import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

import {
  getStartupError,
  subscribeStartupError,
} from '../lib/startupErrorTrap';

/**
 * Minimaler Fehler-Screen ohne schwere Abhängigkeiten (kein Kamera-/Skia-Import).
 * Wird als Root gerendert, wenn das Laden von ./App scheitert – zeigt die echte
 * Startup-Fehlermeldung samt Stack an, statt die App abstürzen zu lassen.
 */
export function StartupErrorScreen(): React.ReactElement {
  const [error, setError] = useState<unknown>(getStartupError());

  useEffect(() => subscribeStartupError(setError), []);

  const message = error instanceof Error ? error.message : String(error ?? 'Unbekannter Fehler');
  const stack = error instanceof Error ? error.stack : undefined;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Startup-Fehler</Text>
      <Text selectable style={styles.message}>
        {message}
      </Text>
      {stack ? (
        <Text selectable style={styles.stack}>
          {stack}
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0B0B10',
  },
  content: {
    padding: 24,
    paddingTop: 80,
    gap: 16,
  },
  title: {
    color: '#F87171',
    fontSize: 20,
    fontWeight: '700',
  },
  message: {
    color: '#F5F5FA',
    fontSize: 15,
    lineHeight: 21,
  },
  stack: {
    color: 'rgba(245,245,250,0.6)',
    fontSize: 11,
    lineHeight: 16,
    fontFamily: 'Menlo',
  },
});
