import { useCallback, useEffect, useRef, useState } from 'react';
import { DeviceMotion } from 'expo-sensors';

import { FocalPoint } from './types';

/**
 * Welt-verankerter Zielpunkt fürs Reframing.
 *
 * Beim „AI Compose" liefert Gemini Motiv-Position (focal) + Ziel-Drittel-Punkt
 * (target). Wir setzen einen grünen Anker auf P0 = Mitte + (focal - target).
 * Dreht/kippt man das Handy, integrieren wir die Drehraten (Gyroskop) seit dem
 * Compose und schieben den Anker entsprechend über den Screen – als klebe er an
 * der Szene. Liegt er unter dem festen Fadenkreuz, sitzt das Motiv auf dem Ziel.
 *
 * Bewusst NICHT über Euler-Attitude: die koppelt Kipp-/Dreh-/Rollachse und lässt
 * den Punkt bei senkrechter Neigung „im Kreis" wandern. Drehraten-Integration
 * um genau zwei Achsen (Kippen = beta, Schwenken = gamma; Rollen = alpha ignoriert)
 * ist sauber. Eine Totzone verhindert das Wegdriften im Stillstand.
 */

// WICHTIG: DeviceMotion.rotationRate kommt in GRAD/Sekunde, nicht rad/s. Roh
// integriert (× GAIN) fliegt der Anker sofort aus dem Bild. Wir rechnen die
// Rate deshalb erst nach Radiant um; danach ist GAIN physikalisch ~ 1/Blickwinkel
// (rad): Anker wandert szene-verankert. GAIN = Feintuning für Tempo/FOV,
// SIGN = Bewegungsrichtung – beides am Gerät justieren.
const DEG2RAD = Math.PI / 180;
const GAIN_X = 0.75;
const GAIN_Y = 1.1;
const SIGN_X = -1; // Schwenk nach rechts -> Anker nach links
const SIGN_Y = 1; // Kippen nach oben -> Anker nach unten
const DEADZONE = 0.015; // rad/s (~0.86°/s): darunter ignorieren -> Anti-Drift im Stillstand
const LOCK_DIST = 0.05; // eingerastet, wenn Anker so nah an der Mitte ist
// Anker darf den Rand als Hinweis verlassen, aber nicht ins Unendliche driften.
const CLAMP_MIN = -0.5;
const CLAMP_MAX = 1.5;

function clamp(v: number): number {
  return v < CLAMP_MIN ? CLAMP_MIN : v > CLAMP_MAX ? CLAMP_MAX : v;
}

export interface Aim {
  active: boolean;
  /** Grüner Anker, normalisiert (0..1). */
  gx: number;
  gy: number;
  /** Anker liegt unter dem Fadenkreuz. */
  locked: boolean;
}

const INACTIVE: Aim = { active: false, gx: 0.5, gy: 0.5, locked: false };

function deadzone(v: number): number {
  return Math.abs(v) < DEADZONE ? 0 : v;
}

export function useAimGuide(): {
  aim: Aim;
  setTarget: (focal: FocalPoint, target: FocalPoint) => void;
  clear: () => void;
} {
  const p0 = useRef<{ x: number; y: number } | null>(null);
  const accYaw = useRef(0); // integriertes Schwenken (gamma)
  const accPitch = useRef(0); // integriertes Kippen (beta)
  const lastT = useRef<number | null>(null);
  const [aim, setAim] = useState<Aim>(INACTIVE);

  useEffect(() => {
    DeviceMotion.setUpdateInterval(33);
    const sub = DeviceMotion.addListener((data) => {
      const now = Date.now();
      const dt = lastT.current ? (now - lastT.current) / 1000 : 0;
      lastT.current = now;

      const rr = data.rotationRate;
      if (rr && dt > 0 && dt < 0.5) {
        // Grad/s -> rad/s, dann Totzone, dann integrieren.
        accYaw.current += deadzone(rr.gamma * DEG2RAD) * dt;
        accPitch.current += deadzone(rr.beta * DEG2RAD) * dt;
      }

      const anchor = p0.current;
      if (!anchor) return;
      const gx = clamp(anchor.x + SIGN_X * accYaw.current * GAIN_X);
      const gy = clamp(anchor.y + SIGN_Y * accPitch.current * GAIN_Y);
      const locked = Math.hypot(gx - 0.5, gy - 0.5) < LOCK_DIST;
      setAim({ active: true, gx, gy, locked });
    });
    return () => sub.remove();
  }, []);

  const setTarget = useCallback((focal: FocalPoint, target: FocalPoint) => {
    accYaw.current = 0;
    accPitch.current = 0;
    const x = 0.5 + (focal.x - target.x);
    const y = 0.5 + (focal.y - target.y);
    p0.current = { x, y };
    setAim({ active: true, gx: x, gy: y, locked: false });
  }, []);

  const clear = useCallback(() => {
    p0.current = null;
    setAim(INACTIVE);
  }, []);

  return { aim, setTarget, clear };
}
