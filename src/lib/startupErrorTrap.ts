/**
 * Früh installierter Fehler-Trap für den sideloaded Release-Build.
 *
 * Ziel: Den echten JS-Startup-Fehler sichtbar machen, statt ihn per RCTFatal
 * -> abort verschwinden zu lassen. Wir hängen uns in BEIDE Pfade:
 *   1. Synchrone uncaught Errors  -> ErrorUtils.setGlobalHandler
 *   2. Unhandled Promise-Rejections -> HermesInternal.enablePromiseRejectionTracker
 *
 * In beiden Fällen rufen wir bewusst NICHT den Default-Handler auf, damit kein
 * abort ausgelöst wird und die Meldung auf dem Bildschirm stehen bleibt.
 */

type Listener = (error: unknown) => void;

let captured: unknown = null;
let listener: Listener | null = null;
let installed = false;

export function reportStartupError(error: unknown): void {
  captured = error;
  if (listener) listener(error);
}

export function getStartupError(): unknown {
  return captured;
}

export function subscribeStartupError(next: Listener): () => void {
  listener = next;
  if (captured) next(captured);
  return () => {
    if (listener === next) listener = null;
  };
}

interface ErrorUtilsLike {
  getGlobalHandler?: () => (error: unknown, isFatal?: boolean) => void;
  setGlobalHandler?: (
    handler: (error: unknown, isFatal?: boolean) => void,
  ) => void;
}

interface HermesLike {
  enablePromiseRejectionTracker?: (options: {
    allRejections: boolean;
    onUnhandled: (id: number, error: unknown) => void;
    onHandled?: (id: number) => void;
  }) => void;
}

export function installStartupErrorTrap(): void {
  if (installed) return;
  installed = true;

  const g = global as unknown as {
    ErrorUtils?: ErrorUtilsLike;
    HermesInternal?: HermesLike;
  };

  // 1. Synchrone uncaught Errors.
  if (g.ErrorUtils?.setGlobalHandler) {
    g.ErrorUtils.setGlobalHandler((error) => {
      reportStartupError(error);
      // Kein Aufruf des Default-Handlers -> kein RCTFatal/abort.
    });
  }

  // 2. Unhandled Promise-Rejections (der wahrscheinliche Startup-Pfad).
  if (g.HermesInternal?.enablePromiseRejectionTracker) {
    g.HermesInternal.enablePromiseRejectionTracker({
      allRejections: true,
      onUnhandled: (_id, error) => {
        reportStartupError(error);
      },
      onHandled: () => {},
    });
  }
}
