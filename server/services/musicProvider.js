/**
 * FreeBeat Music Provider — Musopen Integration
 *
 * Musopen provides public-domain classical music recordings.
 * All music is legally free to stream and use.
 * https://musopen.org/
 *
 * This abstraction layer keeps provider logic separate so it
 * can be swapped without touching any other application code.
 */

const axios = require('axios');

const MUSOPEN_BASE_URL = 'https://api.musopen.org';
const API_KEY = process.env.MUSOPEN_API_KEY;

const musopenClient = axios.create({
  baseURL: MUSOPEN_BASE_URL,
  ...(API_KEY ? { headers: { Authorization: `Token ${API_KEY}` } } : {}),
  timeout: 10000,
});

function hasApiKey() {
  if (API_KEY) return true;
  console.warn('Musopen is unavailable: configure MUSOPEN_API_KEY.');
  return false;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function normalizeTrack(recording) {
  return {
    id: `musopen-${recording.id}`,
    rawId: String(recording.id),
    title: recording.name || 'Untitled',
    artist: recording.composer
      ? recording.composer.complete_name || recording.composer.name
      : 'Unknown Artist',
    album: recording.album ? recording.album.name : null,
    duration: recording.duration || 0,
    artworkUrl: recording.cover_image || recording.album?.cover_image || null,
    streamUrl: recording.url || null,
    genre: 'Classical',
    year: recording.year || null,
    composer: recording.composer ? recording.composer.complete_name : null,
    performers: recording.performers || [],
    source: 'musopen',
    license: recording.license || recording.license_name || 'Check provider rights',
    licenseUrl: recording.license_url || recording.licenseUrl || null,
  };
}

function normalizeComposer(composer) {
  return {
    id: `musopen-artist-${composer.id}`,
    rawId: String(composer.id),
    name: composer.complete_name || composer.name,
    bio: composer.bio || '',
    imageUrl: composer.picture || null,
    era: composer.era || null,
    source: 'musopen',
  };
}

function normalizeAlbum(album) {
  return {
    id: `musopen-album-${album.id}`,
    rawId: String(album.id),
    name: album.name,
    artist: album.composer
      ? album.composer.complete_name || album.composer.name
      : 'Various Artists',
    artworkUrl: album.cover_image || null,
    year: album.year || null,
    source: 'musopen',
  };
}

function getResults(data) {
  if (Array.isArray(data?.results)) return data.results;
  return Array.isArray(data) ? data : [];
}

// ─── Provider Methods ────────────────────────────────────────────────────────

const MusicProvider = {
  /**
   * Search across recordings, composers, and albums.
   */
  async searchTracks(query, limit = 20, page = 1) {
    if (!hasApiKey()) return [];
    try {
      const response = await musopenClient.get('/v1/recordings', {
        params: { title: query, limit, page },
      });
      return getResults(response.data).map(normalizeTrack);
    } catch (err) {
      console.warn('Musopen track search error:', err.message);
      return [];
    }
  },

  async searchComposers(query, limit = 10) {
    if (!hasApiKey()) return [];
    try {
      const response = await musopenClient.get('/v1/composers', {
        params: { name: query, limit },
      });
      return getResults(response.data).map(normalizeComposer);
    } catch (err) {
      console.warn('Musopen composer search error:', err.message);
      return [];
    }
  },

  async searchAlbums(query, limit = 10) {
    if (!hasApiKey()) return [];
    try {
      const response = await musopenClient.get('/v1/albums', {
        params: { name: query, limit },
      });
      return getResults(response.data).map(normalizeAlbum);
    } catch (err) {
      console.warn('Musopen album search error:', err.message);
      return [];
    }
  },

  /**
   * Get a single track by ID.
   */
  async getTrack(id) {
    if (!hasApiKey()) return null;
    try {
      const rawId = String(id).replace(/^musopen-/, '');
      const response = await musopenClient.get(`/v1/recordings/${rawId}`);
      return response.data ? normalizeTrack(response.data) : null;
    } catch (err) {
      console.warn('Musopen track lookup error:', err.message);
      return null;
    }
  },

  /**
   * Get trending / featured recordings.
   */
  async getTrending(limit = 20) {
    if (!hasApiKey()) return [];
    try {
      const response = await musopenClient.get('/v1/recordings', {
        params: { limit, page: 1, sort: 'downloads' },
      });
      return getResults(response.data).map(normalizeTrack);
    } catch (err) {
      console.warn('Musopen trending error:', err.message);
      return [];
    }
  },

  /**
   * Get new releases (recently added recordings).
   */
  async getNewReleases(limit = 20) {
    if (!hasApiKey()) return [];
    try {
      const response = await musopenClient.get('/v1/recordings', {
        params: { limit, page: 1 },
      });
      return getResults(response.data).map(normalizeTrack);
    } catch (err) {
      console.warn('Musopen new releases error:', err.message);
      return [];
    }
  },

  /**
   * Get recordings by composer (artist page).
   */
  async getTracksByArtist(composerId, limit = 30) {
    if (!hasApiKey()) return [];
    try {
      const response = await musopenClient.get('/v1/recordings', {
        params: { composer: String(composerId).replace(/^musopen-artist-/, ''), limit },
      });
      return getResults(response.data).map(normalizeTrack);
    } catch (err) {
      console.warn('Musopen composer tracks error:', err.message);
      return [];
    }
  },

  /**
   * Get a composer (artist) by ID.
   */
  async getArtist(composerId) {
    if (!hasApiKey()) return null;
    try {
      const rawId = String(composerId).replace(/^musopen-artist-/, '');
      const response = await musopenClient.get(`/v1/composers/${rawId}`);
      return response.data ? normalizeComposer(response.data) : null;
    } catch (err) {
      console.warn('Musopen composer lookup error:', err.message);
      return null;
    }
  },

  /**
   * Get an album by ID.
   */
  async getAlbum(albumId) {
    if (!hasApiKey()) return null;
    try {
      const rawId = String(albumId).replace(/^musopen-album-/, '');
      const albumRes = await musopenClient.get(`/v1/albums/${rawId}`);
      const tracksRes = await musopenClient.get('/v1/recordings', {
        params: { album: rawId, limit: 50 },
      });
      const album = normalizeAlbum(albumRes.data);
      album.tracks = getResults(tracksRes.data).map(normalizeTrack);
      return album;
    } catch (err) {
      console.warn('Musopen album lookup error:', err.message);
      return null;
    }
  },

  /**
   * List popular composers as "artists".
   */
  async getPopularArtists(limit = 10) {
    if (!hasApiKey()) return [];
    try {
      const response = await musopenClient.get('/v1/composers', {
        params: { limit, page: 1 },
      });
      return getResults(response.data).map(normalizeComposer);
    } catch (err) {
      console.warn('Musopen popular composers error:', err.message);
      return [];
    }
  },

  /**
   * Returns supported genres (classical sub-genres / eras).
   */
  getGenres() {
    return [
      { id: 'baroque', name: 'Baroque', color: '#7C3AED' },
      { id: 'classical-era', name: 'Classical Era', color: '#5B21B6' },
      { id: 'romantic', name: 'Romantic', color: '#9333EA' },
      { id: 'modern', name: 'Modern', color: '#A855F7' },
      { id: 'renaissance', name: 'Renaissance', color: '#6D28D9' },
      { id: 'chamber', name: 'Chamber Music', color: '#7E22CE' },
      { id: 'symphony', name: 'Symphony', color: '#8B5CF6' },
      { id: 'opera', name: 'Opera', color: '#C084FC' },
      { id: 'piano', name: 'Piano', color: '#DDD6FE' },
      { id: 'choral', name: 'Choral', color: '#EDE9FE' },
    ];
  },

  /**
   * Get the direct audio stream URL for a track.
   * For Musopen, the URL is included in the recording object itself.
   */
  getStreamUrl(track) {
    return track.streamUrl || null;
  },
};

module.exports = MusicProvider;
