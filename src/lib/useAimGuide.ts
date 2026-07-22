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

// Empirische Verstärkung: Screen-Anteil pro integrierter Roheinheit. Wird nach
// Gerätetest justiert (Vorzeichen = Bewegungsrichtung, Betrag = Tempo).
const GAIN_X = 0.75;
const GAIN_Y = 1.1;
const SIGN_X = -1; // Schwenk nach rechts -> Anker nach links
const SIGN_Y = 1; // Kippen nach oben -> Anker nach unten
const DEADZONE = 0.015; // Roh-Drehraten darunter werden ignoriert (Anti-Drift)
const LOCK_DIST = 0.05; // eingerastet, wenn Anker so nah an der Mitte ist

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
        accYaw.current += deadzone(rr.gamma) * dt;
        accPitch.current += deadzone(rr.beta) * dt;
      }

      const anchor = p0.current;
      if (!anchor) return;
      const gx = anchor.x + SIGN_X * accYaw.current * GAIN_X;
      const gy = anchor.y + SIGN_Y * accPitch.current * GAIN_Y;
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
