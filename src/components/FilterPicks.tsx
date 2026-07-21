import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { theme } from '../theme';
import { FilterPreset } from '../lib/types';

interface Props {
  picks: FilterPreset[];
  selectedName: string | null; // null = Original
  onSelect: (preset: FilterPreset | null) => void;
}

/** hsl -> rgb Hilfsfunktion für die Swatch-Farbe. */
function hslToRgb(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = ((h % 360) + 360) % 360 / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = l - c / 2;
  const to = (v: number) => Math.round((v + m) * 255);
  return `rgb(${to(r)},${to(g)},${to(b)})`;
}

/** Repräsentative Swatch-Farbe aus den Filter-Parametern ableiten. */
function swatchColor(p: FilterPreset): string {
  const hue = 34 + p.hueRotate + p.sepia * 10; // warme Basis, per hue/sepia verschoben
  const sat = Math.min(0.85, Math.max(0.15, (p.saturate - 0.6) * 0.7 + p.sepia));
  const light = Math.min(0.72, Math.max(0.32, 0.5 * p.brightness));
  return hslToRgb(hue, sat, light);
}

/** "AI Filter Picks": horizontale Preset-Thumbnails; tippen = anwenden. */
export function FilterPicks({ picks, selectedName, onSelect }: Props) {
  const originalActive = selectedName === null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {/* Original (kein Filter) */}
      <Pressable onPress={() => onSelect(null)} style={styles.tile}>
        <View
          style={[
            styles.swatch,
            { backgroundColor: '#8A8A8A' },
            originalActive && styles.swatchActive,
          ]}
        >
          <Text style={styles.swatchGlyph}>⦸</Text>
        </View>
        <Text style={[styles.name, originalActive && styles.nameActive]} numberOfLines={1}>
          Original
        </Text>
      </Pressable>

      {picks.map((p, idx) => {
        const active = selectedName === p.name;
        return (
          <Pressable key={`${p.name}-${idx}`} onPress={() => onSelect(p)} style={styles.tile}>
            <View
              style={[
                styles.swatch,
                { backgroundColor: swatchColor(p) },
                active && styles.swatchActive,
              ]}
            />
            <Text style={[styles.name, active && styles.nameActive]} numberOfLines={1}>
              {p.name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 16,
    gap: 12,
    alignItems: 'flex-start',
  },
  tile: {
    alignItems: 'center',
    width: 64,
  },
  swatch: {
    width: 56,
    height: 56,
    borderRadius: theme.radius.md,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchActive: {
    borderColor: theme.colors.accent2,
  },
  swatchGlyph: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 22,
  },
  name: {
    marginTop: 5,
    color: theme.colors.textDim,
    fontSize: theme.font.small,
    fontWeight: '600',
    maxWidth: 64,
    textAlign: 'center',
  },
  nameActive: {
    color: theme.colors.text,
  },
});
