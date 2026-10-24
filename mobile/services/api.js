import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, STORAGE_KEYS } from '../constants/config';

// ─── Token helpers ────────────────────────────────────────────────────────────

export const getToken = async () => {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  } catch {
    return null;
  }
};

export const setToken = async (token) => {
  await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
};

export const removeToken = async () => {
  await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
  await AsyncStorage.removeItem(STORAGE_KEYS.USER);
};

// ─── Fetch wrapper ────────────────────────────────────────────────────────────

const apiFetch = async (endpoint, options = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const token = await getToken();
    const headers = {
      'Content-Type': 'application/json',
      'Bypass-Tunnel-Reminder': 'true',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const contentType = response.headers.get('content-type') || '';
    let data;
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch {
        if (!response.ok) {
          throw new Error(`Server returned status ${response.status}. Please check backend.`);
        }
        data = { message: text };
      }
    }

    if (!response.ok) {
      throw new Error(data.message || `HTTP ${response.status}`);
    }

    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Connection timed out. Cannot reach backend at ${API_BASE_URL}. Make sure your phone is connected to the same Wi-Fi.`);
    }
    if (error.message === 'Network request failed' || error.name === 'TypeError') {
      throw new Error(`Cannot connect to server at ${API_BASE_URL}. Ensure your phone is on the same Wi-Fi as your computer.`);
    }
    throw error;
  }
};

// ─── Auth API ─────────────────────────────────────────────────────────────────

export const authAPI = {
  register: (body) => apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  getMe: () => apiFetch('/auth/me'),
  updateProfile: (body) => apiFetch('/auth/profile', { method: 'PUT', body: JSON.stringify(body) }),
  changePassword: (body) => apiFetch('/auth/change-password', { method: 'PUT', body: JSON.stringify(body) }),
};

// ─── Music API ────────────────────────────────────────────────────────────────

export const musicAPI = {
  search: (q, type = 'tracks', limit = 20, page = 1, language = 'all', source = 'all') =>
    apiFetch(`/music/search?q=${encodeURIComponent(q)}&type=${type}&limit=${limit}&page=${page}&language=${encodeURIComponent(language)}&source=${encodeURIComponent(source)}`),
  getTrending: (limit = 20, language = 'all') =>
    apiFetch(`/music/trending?limit=${limit}&language=${encodeURIComponent(language)}`),
  getNewReleases: (limit = 20, language = 'all') =>
    apiFetch(`/music/new-releases?limit=${limit}&language=${encodeURIComponent(language)}`),
  getCharts: (language = 'all') =>
    apiFetch(`/music/charts?language=${encodeURIComponent(language)}`),
  getAllLanguages: (era = 'all') =>
    apiFetch(`/music/languages?era=${encodeURIComponent(era)}`),
  resolveLink: (url) =>
    apiFetch(`/music/resolve-link?url=${encodeURIComponent(url)}`),
  getGenres: () => apiFetch('/music/genres'),
  getGenreTracks: (genreId, limit = 20) => apiFetch(`/music/genres/${genreId}/tracks?limit=${limit}`),
  getPopularArtists: (limit = 12) => apiFetch(`/music/artists?limit=${limit}`),
  getTrack: (id) => apiFetch(`/music/tracks/${id}`),
  getAlbum: (id) => apiFetch(`/music/albums/${id}`),
  getArtist: (id) => apiFetch(`/music/artists/${id}`),
  getLyrics: ({ title, artist, album, duration }) => {
    const params = new URLSearchParams();
    if (title) params.append('title', title);
    if (artist) params.append('artist', artist);
    if (album) params.append('album', album);
    if (duration) params.append('duration', Math.round(duration / 1000));
    return apiFetch(`/music/lyrics?${params.toString()}`);
  },
};


// ─── Playlists API ────────────────────────────────────────────────────────────

export const playlistAPI = {
  getAll: () => apiFetch('/playlists'),
  create: (body) => apiFetch('/playlists', { method: 'POST', body: JSON.stringify(body) }),
  getOne: (id) => apiFetch(`/playlists/${id}`),
  update: (id, body) => apiFetch(`/playlists/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id) => apiFetch(`/playlists/${id}`, { method: 'DELETE' }),
  addTrack: (id, track) => apiFetch(`/playlists/${id}/tracks`, { method: 'POST', body: JSON.stringify(track) }),
  removeTrack: (id, trackId) => apiFetch(`/playlists/${id}/tracks/${trackId}`, { method: 'DELETE' }),
};

// ─── Favorites API ────────────────────────────────────────────────────────────

export const favoritesAPI = {
  getAll: () => apiFetch('/favorites'),
  add: (track) => apiFetch('/favorites', { method: 'POST', body: JSON.stringify(track) }),
  remove: (trackId) => apiFetch(`/favorites/${trackId}`, { method: 'DELETE' }),
  check: (trackId) => apiFetch(`/favorites/${trackId}/check`),
};

// ─── History API ──────────────────────────────────────────────────────────────

export const historyAPI = {
  getAll: (limit = 50) => apiFetch(`/history?limit=${limit}`),
  add: (track) => apiFetch('/history', { method: 'POST', body: JSON.stringify(track) }),
  clear: () => apiFetch('/history', { method: 'DELETE' }),
};
