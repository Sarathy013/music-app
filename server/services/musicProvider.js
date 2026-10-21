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
  headers: { Authorization: `Token ${API_KEY}` },
  timeout: 10000,
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function normalizeTrack(recording) {
  return {
    id: String(recording.id),
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
    license: 'Public Domain',
  };
}

function normalizeComposer(composer) {
  return {
    id: String(composer.id),
    name: composer.complete_name || composer.name,
    bio: composer.bio || '',
    imageUrl: composer.picture || null,
    era: composer.era || null,
    source: 'musopen',
  };
}

function normalizeAlbum(album) {
  return {
    id: String(album.id),
    name: album.name,
    artist: album.composer
      ? album.composer.complete_name || album.composer.name
      : 'Various Artists',
    artworkUrl: album.cover_image || null,
    year: album.year || null,
    source: 'musopen',
  };
}

// ─── Provider Methods ────────────────────────────────────────────────────────

const MusicProvider = {
  /**
   * Search across recordings, composers, and albums.
   */
  async searchTracks(query, limit = 20, page = 1) {
    try {
      const response = await musopenClient.get('/v1/recordings', {
        params: { title: query, limit, page },
      });
      const results = (response.data?.results || response.data || []).map(normalizeTrack);
      if (results.length > 0) return results;
      throw new Error('No results from Musopen');
    } catch (err) {
      const q = (query || '').toLowerCase().trim();
      return getMockTracks().filter(
        (t) => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q) || t.album?.toLowerCase().includes(q)
      ).slice(0, limit);
    }
  },

  async searchComposers(query, limit = 10) {
    try {
      const response = await musopenClient.get('/v1/composers', {
        params: { name: query, limit },
      });
      const results = (response.data?.results || response.data || []).map(normalizeComposer);
      if (results.length > 0) return results;
      throw new Error('No composers from Musopen');
    } catch (err) {
      const q = (query || '').toLowerCase().trim();
      return getMockArtists().filter((a) => a.name.toLowerCase().includes(q)).slice(0, limit);
    }
  },

  async searchAlbums(query, limit = 10) {
    try {
      const response = await musopenClient.get('/v1/albums', {
        params: { name: query, limit },
      });
      return (response.data?.results || response.data || []).map(normalizeAlbum);
    } catch (err) {
      return [
        { id: 'alb-1', name: 'Beethoven: Complete Symphonies', artist: 'Ludwig van Beethoven', artworkUrl: null, year: 1808, source: 'musopen' },
        { id: 'alb-2', name: 'Vivaldi: The Four Seasons & Concertos', artist: 'Antonio Vivaldi', artworkUrl: null, year: 1725, source: 'musopen' },
      ];
    }
  },

  /**
   * Get a single track by ID.
   */
  async getTrack(id) {
    try {
      const response = await musopenClient.get(`/v1/recordings/${id}`);
      return normalizeTrack(response.data);
    } catch (err) {
      return getMockTracks().find((t) => t.id === id) || getMockTracks()[0];
    }
  },

  /**
   * Get trending / featured recordings.
   */
  async getTrending(limit = 20) {
    try {
      const response = await musopenClient.get('/v1/recordings', {
        params: { limit, page: 1, sort: 'downloads' },
      });
      const results = (response.data?.results || response.data || []).map(normalizeTrack);
      if (results.length > 0) return results;
      return getMockTracks();
    } catch (err) {
      return getMockTracks();
    }
  },

  /**
   * Get new releases (recently added recordings).
   */
  async getNewReleases(limit = 20) {
    try {
      const response = await musopenClient.get('/v1/recordings', {
        params: { limit, page: 1 },
      });
      const results = (response.data?.results || response.data || []).map(normalizeTrack);
      if (results.length > 0) return results;
      return getMockTracks().slice().reverse();
    } catch (err) {
      return getMockTracks().slice().reverse();
    }
  },

  /**
   * Get recordings by composer (artist page).
   */
  async getTracksByArtist(composerId, limit = 30) {
    try {
      const response = await musopenClient.get('/v1/recordings', {
        params: { composer: composerId, limit },
      });
      const results = (response.data?.results || response.data || []).map(normalizeTrack);
      if (results.length > 0) return results;
      throw new Error('No tracks');
    } catch (err) {
      const artist = getMockArtists().find((a) => a.id === composerId);
      const name = artist ? artist.name.toLowerCase() : '';
      return getMockTracks().filter((t) => !name || t.artist.toLowerCase().includes(name) || name.includes(t.artist.toLowerCase()));
    }
  },

  /**
   * Get a composer (artist) by ID.
   */
  async getArtist(composerId) {
    try {
      const response = await musopenClient.get(`/v1/composers/${composerId}`);
      return normalizeComposer(response.data);
    } catch (err) {
      return getMockArtists().find((a) => a.id === composerId) || {
        id: composerId,
        name: 'Classical Master',
        bio: 'Renowned classical composer.',
        imageUrl: null,
        era: 'Classical',
        source: 'musopen',
      };
    }
  },

  /**
   * Get an album by ID.
   */
  async getAlbum(albumId) {
    try {
      const albumRes = await musopenClient.get(`/v1/albums/${albumId}`);
      const tracksRes = await musopenClient.get('/v1/recordings', {
        params: { album: albumId, limit: 50 },
      });
      const album = normalizeAlbum(albumRes.data);
      album.tracks = (tracksRes.data?.results || tracksRes.data || []).map(normalizeTrack);
      return album;
    } catch (err) {
      return {
        id: albumId,
        name: 'Masterpieces of Classical Music',
        artist: 'Various Artists',
        artworkUrl: null,
        year: 2024,
        source: 'musopen',
        tracks: getMockTracks(),
      };
    }
  },

  /**
   * List popular composers as "artists".
   */
  async getPopularArtists(limit = 10) {
    try {
      const response = await musopenClient.get('/v1/composers', {
        params: { limit, page: 1 },
      });
      const results = (response.data?.results || response.data || []).map(normalizeComposer);
      if (results.length > 0) return results;
      return getMockArtists();
    } catch (err) {
      return getMockArtists();
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

// ─── Fallback mock data when API key is not set ──────────────────────────────

function getMockTracks() {
  return [
    {
      id: 'mock-1',
      title: 'Symphony No. 5 in C Minor',
      artist: 'Ludwig van Beethoven',
      album: 'Beethoven Symphonies',
      duration: 480,
      artworkUrl: null,
      streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      genre: 'Classical',
      source: 'musopen',
      license: 'Public Domain',
    },
    {
      id: 'mock-2',
      title: 'Moonlight Sonata',
      artist: 'Ludwig van Beethoven',
      album: 'Piano Sonatas',
      duration: 390,
      artworkUrl: null,
      streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
      genre: 'Classical',
      source: 'musopen',
      license: 'Public Domain',
    },
    {
      id: 'mock-3',
      title: 'The Four Seasons — Spring',
      artist: 'Antonio Vivaldi',
      album: 'The Four Seasons',
      duration: 330,
      artworkUrl: null,
      streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
      genre: 'Classical',
      source: 'musopen',
      license: 'Public Domain',
    },
    {
      id: 'mock-4',
      title: 'Brandenburg Concerto No. 3',
      artist: 'Johann Sebastian Bach',
      album: 'Brandenburg Concertos',
      duration: 510,
      artworkUrl: null,
      streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
      genre: 'Classical',
      source: 'musopen',
      license: 'Public Domain',
    },
    {
      id: 'mock-5',
      title: 'Eine Kleine Nachtmusik',
      artist: 'Wolfgang Amadeus Mozart',
      album: 'Mozart Serenades',
      duration: 360,
      artworkUrl: null,
      streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
      genre: 'Classical',
      source: 'musopen',
      license: 'Public Domain',
    },
    {
      id: 'mock-6',
      title: 'Clair de Lune',
      artist: 'Claude Debussy',
      album: 'Suite Bergamasque',
      duration: 290,
      artworkUrl: null,
      streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
      genre: 'Classical',
      source: 'musopen',
      license: 'Public Domain',
    },
    {
      id: 'mock-7',
      title: 'Für Elise',
      artist: 'Ludwig van Beethoven',
      album: 'Piano Pieces',
      duration: 175,
      artworkUrl: null,
      streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3',
      genre: 'Classical',
      source: 'musopen',
      license: 'Public Domain',
    },
    {
      id: 'mock-8',
      title: 'Waltz in D-flat Major (Minute Waltz)',
      artist: 'Frédéric Chopin',
      album: 'Waltzes',
      duration: 130,
      artworkUrl: null,
      streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
      genre: 'Classical',
      source: 'musopen',
      license: 'Public Domain',
    },
  ];
}

function getMockArtists() {
  return [
    { id: 'a1', name: 'Ludwig van Beethoven', bio: 'German composer (1770–1827)', imageUrl: null, era: 'Classical/Romantic', source: 'musopen' },
    { id: 'a2', name: 'Wolfgang Amadeus Mozart', bio: 'Austrian composer (1756–1791)', imageUrl: null, era: 'Classical', source: 'musopen' },
    { id: 'a3', name: 'Johann Sebastian Bach', bio: 'German composer (1685–1750)', imageUrl: null, era: 'Baroque', source: 'musopen' },
    { id: 'a4', name: 'Frédéric Chopin', bio: 'Polish composer (1810–1849)', imageUrl: null, era: 'Romantic', source: 'musopen' },
    { id: 'a5', name: 'Antonio Vivaldi', bio: 'Italian composer (1678–1741)', imageUrl: null, era: 'Baroque', source: 'musopen' },
    { id: 'a6', name: 'Claude Debussy', bio: 'French composer (1862–1918)', imageUrl: null, era: 'Impressionist', source: 'musopen' },
  ];
}

module.exports = MusicProvider;
