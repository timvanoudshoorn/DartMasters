import { COLORS, FONT, RADIUS } from './colors';

export * from './motion';

export const colors = {
  bg: COLORS.bg,
  bgDeep: COLORS.bg,
  bgSurface: COLORS.surface,
  bgElevated: COLORS.card,
  bgCard: COLORS.card,
  bgCardAlt: COLORS.card2,
  bgRaised: COLORS.raised,
  border: COLORS.border,
  borderLight: COLORS.borderStrong,
  edge: COLORS.edge,

  primary: COLORS.accent,
  primaryHot: COLORS.accentHot,
  primaryDark: COLORS.accentDeep,
  secondary: COLORS.textSub,
  accent: COLORS.accent,
  gold: COLORS.accentHot,
  danger: COLORS.bust,
  warning: COLORS.textSub,
  success: COLORS.positive,

  neonGreen: COLORS.positive,
  neonCyan: COLORS.textSub,
  neonRed: COLORS.bust,

  textPrimary: COLORS.text,
  textSecondary: COLORS.textSub,
  textMuted: COLORS.textSub,
  textFaint: COLORS.textFaint,
  textDim: COLORS.textDim,

  double: COLORS.accentHot,
  triple: COLORS.accentHot,
  bull: COLORS.accentHot,

  playerPalette: [
    '#C1A536',
    '#4C9AFF',
    '#4CAF50',
    '#9B6BFF',
    '#E0729A',
    '#5BC8C8',
    '#D4825B',
    '#7C8CF8',
  ],
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: RADIUS.sm,
  md: RADIUS.md,
  lg: RADIUS.lg,
  xl: RADIUS.xl,
  full: RADIUS.pill,
};

export const fonts = {
  display: FONT.score,
  body: FONT.regular,
  bodyMedium: FONT.medium,
  bodySemibold: FONT.semibold,
  bodyBold: FONT.ui,
  bodyExtraBold: FONT.uiHeavy,
};

export const typography = {
  huge: { fontFamily: fonts.display, fontSize: 92, letterSpacing: -1 },
  display: { fontFamily: fonts.display, fontSize: 54, letterSpacing: -0.5 },
  title: { fontFamily: fonts.bodyExtraBold, fontSize: 24, letterSpacing: -0.4 },
  heading: { fontFamily: fonts.bodyBold, fontSize: 18, letterSpacing: -0.2 },
  body: { fontFamily: fonts.bodyMedium, fontSize: 15 },
  caption: { fontFamily: fonts.bodySemibold, fontSize: 13 },
  tiny: { fontFamily: fonts.bodyBold, fontSize: 11 },
  // Letterspaced label above content — the app's signature section marker.
  overline: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
  },
};

// Depth without glow: black shadows only, iOS only.
// elevation is intentionally omitted everywhere: Android elevation changes
// z-order stacking which can intercept touch events on siblings rendered
// later in the tree. Android depth reads from the elevation ladder + edges.
export const shadow = {
  /** Resting cards and tiles. */
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  /** Floating layers — sheets, overlays, the win trophy. */
  deep: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
  },
  /** Tight contact shadow for keys/buttons — reads as physical travel. */
  key: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.45,
    shadowRadius: 3,
  },
};

export const playerColor = (index: number) =>
  colors.playerPalette[index % colors.playerPalette.length];
