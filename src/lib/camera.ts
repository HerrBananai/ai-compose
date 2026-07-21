import type { CameraDevice } from 'react-native-vision-camera';

import { ZoomLevel } from './types';

/**
 * Mappt eine UI-Zoom-Stufe auf den nativen VisionCamera-`zoom`-Wert.
 *
 * VisionCamera zoomt kontinuierlich zwischen device.minZoom und device.maxZoom.
 * - device.neutralZoom = "1x" (die Weitwinkel-Linse)
 * - device.minZoom     = die weiteste Linse (Ultraweitwinkel -> unser "0.5x"),
 *   sofern das Gerät eine Ultraweitwinkel-Kamera hat.
 *
 * Wir clampen jede Stufe in [minZoom, maxZoom], damit es auf jedem iPhone
 * (mit/ohne Ultraweit, mit/ohne Tele) sinnvoll funktioniert.
 */
export function zoomForLevel(device: CameraDevice, level: ZoomLevel): number {
  const neutral = device.neutralZoom ?? 1;
  const min = device.minZoom ?? 1;
  const max = device.maxZoom ?? neutral * 5;

  let target: number;
  switch (level) {
    case '0.5x':
      // Ultraweit falls vorhanden, sonst die weiteste verfügbare Linse.
      target = min < neutral ? min : neutral;
      break;
    case '1x':
      target = neutral;
      break;
    case '2x':
      target = neutral * 2;
      break;
    case '5x':
      target = neutral * 5;
      break;
  }
  return Math.min(max, Math.max(min, target));
}

/** Prüft, ob das Gerät eine echte 0.5x-Linse (Ultraweit) hat. */
export function hasUltraWide(device: CameraDevice): boolean {
  const neutral = device.neutralZoom ?? 1;
  const min = device.minZoom ?? 1;
  return min < neutral - 0.001;
}

/** Nur die Zoom-Stufen zurückgeben, die das Gerät sinnvoll unterstützt. */
export function availableZoomLevels(device: CameraDevice): ZoomLevel[] {
  const neutral = device.neutralZoom ?? 1;
  const max = device.maxZoom ?? neutral * 5;
  const levels: ZoomLevel[] = [];
  if (hasUltraWide(device)) levels.push('0.5x');
  levels.push('1x');
  if (max >= neutral * 2 - 0.01) levels.push('2x');
  if (max >= neutral * 5 - 0.01) levels.push('5x');
  return levels;
}
