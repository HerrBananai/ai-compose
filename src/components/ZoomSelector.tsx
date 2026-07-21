import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '../theme';
import { ZoomLevel } from '../lib/types';

interface Props {
  levels: ZoomLevel[];
  active: ZoomLevel;
  onChange: (level: ZoomLevel) => void;
}

/** Glasiger Zoom-Umschalter .5x / 1x / 2x / 5x über den nativen Objektiven. */
export function ZoomSelector({ levels, active, onChange }: Props) {
  return (
    <View style={styles.wrap}>
      {levels.map((level) => {
        const isActive = level === active;
        return (
          <Pressable
            key={level}
            onPress={() => onChange(level)}
            hitSlop={6}
            style={[styles.item, isActive && styles.itemActive]}
          >
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {isActive ? level : level.replace('x', '')}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: theme.colors.glass,
    borderRadius: theme.radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.stroke,
    padding: 4,
    gap: 4,
  },
  item: {
    minWidth: 36,
    height: 36,
    paddingHorizontal: 10,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemActive: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.accent,
  },
  label: {
    color: theme.colors.textDim,
    fontSize: theme.font.small,
    fontWeight: '600',
  },
  labelActive: {
    color: theme.colors.accent2,
    fontSize: theme.font.label,
    fontWeight: '700',
  },
});
