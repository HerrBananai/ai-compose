import React, { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as MediaLibrary from 'expo-media-library';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  type CameraDevice,
} from 'react-native-vision-camera';

import { theme } from '../theme';
import { availableZoomLevels, zoomForLevel } from '../lib/camera';
import { ZoomLevel } from '../lib/types';
import { PermissionGate } from './PermissionGate';
import { ZoomSelector } from './ZoomSelector';
import { ShutterButton } from './ShutterButton';
import { MessageBanner, type BannerKind } from './MessageBanner';

interface Banner {
  kind: BannerKind;
  text: string;
}

/**
 * Zentrale Kamera-Ansicht (Schritt 1):
 * Vollbild-Rückkamera, Zoom-Umschalter, Auslöser -> Speichern in Mediathek.
 * Compose/Overlay/Filter kommen in den nächsten Schritten dazu.
 */
export function CameraScreen() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const [mediaPerm, requestMediaPerm] = MediaLibrary.usePermissions();
  const device = useCameraDevice('back');

  const cameraRef = useRef<Camera>(null);
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('1x');
  const [capturing, setCapturing] = useState(false);
  const [banner, setBanner] = useState<Banner | null>(null);

  const zoomLevels = useMemo(
    () => (device ? availableZoomLevels(device) : (['1x'] as ZoomLevel[])),
    [device],
  );
  const zoom = useMemo(
    () => (device ? zoomForLevel(device, zoomLevel) : 1),
    [device, zoomLevel],
  );

  const capture = useCallback(async () => {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    setBanner(null);
    try {
      // Media-Library-Berechtigung sicherstellen (nur Speichern nötig).
      let granted = mediaPerm?.granted ?? false;
      if (!granted) {
        const res = await requestMediaPerm();
        granted = res.granted;
      }

      const photo = await cameraRef.current.takePhoto({
        flash: 'off',
        enableShutterSound: true,
      });

      if (!granted) {
        setBanner({
          kind: 'error',
          text: 'Foto aufgenommen, aber ohne Foto-Berechtigung kann es nicht gespeichert werden.',
        });
        return;
      }

      await MediaLibrary.saveToLibraryAsync(`file://${photo.path}`);
      setBanner({ kind: 'success', text: 'Gespeichert in der Fotomediathek.' });
    } catch (e) {
      setBanner({ kind: 'error', text: 'Aufnahme fehlgeschlagen. Nochmal versuchen.' });
    } finally {
      setCapturing(false);
    }
  }, [capturing, mediaPerm, requestMediaPerm]);

  // --- Berechtigungs- und Gerätezustände ---
  if (!hasPermission) {
    return (
      <PermissionGate
        title="Kamera-Zugriff nötig"
        body="AI Compose analysiert live deine Bildkomposition direkt auf dem Gerät. Dafür braucht die App Zugriff auf die Kamera."
        cta="Kamera erlauben"
        onPress={requestPermission}
        secondaryCta="In den iOS-Einstellungen öffnen"
      />
    );
  }

  if (!device) {
    return (
      <View style={styles.center}>
        <Text style={styles.centerText}>Keine Rückkamera gefunden.</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device as CameraDevice}
        isActive={true}
        photo={true}
        zoom={zoom}
      />

      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        {/* Top: Statusbanner */}
        <View style={styles.top} pointerEvents="box-none">
          {banner ? (
            <MessageBanner
              kind={banner.kind}
              text={banner.text}
              onDismiss={() => setBanner(null)}
            />
          ) : null}
        </View>

        {/* Bottom: Zoom + Auslöser */}
        <View style={styles.bottom} pointerEvents="box-none">
          <ZoomSelector levels={zoomLevels} active={zoomLevel} onChange={setZoomLevel} />
          <View style={styles.shutterRow}>
            <ShutterButton onPress={capture} busy={capturing} />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  top: {
    paddingTop: 8,
    paddingHorizontal: 12,
    gap: 8,
  },
  bottom: {
    paddingBottom: 16,
    gap: 18,
  },
  shutterRow: {
    alignItems: 'center',
  },
  center: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerText: {
    color: theme.colors.text,
    fontSize: theme.font.pill,
  },
});
