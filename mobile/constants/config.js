import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getBaseUrl = () => {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location) {
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:5000/api';
      }
      return `${window.location.origin}/api`;
    }
    return 'http://localhost:5000/api';
  }

  // Support explicit environment variable for production builds (EAS Build / APK / Web)
  const envUrl = process.env.EXPO_PUBLIC_API_URL || Constants.expoConfig?.extra?.apiUrl;
  if (envUrl && !envUrl.includes('loca.lt')) {
    return envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`;
  }

  const hostUri = Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    return `http://${ip}:5000/api`;
  }
  return 'https://vibestream-api-iet5.onrender.com/api';
};

// Base API URL — auto-detects host machine IP for Expo Go, localhost for web
export const API_BASE_URL = getBaseUrl();

// Storage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'vibestream_auth_token',
  USER: 'vibestream_user',
  SEARCH_HISTORY: 'vibestream_search_history',
  SETTINGS: 'vibestream_settings',
  SLEEP_TIMER: 'vibestream_sleep_timer',
  EQ_PRESET: 'vibestream_eq_preset',
};

// Pagination
export const DEFAULT_PAGE_SIZE = 20;

// Player
export const REPEAT_MODES = {
  OFF: 'off',
  ONE: 'one',
  ALL: 'all',
};

// Sleep timer options (in minutes; 0 = off)
export const SLEEP_TIMER_OPTIONS = [0, 5, 10, 15, 30, 45, 60, 90];

// EQ Presets
export const EQ_PRESETS = {
  flat: { name: 'Flat', bass: 0, mid: 0, treble: 0 },
  bass_boost: { name: 'Bass Boost', bass: 6, mid: 0, treble: 0 },
  treble_boost: { name: 'Treble Boost', bass: 0, mid: 0, treble: 6 },
  vocal: { name: 'Vocal', bass: -2, mid: 4, treble: 2 },
  rock: { name: 'Rock', bass: 4, mid: -1, treble: 4 },
  jazz: { name: 'Jazz', bass: 3, mid: 0, treble: -2 },
  electronic: { name: 'Electronic', bass: 5, mid: -2, treble: 4 },
  classical: { name: 'Classical', bass: 0, mid: 2, treble: 4 },
};

// Audio quality presets
export const AUDIO_QUALITY = {
  low: { name: 'Low (64kbps)', bitrate: 64 },
  medium: { name: 'Medium (128kbps)', bitrate: 128 },
  high: { name: 'High (192kbps)', bitrate: 192 },
};

export const APP_NAME = 'VibeStream';
export const APP_TAGLINE = 'Find your sound. Play it your way.';

// Source display names
export const SOURCE_LABELS = {
  jamendo: 'Jamendo',
  musopen: 'Musopen',
  fma: 'Free Music Archive',
};
