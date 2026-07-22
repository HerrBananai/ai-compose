import React, { useEffect, useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, StyleSheet, View } from 'react-native';

import { theme } from '../theme';
import type { Aim } from '../lib/useAimGuide';

interface Props {
  aim: Aim;
  enabled: boolean;
}

const RING = 44; // Durchmesser des welt-verankerten Ziel-Rings (klein = präzise)
const CROSS = 30; // Größe des festen Fadenkreuzes in der Mitte

/**
 * Overlay nach „AI Compose":
 *  - Festes weißes Fadenkreuz in der Bildmitte (bewegt sich nie).
 *  - Grüner Ziel-Ring, der über die Gyroskop-Verankerung an der Szene klebt und
 *    beim Schwenken mitwandert (Position kommt aus useAimGuide).
 *  - Pfeil vom Ring zur Mitte als Dreh-Hinweis.
 *  - Liegt der Ring unter dem Fadenkreuz, rastet er grün ein (pulsiert).
 */
export function CompositionOverlay({ aim, enabled }: Props) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ w: width, h: height });
  };

  if (!enabled || !aim.active || size.w === 0) {
    return <View style={StyleSheet.absoluteFill} onLayout={onLayout} pointerEvents="none" />;
  }

  const { w, h } = size;
  const cx = w / 2;
  const cy = h / 2;

  // Ring am Anker; für die Darstellung sanft an den Bildrand klemmen, damit er
  // sichtbar bleibt, wenn er (noch) weit außerhalb liegt.
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  const rx = clamp(aim.gx, 0.04, 0.96) * w;
  const ry = clamp(aim.gy, 0.04, 0.96) * h;

  const ringColor = aim.locked ? theme.colors.ringLocked : theme.colors.accent2;

  // Pfeil vom Ring zur Bildmitte (Dreh-Hinweis).
  const dx = cx - rx;
  const dy = cy - ry;
  const dist = Math.hypot(dx, dy);
  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
  const showArrow = !aim.locked && dist > RING / 2 + 10;
  const arrowLen = Math.max(0, dist - RING / 2 - 10);
  const midX = (rx + cx) / 2;
  const midY = (ry + cy) / 2;

  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.5] });

  return (
    <View style={StyleSheet.absoluteFill} onLayout={onLayout} pointerEvents="none">
      {/* Drittel-Raster als dezente Rahmungshilfe */}
      <View style={[styles.vline, { left: w / 3 }]} />
      <View style={[styles.vline, { left: (2 * w) / 3 }]} />
      <View style={[styles.hline, { top: h / 3 }]} />
      <View style={[styles.hline, { top: (2 * h) / 3 }]} />

      {/* Dreh-Hinweis-Pfeil vom Ring zur Mitte */}
      {showArrow ? (
        <View
          style={[
            styles.arrowWrap,
            {
              left: midX - arrowLen / 2,
              top: midY - 1,
              width: arrowLen,
              transform: [{ rotate: `${angleDeg}deg` }],
            },
          ]}
        >
          <View style={styles.arrowLine} />
          <View style={styles.arrowHead} />
        </View>
      ) : null}

      {/* Grüner welt-verankerter Ziel-Ring */}
      <Animated.View
        style={[
          styles.ring,
          {
            left: rx - RING / 2,
            top: ry - RING / 2,
            borderColor: ringColor,
            opacity: aim.locked ? pulseOpacity : 1,
            transform: [{ scale: aim.locked ? pulseScale : 1 }],
          },
        ]}
      />

      {/* Festes Fadenkreuz in der Bildmitte (bewegt sich nie) */}
      <View style={[styles.cross, { left: cx - CROSS / 2, top: cy - CROSS / 2 }]}>
        <View style={styles.crossH} />
        <View style={styles.crossV} />
        <View style={styles.crossDot} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  vline: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  hline: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  ring: {
    position: 'absolute',
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    borderWidth: 3,
  },
  cross: {
    position: 'absolute',
    width: CROSS,
    height: CROSS,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crossH: {
    position: 'absolute',
    width: CROSS,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  crossV: {
    position: 'absolute',
    width: 2,
    height: CROSS,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  crossDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  arrowWrap: {
    position: 'absolute',
    height: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  arrowLine: {
    flex: 1,
    height: 2,
    borderRadius: 1,
    backgroundColor: theme.colors.accent2,
  },
  arrowHead: {
    width: 0,
    height: 0,
    borderTopWidth: 5,
    borderBottomWidth: 5,
    borderLeftWidth: 8,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: theme.colors.accent2,
  },
});
