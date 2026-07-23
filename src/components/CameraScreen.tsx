import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { captureFrameBase64 } from '../lib/capture';
import { analyzeFrame, GeminiError, messageForError } from '../lib/gemini';
import { useSettings } from '../lib/useSettings';
import { useComposition } from '../lib/useComposition';
import { useAimGuide } from '../lib/useAimGuide';
import { presetToColorMatrix, IDENTITY_COLOR_MATRIX } from '../lib/filters';
import { applyFilterToPhoto } from '../lib/photo';
import { ComposeAdvice, FilterPreset, ZoomLevel } from '../lib/types';
import { CompositionOverlay } from './CompositionOverlay';
import { FilterPicks } from './FilterPicks';
import { PermissionGate } from './PermissionGate';
import { ZoomSelector } from './ZoomSelector';
import { ShutterButton } from './ShutterButton';
import { ComposeButton } from './ComposeButton';
import { IconButton } from './IconButton';
import { AdvicePill } from './AdvicePill';
import { MessageBanner, type BannerKind } from './MessageBanner';
import { SettingsSheet } from './SettingsSheet';

interface Banner {
  kind: BannerKind;
  text: string;
  action?: { label: string; run: () => void };
}

/**
 * Zentrale Kamera-Ansicht.
 * Schritt 1: Feed, Zoom, Auslöser.
 * Schritt 2: Settings + "AI Compose" (ein Gemini-Call pro Antippen).
 * Schritt 3: Echtzeit-Kompositions-Overlay (on-device).
 * Schritt 4: AI Filter Picks + Live-Filter auf Vorschau und gespeichertem Foto.
 */
export function CameraScreen() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const [mediaPerm, requestMediaPerm] = MediaLibrary.usePermissions();
  const device = useCameraDevice('back');
  const settings = useSettings();

  const cameraRef = useRef<Camera>(null);
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('1x');
  const [capturing, setCapturing] = useState(false);
  const [composing, setComposing] = useState(false);
  const [advice, setAdvice] = useState<ComposeAdvice | null>(null);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [guideOn, setGuideOn] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<FilterPreset | null>(null);

  // Live-Filter (on-device, keine API-Calls pro Frame).
  const { frameProcessor, colorMatrix } = useComposition();
  // Welt-verankerter Zielpunkt fürs Reframing (Gyroskop).
  const { aim, setTarget } = useAimGuide();
  // Kompositions-Overlay (Fadenkreuz + grüner Ring) erst NACH „AI Compose"
  // anzeigen – vorher gibt es keinen Zielpunkt.
  const overlayActive = guideOn && !settingsOpen && aim.active;

  // Ausgewählten Filter live auf die Vorschau anwenden (Skia-Color-Matrix).
  useEffect(() => {
    colorMatrix.value = selectedFilter
      ? presetToColorMatrix(selectedFilter)
      : [...IDENTITY_COLOR_MATRIX];
  }, [selectedFilter, colorMatrix]);

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

      // Aktuellen Look ins gespeicherte Foto brennen (neutral = Original).
      const matrix = selectedFilter
        ? presetToColorMatrix(selectedFilter)
        : IDENTITY_COLOR_MATRIX;
      const finalUri = await applyFilterToPhoto(photo.path, matrix);

      await MediaLibrary.saveToLibraryAsync(finalUri);
      setBanner({ kind: 'success', text: 'Gespeichert in der Fotomediathek.' });
    } catch {
      setBanner({ kind: 'error', text: 'Aufnahme fehlgeschlagen. Nochmal versuchen.' });
    } finally {
      setCapturing(false);
    }
  }, [capturing, mediaPerm, requestMediaPerm, selectedFilter]);

  const compose = useCallback(async () => {
    if (!cameraRef.current || composing) return;

    if (!settings.apiKey) {
      setBanner({
        kind: 'error',
        text: messageForError('no-key'),
        action: { label: 'Einstellungen', run: () => setSettingsOpen(true) },
      });
      return;
    }

    setComposing(true);
    setBanner(null);
    try {
      const base64 = await captureFrameBase64(cameraRef.current);
      const result = await analyzeFrame({
        apiKey: settings.apiKey,
        model: settings.model,
        base64Jpeg: base64,
      });
      setAdvice(result);

      // Welt-verankerten Zielpunkt setzen (Gyroskop-Anker fürs Reframing).
      setTarget(result.focal, result.target);

      // Empfohlenen Look direkt live anwenden (Feature 3).
      if (result.filterPicks.length > 0) {
        setSelectedFilter(result.filterPicks[0] ?? null);
      }

      // Empfohlenen Zoom übernehmen, falls das Gerät die Stufe unterstützt.
      if (zoomLevels.includes(result.zoom)) {
        setZoomLevel(result.zoom);
      }
    } catch (e) {
      const kind = e instanceof GeminiError ? e.kind : 'unknown';
      // Technisches Detail mitzeigen, damit die eigentliche Ursache sichtbar ist.
      const detail = e instanceof Error ? e.message : String(e);
      setBanner({
        kind: 'error',
        text: `${messageForError(kind)}\n[${detail}]`,
        action:
          kind === 'no-key' || kind === 'auth'
            ? { label: 'Einstellungen', run: () => setSettingsOpen(true) }
            : undefined,
      });
    } finally {
      setComposing(false);
    }
  }, [composing, settings.apiKey, settings.model, zoomLevels, setTarget]);

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
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Top: Advice-Pill + Führung/Settings + Statusbanner (auf Schwarz, über dem Feld) */}
        <View style={styles.top}>
          <View style={styles.topRow}>
            <View style={styles.pillSlot}>
              {composing ? (
                <AdvicePill text="Analysiere Komposition…" loading />
              ) : advice ? (
                <AdvicePill text={advice.advice} />
              ) : null}
            </View>
            <View style={styles.topButtons}>
              <IconButton
                glyph={guideOn ? '◎' : '○'}
                label={guideOn ? 'Führung ausblenden' : 'Führung einblenden'}
                onPress={() => setGuideOn((v) => !v)}
              />
              <IconButton glyph="⚙︎" label="Einstellungen" onPress={() => setSettingsOpen(true)} />
            </View>
          </View>
          {banner ? (
            <MessageBanner
              kind={banner.kind}
              text={banner.text}
              onDismiss={() => setBanner(null)}
              actionLabel={banner.action?.label}
              onAction={banner.action?.run}
            />
          ) : null}
        </View>

        {/* Mitte: 4:3-Kamerafeld, zentriert. Overlay liegt IM Feld -> Ring-Koordinaten
            mappen aufs echte, unbeschnittene 4:3-Bild. */}
        <View style={styles.previewArea}>
          <View style={styles.preview}>
            <Camera
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              device={device as CameraDevice}
              isActive={!settingsOpen}
              photo={true}
              zoom={zoom}
              frameProcessor={frameProcessor}
            />
            <CompositionOverlay aim={aim} enabled={overlayActive} />
          </View>
        </View>

        {/* Unten: isolierter Bedien-Bereich (Filter + Zoom + Compose + Auslöser) */}
        <View style={styles.controls}>
          {advice && advice.filterPicks.length > 0 ? (
            <FilterPicks
              picks={advice.filterPicks}
              selectedName={selectedFilter?.name ?? null}
              onSelect={setSelectedFilter}
            />
          ) : null}
          <ZoomSelector levels={zoomLevels} active={zoomLevel} onChange={setZoomLevel} />
          <View style={styles.controlRow}>
            <View style={styles.side}>
              <ComposeButton onPress={compose} busy={composing} />
            </View>
            <ShutterButton onPress={capture} busy={capturing} />
            <View style={styles.side} />
          </View>
        </View>
      </SafeAreaView>

      <SettingsSheet
        visible={settingsOpen}
        apiKey={settings.apiKey}
        model={settings.model}
        onClose={() => setSettingsOpen(false)}
        onSaveApiKey={settings.saveApiKey}
        onSaveModel={settings.saveModel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  safe: {
    flex: 1,
  },
  top: {
    paddingTop: 8,
    paddingHorizontal: 12,
    gap: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  topButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  pillSlot: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
  // Nimmt den mittleren Raum ein und zentriert das Feld darin.
  previewArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  // 4:3-Sensorfeld im Hochformat (3:4 auf dem Screen), so hoch wie der Platz erlaubt.
  preview: {
    flex: 1,
    aspectRatio: 3 / 4,
    alignSelf: 'center',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  // Isolierter Bedien-Bereich unter dem Feld.
  controls: {
    paddingBottom: 8,
    paddingTop: 12,
    gap: 16,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  side: {
    flex: 1,
    alignItems: 'flex-start',
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
