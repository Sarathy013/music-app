/**
 * Jamendo Music Provider
 *
 * Jamendo is the world's largest platform of free, legal and unlimited music.
 * All tracks are released under Creative Commons licenses.
 * API: https://developer.jamendo.com/v3.0
 *
 * Register an application and configure JAMENDO_CLIENT_ID.
 */

const axios = require('axios');

const JAMENDO_BASE = 'https://api.jamendo.com/v3.0';
const CLIENT_ID = process.env.JAMENDO_CLIENT_ID;

const jamendoClient = axios.create({
  baseURL: JAMENDO_BASE,
  timeout: 10000,
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function normalizeTrack(track) {
  return {
    id: `jamendo-${track.id}`,
    title: track.name || 'Untitled',
    artist: track.artist_name || 'Unknown Artist',
    album: track.album_name || null,
    duration: track.duration || 0,
    artworkUrl: track.image || track.album_image || null,
    streamUrl: track.audio || track.audiodownload || null,
    genre: (track.musicinfo?.tags?.genres || [])[0] || 'Music',
    year: track.releasedate ? new Date(track.releasedate).getFullYear() : null,
    source: 'jamendo',
    license: track.license_ccurl ? 'Creative Commons' : 'Check provider rights',
    licenseUrl: track.license_ccurl || null,
    shareUrl: track.shareurl || null,
  };
}

function normalizeArtist(artist) {
  return {
    id: `jamendo-artist-${artist.id}`,
    name: artist.name,
    bio: artist.description || '',
    imageUrl: artist.image || null,
    website: artist.website || null,
    source: 'jamendo',
  };
}

function normalizeAlbum(album) {
  return {
    id: `jamendo-album-${album.id}`,
    name: album.name,
    artist: album.artist_name || 'Unknown Artist',
    artworkUrl: album.image || null,
    year: album.releasedate ? new Date(album.releasedate).getFullYear() : null,
    source: 'jamendo',
  };
}

// ─── Provider Methods ────────────────────────────────────────────────────────

const JamendoProvider = {
  async searchTracks(query, limit = 20, page = 1) {
    if (!CLIENT_ID) {
      console.warn('Jamendo is unavailable: configure JAMENDO_CLIENT_ID.');
      return [];
    }

    try {
      const response = await jamendoClient.get('/tracks', {
        params: {
          client_id: CLIENT_ID,
          format: 'json',
          limit,
          offset: (page - 1) * limit,
          namesearch: query,
          include: 'musicinfo',
          audioformat: 'mp31',
          imagesize: 300,
        },
      });
      let tracks = (response.data?.results || []).filter(t => t.audio);
      if (tracks.length === 0) {
        const fallback = await jamendoClient.get('/tracks', {
          params: {
            client_id: CLIENT_ID,
            format: 'json',
            limit,
            offset: (page - 1) * limit,
            search: query,
            include: 'musicinfo',
            audioformat: 'mp31',
            imagesize: 300,
          },
        });
        tracks = (fallback.data?.results || []).filter(t => t.audio);
      }
      return tracks.map(normalizeTrack);
    } catch (err) {
      console.warn('Jamendo search error:', err.message);
      return [];
    }
  },

  async searchArtists(query, limit = 10) {
    if (!CLIENT_ID) {
      console.warn('Jamendo is unavailable: configure JAMENDO_CLIENT_ID.');
      return [];
    }
    try {
      const response = await jamendoClient.get('/artists', {
        params: {
          client_id: CLIENT_ID,
          format: 'json',
          limit,
          namesearch: query,
          imagesize: 200,
        },
      });
      return (response.data?.results || []).map(normalizeArtist);
    } catch (err) {
      console.warn('Jamendo artists search error:', err.message);
      return [];
    }
  },

  async searchAlbums(query, limit = 10) {
    if (!CLIENT_ID) {
      console.warn('Jamendo is unavailable: configure JAMENDO_CLIENT_ID.');
      return [];
    }
    try {
      const response = await jamendoClient.get('/albums', {
        params: {
          client_id: CLIENT_ID,
          format: 'json',
          limit,
          namesearch: query,
          imagesize: 300,
        },
      });
      return (response.data?.results || []).map(normalizeAlbum);
    } catch (err) {
      console.warn('Jamendo albums search error:', err.message);
      return [];
    }
  },

  async getTrending(limit = 20) {
    if (!CLIENT_ID) {
      console.warn('Jamendo is unavailable: configure JAMENDO_CLIENT_ID.');
      return [];
    }
    try {
      const response = await jamendoClient.get('/tracks', {
        params: {
          client_id: CLIENT_ID,
          format: 'json',
          limit,
          order: 'popularity_total',
          audioformat: 'mp31',
          imagesize: 300,
          include: 'musicinfo',
        },
      });
      return (response.data?.results || []).filter(t => t.audio).map(normalizeTrack);
    } catch (err) {
      console.warn('Jamendo trending error:', err.message);
      return [];
    }
  },

  async getNewReleases(limit = 20) {
    if (!CLIENT_ID) {
      console.warn('Jamendo is unavailable: configure JAMENDO_CLIENT_ID.');
      return [];
    }
    try {
      const response = await jamendoClient.get('/tracks', {
        params: {
          client_id: CLIENT_ID,
          format: 'json',
          limit,
          order: 'releasedate_desc',
          audioformat: 'mp31',
          imagesize: 300,
          include: 'musicinfo',
        },
      });
      return (response.data?.results || []).filter(t => t.audio).map(normalizeTrack);
    } catch (err) {
      console.warn('Jamendo new releases error:', err.message);
      return [];
    }
  },

  async getTracksByGenre(genre, limit = 20) {
    if (!CLIENT_ID) {
      console.warn('Jamendo is unavailable: configure JAMENDO_CLIENT_ID.');
      return [];
    }
    try {
      const response = await jamendoClient.get('/tracks', {
        params: {
          client_id: CLIENT_ID,
          format: 'json',
          limit,
          tags: genre,
          order: 'popularity_total',
          audioformat: 'mp31',
          imagesize: 300,
          include: 'musicinfo',
        },
      });
      return (response.data?.results || []).filter(t => t.audio).map(normalizeTrack);
    } catch (err) {
      console.warn('Jamendo genre tracks error:', err.message);
      return [];
    }
  },

  async getPopularArtists(limit = 10) {
    if (!CLIENT_ID) {
      console.warn('Jamendo is unavailable: configure JAMENDO_CLIENT_ID.');
      return [];
    }
    try {
      const response = await jamendoClient.get('/artists', {
        params: {
          client_id: CLIENT_ID,
          format: 'json',
          limit,
          order: 'popularity_total',
          imagesize: 200,
        },
      });
      return (response.data?.results || []).map(normalizeArtist);
    } catch (err) {
      console.warn('Jamendo popular artists error:', err.message);
      return [];
    }
  },

  async getArtist(artistId) {
    if (!CLIENT_ID) {
      console.warn('Jamendo is unavailable: configure JAMENDO_CLIENT_ID.');
      return null;
    }
    try {
      const rawId = artistId.replace('jamendo-artist-', '');
      const response = await jamendoClient.get('/artists', {
        params: {
          client_id: CLIENT_ID,
          format: 'json',
          id: rawId,
          imagesize: 300,
        },
      });
      const artist = response.data?.results?.[0];
      return artist ? normalizeArtist(artist) : null;
    } catch (err) {
      console.warn('Jamendo artist error:', err.message);
      return null;
    }
  },

  async getTracksByArtist(artistId, limit = 30) {
    if (!CLIENT_ID) {
      console.warn('Jamendo is unavailable: configure JAMENDO_CLIENT_ID.');
      return [];
    }
    try {
      const rawId = artistId.replace('jamendo-artist-', '');
      const response = await jamendoClient.get('/tracks', {
        params: {
          client_id: CLIENT_ID,
          format: 'json',
          limit,
          artist_id: rawId,
          audioformat: 'mp31',
          imagesize: 300,
          include: 'musicinfo',
        },
      });
      return (response.data?.results || []).filter(t => t.audio).map(normalizeTrack);
    } catch (err) {
      console.warn('Jamendo artist tracks error:', err.message);
      return [];
    }
  },

  getGenres() {
    return [
      { id: 'pop', name: 'Pop', color: '#F472B6' },
      { id: 'rock', name: 'Rock', color: '#EF4444' },
      { id: 'electronic', name: 'Electronic', color: '#06B6D4' },
      { id: 'hiphop', name: 'Hip-Hop', color: '#F59E0B' },
      { id: 'jazz', name: 'Jazz', color: '#8B5CF6' },
      { id: 'classical', name: 'Classical', color: '#10B981' },
      { id: 'ambient', name: 'Ambient', color: '#3B82F6' },
      { id: 'folk', name: 'Folk', color: '#D97706' },
      { id: 'metal', name: 'Metal', color: '#6B7280' },
      { id: 'rnb', name: 'R&B', color: '#EC4899' },
      { id: 'acoustic', name: 'Acoustic', color: '#84CC16' },
      { id: 'world', name: 'World', color: '#F97316' },
    ];
  },

  async getTrack(trackId) {
    if (!CLIENT_ID) {
      console.warn('Jamendo is unavailable: configure JAMENDO_CLIENT_ID.');
      return null;
    }

    try {
      const rawId = String(trackId).replace(/^jamendo-/, '');
      const response = await jamendoClient.get('/tracks', {
        params: {
          client_id: CLIENT_ID,
          format: 'json',
          id: rawId,
          audioformat: 'mp31',
          imagesize: 300,
          include: 'musicinfo',
        },
      });
      const track = response.data?.results?.[0];
      return track?.audio ? normalizeTrack(track) : null;
    } catch (err) {
      console.warn('Jamendo track lookup error:', err.message);
      return null;
    }
  },

  async getAlbum(albumId) {
    if (!CLIENT_ID) {
      console.warn('Jamendo is unavailable: configure JAMENDO_CLIENT_ID.');
      return null;
    }

    try {
      const rawId = String(albumId).replace(/^jamendo-album-/, '');
      const [albumResponse, tracksResponse] = await Promise.all([
        jamendoClient.get('/albums', {
          params: { client_id: CLIENT_ID, format: 'json', id: rawId, imagesize: 300 },
        }),
        jamendoClient.get('/tracks', {
          params: { client_id: CLIENT_ID, format: 'json', album_id: rawId, limit: 50, audioformat: 'mp31', include: 'musicinfo' },
        }),
      ]);
      const album = albumResponse.data?.results?.[0];
      if (!album) return null;
      return {
        ...normalizeAlbum(album),
        tracks: (tracksResponse.data?.results || []).filter((track) => track.audio).map(normalizeTrack),
      };
    } catch (err) {
      console.warn('Jamendo album lookup error:', err.message);
      return null;
    }
  },
};

module.exports = JamendoProvider;
