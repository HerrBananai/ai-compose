import { useMemo } from 'react';
import { Skia } from '@shopify/react-native-skia';
import { useSkiaFrameProcessor } from 'react-native-vision-camera';
import { useResizePlugin } from 'vision-camera-resize-plugin';
import { Worklets, type ISharedValue } from 'react-native-worklets-core';

import { IDENTITY_COLOR_MATRIX } from './filters';
import { Guidance, INITIAL_GUIDANCE } from './types';

// Analyse-Auflösung (klein = billig). Bewusst grob – wir suchen die Region
// mit der höchsten Kanten-Energie (grobe Saliency), nicht Pixelgenauigkeit.
const AW = 48;
const AH = 36;

// Nur jedes N-te Frame analysieren; dazwischen bleibt das letzte Ergebnis stehen.
const EVERY_N = 2;

// Drittel-Regel-Schnittpunkte.
const THIRDS: number[] = [1 / 3, 2 / 3];

// Wie nah (normalisiert) das Motiv am Zielpunkt sein muss, damit der Ring einrastet.
const LOCK_DIST = 0.07;

export interface Composition {
  frameProcessor: ReturnType<typeof useSkiaFrameProcessor>;
  guidance: ISharedValue<Guidance>;
  /** Live-Filter: 4x5 Color-Matrix, die jedes Frame auf die Vorschau angewandt wird. */
  colorMatrix: ISharedValue<number[]>;
}

function isIdentityMatrix(m: number[]): boolean {
  'worklet';
  if (m.length !== IDENTITY_COLOR_MATRIX.length) return true;
  for (let i = 0; i < m.length; i++) {
    if (Math.abs(m[i] - IDENTITY_COLOR_MATRIX[i]) > 1e-4) return false;
  }
  return true;
}

/**
 * Echtzeit-Kompositions-Analyse rein on-device, ohne Modell und ohne API-Calls.
 *
 * Vorgehen im Worklet:
 *  1. Frame in ein winziges RGB-Raster verkleinern (resize-plugin, nativ).
 *  2. Kanten-Energie je Pixel schätzen und den energiegewichteten Schwerpunkt
 *     bilden -> Fokuspunkt des vermuteten Hauptmotivs.
 *  3. Nächstgelegenen Drittel-Regel-Schnittpunkt bestimmen -> Zielpunkt.
 *  4. Ergebnis geglättet (EMA) in eine Shared Value schreiben; das Overlay
 *     liest sie und zeichnet Ring/Fadenkreuz/Pfeil.
 */
export function useComposition(): Composition {
  const { resize } = useResizePlugin();
  const guidance = useMemo(
    () => Worklets.createSharedValue<Guidance>({ ...INITIAL_GUIDANCE }),
    [],
  );
  const counter = useMemo(() => Worklets.createSharedValue<number>(0), []);
  const colorMatrix = useMemo(
    () => Worklets.createSharedValue<number[]>([...IDENTITY_COLOR_MATRIX]),
    [],
  );

  const frameProcessor = useSkiaFrameProcessor(
    (frame) => {
      'worklet';
      // Kamerabild rendern – mit Live-Filter, falls einer aktiv ist.
      const m = colorMatrix.value;
      if (isIdentityMatrix(m)) {
        frame.render();
      } else {
        const paint = Skia.Paint();
        paint.setColorFilter(Skia.ColorFilter.MakeMatrix(m));
        frame.render(paint);
      }

      counter.value = (counter.value + 1) % EVERY_N;
      if (counter.value !== 0) return;

      // 1. Verkleinern zu RGB-uint8.
      const data = resize(frame, {
        scale: { width: AW, height: AH },
        pixelFormat: 'rgb',
        dataType: 'uint8',
      }) as unknown as Uint8Array;

      // 2. Kanten-Energie -> gewichteter Schwerpunkt.
      let sumW = 0;
      let sumX = 0;
      let sumY = 0;
      for (let y = 1; y < AH - 1; y++) {
        for (let x = 1; x < AW - 1; x++) {
          const i = (y * AW + x) * 3;
          const iR = (y * AW + (x + 1)) * 3;
          const iD = ((y + 1) * AW + x) * 3;
          const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          const lumR = 0.299 * data[iR] + 0.587 * data[iR + 1] + 0.114 * data[iR + 2];
          const lumD = 0.299 * data[iD] + 0.587 * data[iD + 1] + 0.114 * data[iD + 2];
          const grad = Math.abs(lum - lumR) + Math.abs(lum - lumD);
          if (grad > 10) {
            sumW += grad;
            sumX += grad * (x / (AW - 1));
            sumY += grad * (y / (AH - 1));
          }
        }
      }

      const active = sumW > 1500;
      let fx = active ? sumX / sumW : 0.5;
      let fy = active ? sumY / sumW : 0.5;

      // Leichte Zentrums-Vorspannung gegen Zappeln an den Rändern.
      fx = 0.85 * fx + 0.15 * 0.5;
      fy = 0.85 * fy + 0.15 * 0.5;

      // 3. Nächstgelegenen Drittel-Schnittpunkt suchen.
      let tx = THIRDS[0];
      let ty = THIRDS[0];
      let best = Infinity;
      for (let a = 0; a < THIRDS.length; a++) {
        for (let b = 0; b < THIRDS.length; b++) {
          const dx = fx - THIRDS[a];
          const dy = fy - THIRDS[b];
          const d = dx * dx + dy * dy;
          if (d < best) {
            best = d;
            tx = THIRDS[a];
            ty = THIRDS[b];
          }
        }
      }
      const dist = Math.sqrt(best);
      const locked = active && dist < LOCK_DIST;

      // 4. EMA-Glättung gegen den letzten Wert.
      const prev = guidance.value;
      const s = 0.35;
      guidance.value = {
        fx: prev.fx + (fx - prev.fx) * s,
        fy: prev.fy + (fy - prev.fy) * s,
        tx,
        ty,
        locked,
        active,
      };
    },
    [resize, guidance, counter, colorMatrix],
  );

  return { frameProcessor, guidance, colorMatrix };
}
