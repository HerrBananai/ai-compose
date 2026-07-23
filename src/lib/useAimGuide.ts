import { useCallback, useEffect, useRef, useState } from 'react';
import { DeviceMotion } from 'expo-sensors';

import { FocalPoint } from './types';

/**
 * Welt-verankerter Zielpunkt fürs Reframing – an der realen Szene fixiert.
 *
 * Beim „AI Compose" liefert Gemini Motiv-Position (focal) + Ziel-Drittel-Punkt
 * (target). Der grüne Ring markiert eine feste RICHTUNG in der realen Welt (z.B.
 * „die Bank neben dem Baum"): P0 = Mitte + (focal - target). Bewegt/dreht man das
 * Handy, bleibt der Ring auf genau diesem Weltpunkt kleben. Schiebt man ihn unter
 * das feste Fadenkreuz, sitzt das Motiv auf dem Ziel-Drittel.
 *
 * ANSATZ: Wir nehmen die fusionierte, driftfreie Geräte-Lage (DeviceMotion.rotation
 * = Gyro+Accel+Magnetometer) und bauen daraus die volle Rotationsmatrix. Beim
 * Compose speichern wir den Ziel-Blickstrahl als festen WELTVEKTOR W = R0·d0. Jedes
 * Frame projizieren wir W zurück in die aktuelle Kamera-Ebene (d = Rᵀ·W) und aufs
 * Display. Volle 3D-Rotation statt Euler-Einzelachsen -> kein „im Kreis wandern"
 * (Gimbal-Lock bei senkrechtem Handy) und kein Drift.
 *
 * GLÄTTUNG: Natürliches Hand-/Sensorzittern schlägt sonst 1:1 auf den Ring durch
 * (er „schwappt"). Ein One-Euro-Filter dämpft im Stillstand stark (killt Tremor),
 * bleibt bei bewusster Bewegung aber reaktionsschnell (kaum Lag).
 */

// Kamera-Blickwinkel in Grad für die 4:3-Vorschau im Hochformat. Legt fest, wie
// schnell der Ring relativ zur Szene wandert: stimmt der Wert ~ echtem FOV, klebt
// der Ring exakt. Primäre Feintuning-Knöpfe am Gerät (iPhone Hauptkamera, 4:3).
const FOV_X_DEG = 52; // horizontal (Bildbreite = kurze Sensorseite im Hochformat)
const FOV_Y_DEG = 66; // vertikal (Bildhöhe = lange Sensorseite im Hochformat)

// Falls eine Geräteachse spiegelverkehrt wirkt, hier auf -1 setzen (sonst 1).
const INVERT_X = 1;
const INVERT_Y = 1;

// One-Euro-Filter: kleiner MIN_CUTOFF = mehr Ruhe im Stillstand (mehr Lag);
// größer BETA = weniger Lag bei schneller Bewegung.
const MIN_CUTOFF = 0.5; // Hz
const BETA = 2.0;
const D_CUTOFF = 1.0; // Hz, Glättung der Geschwindigkeitsschätzung

const LOCK_DIST = 0.05; // eingerastet, wenn Ring so nah an der Mitte liegt
const CLAMP_MIN = -0.5; // Ring darf als Hinweis über den Rand, aber nicht ins Unendliche
const CLAMP_MAX = 1.5;

const DEG2RAD = Math.PI / 180;
// Projektions-Skalen: Screen-Offset (aus Mitte) = tan(winkel) / (2 tan(FOV/2)).
const KX = 2 * Math.tan((FOV_X_DEG * DEG2RAD) / 2);
const KY = 2 * Math.tan((FOV_Y_DEG * DEG2RAD) / 2);

export interface Aim {
  active: boolean;
  /** Grüner Anker, normalisiert (0..1). */
  gx: number;
  gy: number;
  /** Anker liegt unter dem Fadenkreuz. */
  locked: boolean;
}

const INACTIVE: Aim = { active: false, gx: 0.5, gy: 0.5, locked: false };

type Vec3 = [number, number, number];
// Rotationsmatrix, row-major: [m0 m1 m2 / m3 m4 m5 / m6 m7 m8].
type Mat3 = [number, number, number, number, number, number, number, number, number];

/**
 * Geräte-Lage -> Rotationsmatrix (Gerät->Welt), W3C-Konvention R = Rz(α)·Rx(β)·Ry(γ).
 * Aus der vollen Matrix gerechnet, damit keine Euler-Kopplung/Gimbal-Artefakte
 * entstehen (Euler->Matrix ist immer eindeutig, nur Matrix->Euler wäre mehrdeutig).
 */
function attitudeMatrix(alpha: number, beta: number, gamma: number): Mat3 {
  const ca = Math.cos(alpha);
  const sa = Math.sin(alpha);
  const cb = Math.cos(beta);
  const sb = Math.sin(beta);
  const cg = Math.cos(gamma);
  const sg = Math.sin(gamma);
  return [
    ca * cg - sa * sb * sg, -sa * cb, ca * sg + sa * sb * cg,
    sa * cg + ca * sb * sg, ca * cb, sa * sg - ca * sb * cg,
    -cb * sg, sb, cb * cg,
  ];
}

/** m · v */
function apply(m: Mat3, v: Vec3): Vec3 {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ];
}

/** mᵀ · v (inverse Rotation: Welt->Gerät) */
function applyT(m: Mat3, v: Vec3): Vec3 {
  return [
    m[0] * v[0] + m[3] * v[1] + m[6] * v[2],
    m[1] * v[0] + m[4] * v[1] + m[7] * v[2],
    m[2] * v[0] + m[5] * v[1] + m[8] * v[2],
  ];
}

function clamp(v: number): number {
  return v < CLAMP_MIN ? CLAMP_MIN : v > CLAMP_MAX ? CLAMP_MAX : v;
}

/**
 * Screen-Offset (0..1) -> Blickstrahl im Geräte-/Kameraframe (Rückkamera schaut −Z).
 * `zoom` = aktueller Zoomfaktor relativ zu 1x: beim Reinzoomen schrumpft der echte
 * FOV (tan(θ) -> tan(θ)/zoom), der Screen-Offset für denselben Weltwinkel wächst.
 */
function screenToRay(px: number, py: number, zoom: number): Vec3 {
  const ux = px - 0.5; // rechts +
  const uyUp = -(py - 0.5); // oben + (Screen-y zeigt nach unten)
  return [(ux * KX) / zoom, (uyUp * KY) / zoom, -1];
}

// --- One-Euro-Filter (Casiez et al.) je Achse ---
interface Channel {
  xHat: number;
  dxHat: number;
  xPrev: number;
  init: boolean;
}

function newChannel(): Channel {
  return { xHat: 0.5, dxHat: 0, xPrev: 0.5, init: false };
}

function lpAlpha(cutoff: number, dt: number): number {
  const tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau / dt);
}

function oneEuro(c: Channel, x: number, dt: number): number {
  if (!c.init) {
    c.init = true;
    c.xPrev = x;
    c.xHat = x;
    c.dxHat = 0;
    return x;
  }
  const dx = (x - c.xPrev) / dt;
  const aD = lpAlpha(D_CUTOFF, dt);
  c.dxHat = aD * dx + (1 - aD) * c.dxHat;
  const cutoff = MIN_CUTOFF + BETA * Math.abs(c.dxHat);
  const a = lpAlpha(cutoff, dt);
  c.xHat = a * x + (1 - a) * c.xHat;
  c.xPrev = x;
  return c.xHat;
}

export function useAimGuide(zoomFactor: number = 1): {
  aim: Aim;
  setTarget: (focal: FocalPoint, target: FocalPoint) => void;
  clear: () => void;
} {
  const worldRay = useRef<Vec3 | null>(null); // fixer Ziel-Blickstrahl in Weltkoordinaten
  const latestEuler = useRef<{ a: number; b: number; g: number } | null>(null);
  const chX = useRef<Channel>(newChannel());
  const chY = useRef<Channel>(newChannel());
  const lastT = useRef<number>(0);
  const zoomRef = useRef(1); // aktueller Zoomfaktor relativ zu 1x
  zoomRef.current = zoomFactor > 0 ? zoomFactor : 1;
  const [aim, setAim] = useState<Aim>(INACTIVE);

  useEffect(() => {
    DeviceMotion.setUpdateInterval(16); // ~60 Hz für flüssiges Tracking
    const sub = DeviceMotion.addListener((data) => {
      const rot = data.rotation;
      if (!rot) return;
      latestEuler.current = { a: rot.alpha, b: rot.beta, g: rot.gamma };

      const W = worldRay.current;
      if (!W) return;

      // Weltstrahl zurück in die aktuelle Kamera-Ebene projizieren.
      const R = attitudeMatrix(rot.alpha, rot.beta, rot.gamma);
      const d = applyT(R, W); // Welt->Gerät
      const denom = -d[2]; // vor der Kamera, wenn > 0

      const z = zoomRef.current;
      let ux: number;
      let uyUp: number;
      if (denom > 0.001) {
        // Beim Reinzoomen wächst der Screen-Offset für denselben Weltwinkel um z.
        ux = ((d[0] / denom) / KX) * z;
        uyUp = ((d[1] / denom) / KY) * z;
      } else {
        // Anker liegt hinter der Kamera (>90° weggedreht): am Rand in Blickrichtung halten.
        ux = d[0] >= 0 ? 10 : -10;
        uyUp = d[1] >= 0 ? 10 : -10;
      }

      const rawX = 0.5 + INVERT_X * ux;
      const rawY = 0.5 - INVERT_Y * uyUp;

      // Zittern glätten (adaptiv: ruhig im Stand, flott bei Bewegung).
      const now = Date.now();
      let dt = lastT.current ? (now - lastT.current) / 1000 : 1 / 60;
      if (dt <= 0 || dt > 0.5) dt = 1 / 60;
      lastT.current = now;

      const gx = clamp(oneEuro(chX.current, rawX, dt));
      const gy = clamp(oneEuro(chY.current, rawY, dt));
      const locked = Math.hypot(gx - 0.5, gy - 0.5) < LOCK_DIST;
      setAim({ active: true, gx, gy, locked });
    });
    return () => sub.remove();
  }, []);

  const setTarget = useCallback((focal: FocalPoint, target: FocalPoint) => {
    // Ziel-Ankerpunkt auf dem Screen und sein Blickstrahl im Kameraframe.
    const p0x = 0.5 + (focal.x - target.x);
    const p0y = 0.5 + (focal.y - target.y);
    const d0 = screenToRay(p0x, p0y, zoomRef.current);

    // In Weltkoordinaten einfrieren – ab jetzt bleibt der Ring an diesem Weltpunkt.
    const e = latestEuler.current;
    const R0 = e ? attitudeMatrix(e.a, e.b, e.g) : ([1, 0, 0, 0, 1, 0, 0, 0, 1] as Mat3);
    worldRay.current = apply(R0, d0);

    // Filter auf den neuen Startpunkt zurücksetzen (kein Nachgleiten vom alten Ziel).
    chX.current = newChannel();
    chY.current = newChannel();
    lastT.current = 0;

    setAim({ active: true, gx: clamp(p0x), gy: clamp(p0y), locked: false });
  }, []);

  const clear = useCallback(() => {
    worldRay.current = null;
    chX.current = newChannel();
    chY.current = newChannel();
    setAim(INACTIVE);
  }, []);

  return { aim, setTarget, clear };
}
