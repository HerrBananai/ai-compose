import { clampPreset } from './filters';
import {
  ComposeAdvice,
  FilterPreset,
  GeminiModel,
  ZOOM_LEVELS,
  ZoomLevel,
} from './types';

/** Von der App unterscheidbare Fehlerarten -> gezielte UI-Meldung. */
export type GeminiErrorKind =
  | 'no-key'
  | 'timeout'
  | 'rate-limit'
  | 'auth'
  | 'bad-response'
  | 'network'
  | 'unknown';

export class GeminiError extends Error {
  kind: GeminiErrorKind;
  constructor(kind: GeminiErrorKind, message: string) {
    super(message);
    this.kind = kind;
    this.name = 'GeminiError';
  }
}

/** Menschenlesbare, deutsche Meldung je Fehlerart. */
export function messageForError(kind: GeminiErrorKind): string {
  switch (kind) {
    case 'no-key':
      return 'Kein API-Key gesetzt. Öffne die Einstellungen und trage deinen Gemini-Key ein.';
    case 'timeout':
      return 'Zeitüberschreitung – Gemini hat nicht rechtzeitig geantwortet. Nochmal versuchen.';
    case 'rate-limit':
      return 'Rate-Limit erreicht (Free-Tier). Kurz warten und erneut antippen.';
    case 'auth':
      return 'API-Key ungültig oder ohne Zugriff. Bitte in den Einstellungen prüfen.';
    case 'bad-response':
      return 'Gemini-Antwort konnte nicht gelesen werden. Nochmal versuchen.';
    case 'network':
      return 'Keine Verbindung. Prüfe dein Netzwerk und versuch es erneut.';
    default:
      return 'Unerwarteter Fehler bei der Analyse. Nochmal versuchen.';
  }
}

const PROMPT = [
  'Du bist ein Foto-Coach. Analysiere das Bild als Kamera-Vorschau.',
  'Nenne das Hauptmotiv und gib einen konkreten Kompositionstipp nach der Drittel-Regel.',
  'Antworte AUSSCHLIESSLICH mit reinem JSON (kein Markdown, keine Erklärung) in genau diesem Schema:',
  '{',
  '  "advice": "kurzer deutscher Satz: Hauptmotiv + Kompositionstipp",',
  '  "focal": {"x":0.0,"y":0.0},',
  '  "zoom": "1x",',
  '  "filterPicks": [',
  '    {"name":"Look-Name","brightness":1.0,"contrast":1.0,"saturate":1.0,"sepia":0.0,"hueRotate":0}',
  '  ]',
  '}',
  'Regeln: focal.x und focal.y sind 0..1 (0,0 = oben links). zoom ist einer von "0.5x","1x","2x","5x".',
  'Gib 3 bis 4 filterPicks. Wertebereiche: brightness 0.8..1.3, contrast 0.8..1.4, saturate 0.8..1.6, sepia 0..0.4, hueRotate -30..30.',
].join('\n');

const TIMEOUT_MS = 20000;

interface CallOptions {
  apiKey: string;
  model: GeminiModel;
  base64Jpeg: string;
  signal?: AbortSignal;
}

/**
 * Ruft Gemini generateContent auf und liefert eine validierte ComposeAdvice.
 * Contract: contents[0].parts = [ {text}, {inline_data:{mime_type,image}} ].
 */
export async function analyzeFrame(opts: CallOptions): Promise<ComposeAdvice> {
  if (!opts.apiKey) {
    throw new GeminiError('no-key', 'missing api key');
  }

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${opts.model}:generateContent?key=` +
    encodeURIComponent(opts.apiKey);

  const body = {
    contents: [
      {
        parts: [
          { text: PROMPT },
          { inline_data: { mime_type: 'image/jpeg', data: opts.base64Jpeg } },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.4,
      responseMimeType: 'application/json',
    },
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  // Externes Abort-Signal (z.B. Screen unmount) mit lokalem Timeout koppeln.
  if (opts.signal) {
    if (opts.signal.aborted) controller.abort();
    else opts.signal.addEventListener('abort', () => controller.abort());
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (e: unknown) {
    clearTimeout(timeout);
    if (e instanceof Error && e.name === 'AbortError') {
      throw new GeminiError('timeout', 'request aborted');
    }
    throw new GeminiError('network', 'fetch failed');
  }
  clearTimeout(timeout);

  if (res.status === 429) {
    throw new GeminiError('rate-limit', 'HTTP 429');
  }
  if (res.status === 400 || res.status === 401 || res.status === 403) {
    throw new GeminiError('auth', `HTTP ${res.status}`);
  }
  if (!res.ok) {
    throw new GeminiError('unknown', `HTTP ${res.status}`);
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new GeminiError('bad-response', 'invalid json envelope');
  }

  const text = extractText(json);
  if (!text) {
    throw new GeminiError('bad-response', 'no text part');
  }

  const parsed = parseAdviceJson(text);
  if (!parsed) {
    throw new GeminiError('bad-response', 'could not parse advice json');
  }
  return parsed;
}

/** Zieht den Text-Part aus der Gemini-Envelope. */
function extractText(json: unknown): string | null {
  try {
    const candidates = (json as any)?.candidates;
    const parts = candidates?.[0]?.content?.parts;
    if (Array.isArray(parts)) {
      const joined = parts
        .map((p: any) => (typeof p?.text === 'string' ? p.text : ''))
        .join('');
      return joined.length > 0 ? joined : null;
    }
  } catch {
    // fällt unten durch
  }
  return null;
}

/**
 * Robustes Parsen: Markdown-Fences strippen, erstes balanciertes {...} matchen,
 * dann validieren + defensiv normalisieren.
 */
export function parseAdviceJson(raw: string): ComposeAdvice | null {
  const candidate = extractFirstJsonObject(stripFences(raw));
  if (!candidate) return null;

  let obj: any;
  try {
    obj = JSON.parse(candidate);
  } catch {
    return null;
  }

  const advice = typeof obj.advice === 'string' ? obj.advice.trim() : '';
  const focalX = clamp01(Number(obj?.focal?.x));
  const focalY = clamp01(Number(obj?.focal?.y));
  const zoom = normalizeZoom(obj?.zoom);
  const picks = normalizePicks(obj?.filterPicks);

  if (!advice) return null;

  return {
    advice: advice.slice(0, 200),
    focal: { x: focalX, y: focalY },
    zoom,
    filterPicks: picks,
  };
}

function stripFences(s: string): string {
  // ```json ... ```  oder  ``` ... ```
  return s
    .replace(/```(?:json)?/gi, '')
    .replace(/```/g, '')
    .trim();
}

/** Findet das erste balancierte JSON-Objekt (achtet auf Strings/Escapes). */
function extractFirstJsonObject(s: string): string | null {
  const start = s.indexOf('{');
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return null;
}

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0.5;
  return Math.min(1, Math.max(0, v));
}

function normalizeZoom(v: unknown): ZoomLevel {
  if (typeof v === 'string' && (ZOOM_LEVELS as string[]).includes(v)) {
    return v as ZoomLevel;
  }
  return '1x';
}

function normalizePicks(v: unknown): FilterPreset[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((p) => p && typeof p === 'object')
    .slice(0, 5)
    .map((p: any) =>
      clampPreset({
        name: typeof p.name === 'string' ? p.name : 'Look',
        brightness: Number(p.brightness),
        contrast: Number(p.contrast),
        saturate: Number(p.saturate),
        sepia: Number(p.sepia),
        hueRotate: Number(p.hueRotate),
      }),
    );
}
