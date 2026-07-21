import React, { useEffect, useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, StyleSheet, View } from 'react-native';
import type { ISharedValue } from 'react-native-worklets-core';

import { theme } from '../theme';
import { Guidance, INITIAL_GUIDANCE } from '../lib/types';

interface Props {
  guidance: ISharedValue<Guidance>;
  enabled: boolean;
}

const RING = 84; // Durchmesser des Motiv-Rings
const TARGET = 30; // Durchmesser des Ziel-Markers

/**
 * Zeichnet das Echtzeit-Overlay: Drittel-Raster, Ziel-Marker am nächsten
 * Schnittpunkt, farbigen Motiv-Ring + Fadenkreuz und einen Pfeil, der zum
 * idealen Bildausschnitt führt. Liest die vom Frame-Processor geschriebene
 * Shared Value per Poll (kein State im Worklet-Pfad).
 */
export function CompositionOverlay({ guidance, enabled }: Props) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [g, setG] = useState<Guidance>(INITIAL_GUIDANCE);
  const pulse = useRef(new Animated.Value(0)).current;

  // Ziel-Marker pulsieren lassen.
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  // Shared Value pollen, solange aktiv.
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      setG({ ...guidance.value });
    }, 60);
    return () => clearInterval(id);
  }, [enabled, guidance]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ w: width, h: height });
  };

  if (!enabled || size.w === 0) {
    return <View style={StyleSheet.absoluteFill} onLayout={onLayout} pointerEvents="none" />;
  }

  const { w, h } = size;
  const fpx = g.fx * w;
  const fpy = g.fy * h;
  const tpx = g.tx * w;
  const tpy = g.ty * h;

  const ringColor = g.locked ? theme.colors.ringLocked : theme.colors.ring;

  // Pfeil vom Motiv zum Ziel.
  const dx = tpx - fpx;
  const dy = tpy - fpy;
  const dist = Math.hypot(dx, dy);
  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
  const showArrow = g.active && !g.locked && dist > RING / 2 + 6;
  const arrowLen = Math.max(0, dist - RING / 2 - TARGET / 2);
  const midX = (fpx + tpx) / 2;
  const midY = (fpy + tpy) / 2;

  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0.35] });

  return (
    <View style={StyleSheet.absoluteFill} onLayout={onLayout} pointerEvents="none">
      {/* Drittel-Raster */}
      <View style={[styles.vline, { left: w / 3 }]} />
      <View style={[styles.vline, { left: (2 * w) / 3 }]} />
      <View style={[styles.hline, { top: h / 3 }]} />
      <View style={[styles.hline, { top: (2 * h) / 3 }]} />

      {/* Ziel-Marker (nächster Drittel-Schnittpunkt) */}
      <Animated.View
        style={[
          styles.target,
          {
            left: tpx - TARGET / 2,
            top: tpy - TARGET / 2,
            opacity: pulseOpacity,
            transform: [{ scale: pulseScale }],
          },
        ]}
      />

      {/* Führungs-Pfeil */}
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

      {/* Motiv-Ring + Fadenkreuz */}
      <View
        style={[
          styles.ring,
          {
            left: fpx - RING / 2,
            top: fpy - RING / 2,
            borderColor: ringColor,
          },
        ]}
      >
        <View style={[styles.crossH, { backgroundColor: ringColor }]} />
        <View style={[styles.crossV, { backgroundColor: ringColor }]} />
        <View style={[styles.centerDot, { backgroundColor: ringColor }]} />
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
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  hline: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  target: {
    position: 'absolute',
    width: TARGET,
    height: TARGET,
    borderRadius: TARGET / 2,
    borderWidth: 2,
    borderColor: theme.colors.ringLocked,
  },
  ring: {
    position: 'absolute',
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crossH: {
    position: 'absolute',
    width: 22,
    height: 1.5,
  },
  crossV: {
    position: 'absolute',
    width: 1.5,
    height: 22,
  },
  centerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
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
