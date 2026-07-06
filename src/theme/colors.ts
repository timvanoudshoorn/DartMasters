// ── Charcoal & Ember ────────────────────────────────────────────────────────
// Depth comes from the elevation ladder (bg → surface → card → card2 → raised)
// plus 1px top-edge highlights and soft black shadows — never gradients, never
// glow. The ember accent (#C13620) is reserved for fills and large shapes;
// small text and icons use the "heated" variant for legibility on charcoal.
export const COLORS = {
  // Elevation ladder (warm charcoal, lightening as surfaces rise)
  bg: '#0C0B0A',
  surface: '#131211',
  card: '#181716',
  card2: '#1E1D1B',
  raised: '#252422',

  // Hairlines. `edge` is the top-edge highlight that makes surfaces read as
  // lit from above — apply as borderTopColor on raised elements.
  border: 'rgba(255,255,255,0.06)',
  borderStrong: 'rgba(255,255,255,0.13)',
  edge: 'rgba(255,255,255,0.08)',

  // Ember accent family — #C13620 is the brand; hot is for small text/icons.
  accent: '#C13620',
  accentHot: '#E85C3F',
  accentDeep: '#8E2716',
  accentDim: 'rgba(193,54,32,0.13)',
  accentBorder: 'rgba(193,54,32,0.45)',
  accentGlow: 'rgba(193,54,32,0.16)',

  // Warm neutrals — pure white is reserved for scores.
  text: '#F4F1EE',
  textSub: '#928E88',
  textFaint: '#5B5852',
  textDim: '#34322E',

  positive: '#57A05F',
  positiveGlow: 'rgba(87,160,95,0.14)',
  positiveBorder: 'rgba(87,160,95,0.4)',

  bust: '#D93A2E',
  bustGlow: 'rgba(217,58,46,0.13)',
  bustBorder: 'rgba(217,58,46,0.5)',
};

export const RADIUS = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
};

export const FONT = {
  score: 'BebasNeue_400Regular',
  ui: 'Inter_700Bold',
  uiHeavy: 'Inter_800ExtraBold',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  regular: 'Inter_400Regular',
};
