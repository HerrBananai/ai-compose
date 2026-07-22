/** Zoom-Stufen, die über die nativen VisionCamera-Objektive gemappt werden. */
export type ZoomLevel = '0.5x' | '1x' | '2x' | '5x';

export const ZOOM_LEVELS: ZoomLevel[] = ['0.5x', '1x', '2x', '5x'];

/** Numerischer Zoom-Faktor zu einer Zoom-Stufe. */
export const zoomLevelToFactor: Record<ZoomLevel, number> = {
  '0.5x': 0.5,
  '1x': 1,
  '2x': 2,
  '5x': 5,
};

/** Ein einzelnes Filter-Preset (kompatibel mit CSS-Filter-Semantik). */
export interface FilterPreset {
  name: string;
  brightness: number; // 0.8 .. 1.3
  contrast: number; // 0.8 .. 1.4
  saturate: number; // 0.8 .. 1.6
  sepia: number; // 0 .. 0.4
  hueRotate: number; // -30 .. 30 (Grad)
}

/** Normalisierte Fokus-Position im Frame (0..1). */
export interface FocalPoint {
  x: number;
  y: number;
}

/** Strukturierte Antwort von Gemini (siehe Gemini-Contract). */
export interface ComposeAdvice {
  advice: string;
  /** Aktuelle Position des Hauptmotivs im Bild (0..1). */
  focal: FocalPoint;
  /** Ziel-Drittel-Punkt, auf den das Motiv soll (0..1, an Drittel gerastet). */
  target: FocalPoint;
  zoom: ZoomLevel;
  filterPicks: FilterPreset[];
}

/**
 * Echtzeit-Kompositions-Führung, geschrieben vom Frame-Processor (Worklet)
 * und gelesen vom Overlay. Alle Positionen normalisiert (0..1).
 */
export interface Guidance {
  /** Erkanntes Hauptmotiv (Fokuspunkt). */
  fx: number;
  fy: number;
  /** Nächstgelegener Drittel-Regel-Schnittpunkt (Ziel). */
  tx: number;
  ty: number;
  /** true, wenn Motiv nah genug am Zielpunkt (Ring rastet grün ein). */
  locked: boolean;
  /** true, wenn genug Bildsignal für eine sinnvolle Schätzung da ist. */
  active: boolean;
}

export const INITIAL_GUIDANCE: Guidance = {
  fx: 0.5,
  fy: 0.5,
  tx: 0.3333,
  ty: 0.3333,
  locked: false,
  active: false,
};

/**
 * Von der App unterstützte Gemini-Modelle (v1beta generateContent).
 * Bewusst die selbst-aktualisierenden Google-Aliase: die zeigen immer auf die
 * aktuelle Version und werden nie "deprecated" -> kein 404 durch tote Namen.
 *   gemini-flash-latest       -> aktuell gemini-3.5-flash
 *   gemini-flash-lite-latest  -> aktuell gemini-3.1-flash-lite
 */
export type GeminiModel = 'gemini-flash-latest' | 'gemini-flash-lite-latest';

export const DEFAULT_MODEL: GeminiModel = 'gemini-flash-latest';
export const FALLBACK_MODEL: GeminiModel = 'gemini-flash-lite-latest';
