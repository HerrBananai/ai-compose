import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: unknown;
}

type GlobalHandler = (error: unknown, isFatal?: boolean) => void;

interface ErrorUtilsLike {
  getGlobalHandler?: () => GlobalHandler;
  setGlobalHandler?: (handler: GlobalHandler) => void;
}

/**
 * Fängt sowohl React-Render-Fehler (getDerivedStateFromError) als auch
 * globale JS-Fatals (ErrorUtils.setGlobalHandler) ab und zeigt die Meldung
 * samt Stack direkt auf dem Bildschirm an – statt die App per RCTFatal/abort
 * kommentarlos abstürzen zu lassen.
 *
 * Diagnose-Hilfe für den sideloaded Build: Wir können hier keine Konsole
 * mitlesen, also machen wir den Fehler sichtbar (Screenshot-fähig).
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };
  private previousHandler?: GlobalHandler;

  constructor(props: Props) {
    super(props);
    // So früh wie möglich installieren, damit auch Fatals vor dem ersten
    // Render (z. B. aus Modul-Init heraus geworfene) erfasst werden.
    const errorUtils = (global as unknown as { ErrorUtils?: ErrorUtilsLike })
      .ErrorUtils;
    if (errorUtils?.setGlobalHandler) {
      this.previousHandler = errorUtils.getGlobalHandler?.();
      errorUtils.setGlobalHandler((error) => {
        // Bewusst NICHT den Default-Handler aufrufen -> kein abort,
        // damit die Meldung sichtbar bleibt.
        this.setState({ error });
      });
    }
  }

  static getDerivedStateFromError(error: unknown): State {
    return { error };
  }

  componentWillUnmount(): void {
    const errorUtils = (global as unknown as { ErrorUtils?: ErrorUtilsLike })
      .ErrorUtils;
    if (errorUtils?.setGlobalHandler && this.previousHandler) {
      errorUtils.setGlobalHandler(this.previousHandler);
    }
  }

  render(): React.ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    const message =
      error instanceof Error ? error.message : String(error);
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
