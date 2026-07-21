/**
 * Zentrale Design-Tokens. Dark UI mit violett/grün Akzent,
 * glasige Overlays über dem Kamera-Feed.
 */
export const theme = {
  colors: {
    bg: '#0B0B10',
    glass: 'rgba(18,18,26,0.55)',
    glassStrong: 'rgba(12,12,18,0.85)',
    stroke: 'rgba(255,255,255,0.12)',
    text: '#F5F5FA',
    textDim: 'rgba(245,245,250,0.6)',
    accent: '#8B5CF6', // violett
    accent2: '#34D399', // grün
    ring: '#8B5CF6',
    ringLocked: '#34D399',
    danger: '#F87171',
    warning: '#FBBF24',
    shutterRing: 'rgba(255,255,255,0.9)',
  },
  radius: {
    sm: 10,
    md: 16,
    lg: 24,
    pill: 999,
  },
  space: (n: number) => n * 4,
  font: {
    pill: 15,
    label: 13,
    small: 11,
    title: 20,
  },
} as const;

export type Theme = typeof theme;
