// VibeStream Design System — Enhanced Colors
export const Colors = {
  // Primary brand palette — vibrant indigo/violet
  primary: '#6C63FF',         // Vivid indigo
  primaryLight: '#8B85FF',
  primaryDark: '#4F46E5',
  accent: '#FF6B9D',          // Pink accent
  accentGlow: '#FF8DC7',
  teal: '#00D4D4',            // Teal highlight
  tealDark: '#00A8A8',

  // Backgrounds — deep dark with subtle purple tint
  bg: '#0A0A12',              // Near-black
  bgCard: '#13131F',          // Card surface
  bgElevated: '#1C1C2E',      // Elevated surface
  bgInput: '#1A1A2A',         // Input fields
  bgModal: '#0D0D1C',
  bgGlass: 'rgba(108,99,255,0.08)',   // Glassmorphism
  bgGlassStrong: 'rgba(108,99,255,0.15)',

  // Text
  textPrimary: '#F0F0FF',
  textSecondary: '#9B9BC4',
  textMuted: '#5A5A7A',
  textInverse: '#0A0A12',

  // Gradient stops
  gradientStart: '#0A0A12',
  gradientMid: '#150A2E',
  gradientEnd: '#0A0A12',
  gradientPrimary: ['#4F46E5', '#6C63FF', '#FF6B9D'],
  gradientCool: ['#0A0A12', '#13131F'],
  gradientPlayer: ['#1A0A3E', '#0A0A12', '#0A0A12'],

  // Semantic
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // Source badges
  sourcJamendo: '#00C9A7',
  sourceMusopen: '#8B5CF6',
  sourceFMA: '#F59E0B',

  // Misc
  border: '#1E1E35',
  borderLight: '#2A2A45',
  borderGlow: 'rgba(108,99,255,0.3)',
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',

  // Mini player
  miniPlayerBg: 'rgba(13,13,28,0.98)',

  // Overlay
  overlay: 'rgba(0,0,0,0.85)',
  overlayLight: 'rgba(0,0,0,0.5)',
};

// Typography
export const Typography = {
  fontFamily: {
    regular: 'Poppins_400Regular',
    medium: 'Poppins_500Medium',
    semibold: 'Poppins_600SemiBold',
    bold: 'Poppins_700Bold',
  },
  fontSize: {
    xs: 10,
    sm: 12,
    base: 14,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 32,
    '5xl': 40,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.8,
  },
};

// Spacing scale
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
};

// Border radii
export const Radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  '2xl': 28,
  full: 999,
};

// Shadows with purple glow
export const Shadow = {
  sm: {
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  md: {
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  lg: {
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 16,
  },
  accent: {
    shadowColor: '#FF6B9D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
};

export const BOTTOM_TAB_HEIGHT = 72;
export const MINI_PLAYER_HEIGHT = 76;
