import { useCallback, useEffect, useRef, useState } from 'react';
import { DeviceMotion } from 'expo-sensors';

import { FocalPoint } from './types';

/**
 * Welt-verankerter Zielpunkt fürs Reframing.
 *
 * Idee: Beim Antippen von „AI Compose" liefert Gemini die aktuelle Motiv-Position
 * (focal) und den Ziel-Drittel-Punkt (target). Wir setzen einen grünen Anker auf
 * die Bildoberfläche an die Position P0 = Mitte + (focal - target). Dreht man das
 * Handy, wandert der Anker über die Gyroskop-Winkeländerung mit – als wäre er an
 * der Szene fixiert. Bringt man ihn unter das feste Fadenkreuz (Bildmitte), sitzt
 * das Motiv exakt auf dem Ziel-Drittel-Punkt.
 *
 * Die Skalen (Screen-Anteil pro Radiant) sind grobe FOV-Schätzungen und lassen
 * sich bei Bedarf feintunen; die Vorzeichen richten die Bewegungsrichtung aus.
 */
const H_SCALE = 1 / ((58 * Math.PI) / 180); // horizontale Screen-Fraktion pro rad
const V_SCALE = 1 / ((44 * Math.PI) / 180); // vertikale Screen-Fraktion pro rad
const SIGN_X = -1;
const SIGN_Y = 1;
const LOCK_DIST = 0.06; // eingerastet, wenn Anker so nah an der Mitte ist

export interface Aim {
  active: boolean;
  /** Grüner Anker, normalisiert (0..1). */
  gx: number;
  gy: number;
  /** Anker liegt unter dem Fadenkreuz. */
  locked: boolean;
}

interface Anchor {
  p0x: number;
  p0y: number;
  yaw0: number;
  pitch0: number;
}

const INACTIVE: Aim = { active: false, gx: 0.5, gy: 0.5, locked: false };

/** Winkeldifferenz auf (-π, π] normalisieren (Wraparound). */
function wrapAngle(a: number): number {
  let x = a;
  while (x > Math.PI) x -= 2 * Math.PI;
  while (x < -Math.PI) x += 2 * Math.PI;
  return x;
}

export function useAimGuide(): {
  aim: Aim;
  setTarget: (focal: FocalPoint, target: FocalPoint) => void;
  clear: () => void;
} {
  const anchor = useRef<Anchor | null>(null);
  const latest = useRef<{ yaw: number; pitch: number } | null>(null);
  const [aim, setAim] = useState<Aim>(INACTIVE);

  useEffect(() => {
    DeviceMotion.setUpdateInterval(50);
    const sub = DeviceMotion.addListener((data) => {
      const r = data.rotation;
      if (!r) return;
      latest.current = { yaw: r.alpha, pitch: r.beta };

      const a = anchor.current;
      if (!a) return;
      const dyaw = wrapAngle(r.alpha - a.yaw0);
      const dpitch = wrapAngle(r.beta - a.pitch0);
      const gx = a.p0x + SIGN_X * dyaw * H_SCALE;
      const gy = a.p0y + SIGN_Y * dpitch * V_SCALE;
      const locked = Math.hypot(gx - 0.5, gy - 0.5) < LOCK_DIST;
      setAim({ active: true, gx, gy, locked });
    });
    return () => sub.remove();
  }, []);

  const setTarget = useCallback((focal: FocalPoint, target: FocalPoint) => {
    const base = latest.current ?? { yaw: 0, pitch: 0 };
    const p0x = 0.5 + (focal.x - target.x);
    const p0y = 0.5 + (focal.y - target.y);
    anchor.current = { p0x, p0y, yaw0: base.yaw, pitch0: base.pitch };
    setAim({ active: true, gx: p0x, gy: p0y, locked: false });
  }, []);

  const clear = useCallback(() => {
    anchor.current = null;
    setAim(INACTIVE);
  }, []);

  return { aim, setTarget, clear };
}
