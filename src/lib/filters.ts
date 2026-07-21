import { FilterPreset } from './types';

/**
 * Filter -> 4x5 Color-Matrix (20 Werte, row-major) für Skia `ColorMatrix`.
 * Semantik entspricht den CSS-Filtern brightness/contrast/saturate/sepia/hue-rotate,
 * damit die Gemini-Antwort 1:1 anwendbar ist.
 *
 * Intern rechnen wir mit 5x5-Matrizen (homogen, letzte Zeile [0,0,0,0,1]),
 * multiplizieren sie und geben am Ende die oberen 4 Zeilen (4x5) zurück.
 */

type Mat5 = number[]; // 25 Werte, row-major

function identity(): Mat5 {
  // prettier-ignore
  return [
    1, 0, 0, 0, 0,
    0, 1, 0, 0, 0,
    0, 0, 1, 0, 0,
    0, 0, 0, 1, 0,
    0, 0, 0, 0, 1,
  ];
}

function multiply(a: Mat5, b: Mat5): Mat5 {
  const out = new Array<number>(25).fill(0);
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      let sum = 0;
      for (let k = 0; k < 5; k++) {
        sum += (a[r * 5 + k] ?? 0) * (b[k * 5 + c] ?? 0);
      }
      out[r * 5 + c] = sum;
    }
  }
  return out;
}

/** brightness(b): skaliert RGB. */
function brightnessMat(b: number): Mat5 {
  // prettier-ignore
  return [
    b, 0, 0, 0, 0,
    0, b, 0, 0, 0,
    0, 0, b, 0, 0,
    0, 0, 0, 1, 0,
    0, 0, 0, 0, 1,
  ];
}

/** contrast(c): (x - 0.5) * c + 0.5, offset in 0..255-Raum -> Skia arbeitet in 0..1. */
function contrastMat(c: number): Mat5 {
  const t = 0.5 * (1 - c);
  // prettier-ignore
  return [
    c, 0, 0, 0, t,
    0, c, 0, 0, t,
    0, 0, c, 0, t,
    0, 0, 0, 1, 0,
    0, 0, 0, 0, 1,
  ];
}

/** saturate(s): Standard-Luminanz-gewichtete Sättigung. */
function saturateMat(s: number): Mat5 {
  const lr = 0.3086;
  const lg = 0.6094;
  const lb = 0.082;
  const sr = (1 - s) * lr;
  const sg = (1 - s) * lg;
  const sb = (1 - s) * lb;
  // prettier-ignore
  return [
    sr + s, sg,     sb,     0, 0,
    sr,     sg + s, sb,     0, 0,
    sr,     sg,     sb + s, 0, 0,
    0,      0,      0,      1, 0,
    0,      0,      0,      0, 1,
  ];
}

/** sepia(amount): CSS-Sepia interpoliert zwischen Identität und Sepia-Kernel. */
function sepiaMat(a: number): Mat5 {
  const inv = 1 - a;
  // prettier-ignore
  return [
    inv + a * 0.393, a * 0.769, a * 0.189, 0, 0,
    a * 0.349, inv + a * 0.686, a * 0.168, 0, 0,
    a * 0.272, a * 0.534, inv + a * 0.131, 0, 0,
    0, 0, 0, 1, 0,
    0, 0, 0, 0, 1,
  ];
}

/** hueRotate(deg): Rotation im RGB-Raum um die Luminanz-Achse. */
function hueRotateMat(deg: number): Mat5 {
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const lr = 0.213;
  const lg = 0.715;
  const lb = 0.072;
  // prettier-ignore
  return [
    lr + cos * (1 - lr) + sin * -lr,       lg + cos * -lg + sin * -lg,        lb + cos * -lb + sin * (1 - lb),  0, 0,
    lr + cos * -lr + sin * 0.143,          lg + cos * (1 - lg) + sin * 0.14,  lb + cos * -lb + sin * -0.283,    0, 0,
    lr + cos * -lr + sin * -(1 - lr),      lg + cos * -lg + sin * lg,         lb + cos * (1 - lb) + sin * lb,   0, 0,
    0, 0, 0, 1, 0,
    0, 0, 0, 0, 1,
  ];
}

/** Werte defensiv in die vom Contract erlaubten Bereiche klemmen. */
export function clampPreset(p: FilterPreset): FilterPreset {
  const clamp = (v: number, lo: number, hi: number) =>
    Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : (lo + hi) / 2));
  return {
    name: (p.name ?? 'Look').toString().slice(0, 24),
    brightness: clamp(p.brightness, 0.8, 1.3),
    contrast: clamp(p.contrast, 0.8, 1.4),
    saturate: clamp(p.saturate, 0.8, 1.6),
    sepia: clamp(p.sepia, 0, 0.4),
    hueRotate: clamp(p.hueRotate, -30, 30),
  };
}

/**
 * Baut die 4x5-Color-Matrix (20 Werte) für Skia aus einem Filter-Preset.
 * Reihenfolge der Verkettung: brightness -> contrast -> saturate -> hue -> sepia.
 */
export function presetToColorMatrix(preset: FilterPreset): number[] {
  const p = clampPreset(preset);
  let m = identity();
  m = multiply(brightnessMat(p.brightness), m);
  m = multiply(contrastMat(p.contrast), m);
  m = multiply(saturateMat(p.saturate), m);
  m = multiply(hueRotateMat(p.hueRotate), m);
  m = multiply(sepiaMat(p.sepia), m);

  // Obere 4 Zeilen (RGBA) -> 20 Werte für Skia ColorMatrix.
  return m.slice(0, 20);
}

/** Neutrale 4x5-Matrix (kein Filter). */
export const IDENTITY_COLOR_MATRIX: number[] = identity().slice(0, 20);

/** Ein paar eingebaute Presets als Startpunkt, falls Gemini (noch) nichts lieferte. */
export const BUILTIN_PRESETS: FilterPreset[] = [
  { name: 'Original', brightness: 1, contrast: 1, saturate: 1, sepia: 0, hueRotate: 0 },
  { name: 'Vivid', brightness: 1.05, contrast: 1.15, saturate: 1.4, sepia: 0, hueRotate: 0 },
  { name: 'Warm Film', brightness: 1.05, contrast: 1.1, saturate: 1.1, sepia: 0.25, hueRotate: -8 },
  { name: 'Cool Cine', brightness: 0.98, contrast: 1.2, saturate: 1.05, sepia: 0, hueRotate: 12 },
  { name: 'Mono Soft', brightness: 1.02, contrast: 1.1, saturate: 0.8, sepia: 0.1, hueRotate: 0 },
];
