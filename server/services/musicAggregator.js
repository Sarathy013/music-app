/**
 * Music Aggregator — Worldwide Music Streaming Engine
 *
 * Integrates:
 * 1. JioSaavn (Tamil, Hindi, English, and all Indian & Global Music)
 * 2. YouTube Music (All songs, videos, and links)
 * 3. Spotify (Search, playlists & links)
 * 4. Jamendo (Open genres)
 * 5. Musopen (Classical)
 */

const SaavnProvider = require('./saavnProvider');
const YouTubeProvider = require('./youtubeProvider');
const SpotifyProvider = require('./spotifyProvider');
const JamendoProvider = require('./jamendoProvider');
const MusopenProvider = require('./musicProvider');

function dedup(tracks) {
  const seenIds = new Set();
  const seenTokens = new Set();
  return (tracks || []).filter((t) => {
    if (!t || !t.title || !t.id || seenIds.has(t.id)) return false;
    const tokens = typeof SaavnProvider.getTrackDedupeTokens === 'function' ? SaavnProvider.getTrackDedupeTokens(t) : [];
    const isDup = tokens.some((tok) => seenTokens.has(tok));
    if (isDup) return false;

    tokens.forEach((tok) => seenTokens.add(tok));
    seenIds.add(t.id);
    return true;
  });
}

const MusicAggregator = {
  /**
   * Search across all providers with language and source filtering
   */
  async searchTracks(query, options = {}) {
    const limit = options.limit || 20;
    const page = options.page || 1;
    const language = (options.language || 'all').toLowerCase();
    const source = (options.source || 'all').toLowerCase();

    // Check if query is a direct link (YouTube or Spotify)
    if (query.includes('youtube.com') || query.includes('youtu.be')) {
      const ytTracks = await YouTubeProvider.searchTracks(query, 5);
      if (ytTracks.length > 0) return ytTracks;
    }
    if (query.includes('spotify.com')) {
      const spTrack = await SpotifyProvider.resolveSpotifyUrl(query);
      if (spTrack) return [spTrack];
    }

    // Single source requested
    // Single source or language-targeted search
    if (source === 'youtube') {
      const q = language !== 'all' && !query.toLowerCase().includes(language) ? `${query} ${language}` : query;
      return YouTubeProvider.searchTracks(q, limit);
    }
    if (source === 'spotify') {
      return SpotifyProvider.searchTracks(query, limit);
    }
    if (source === 'saavn' || language !== 'all') {
      return SaavnProvider.searchTracks(query, limit, page, language);
    }
    if (source === 'jamendo') {
      return JamendoProvider.searchTracks(query, limit, page);
    }

    // Default: Multi-source search (Saavn is primary for high-bitrate streaming audio)
    const [saavnRes, ytRes, jamendoRes] = await Promise.allSettled([
      SaavnProvider.searchTracks(query, limit, page, language),
      YouTubeProvider.searchTracks(query, Math.min(10, Math.ceil(limit * 0.3))),
      language === 'all' ? JamendoProvider.searchTracks(query, 5, page) : Promise.resolve([]),
    ]);

    const saavnTracks = saavnRes.status === 'fulfilled' ? saavnRes.value : [];
    const ytTracks = ytRes.status === 'fulfilled' ? ytRes.value : [];
    const jamendoTracks = jamendoRes.status === 'fulfilled' ? jamendoRes.value : [];

    // Saavn tracks come first (they have verified 320kbps streams), followed by YouTube
    const combined = [...saavnTracks, ...ytTracks, ...jamendoTracks];
    return dedup(combined).slice(0, limit);
  },

  /**
   * Search composers / artists
   */
  async searchComposers(query, limit = 10) {
    const [saavnArtists, jamendoArtists] = await Promise.allSettled([
      SaavnProvider.searchArtists(query, limit),
      JamendoProvider.searchArtists(query, 5),
    ]);

    const results = [
      ...(saavnArtists.status === 'fulfilled' ? saavnArtists.value : []),
      ...(jamendoArtists.status === 'fulfilled' ? jamendoArtists.value : []),
    ];

    return results.slice(0, limit);
  },

  /**
   * Search albums
   */
  async searchAlbums(query, limit = 10) {
    const [saavnAlbums, jamendoAlbums] = await Promise.allSettled([
      SaavnProvider.searchAlbums(query, limit),
      JamendoProvider.searchAlbums(query, 5),
    ]);

    const results = [
      ...(saavnAlbums.status === 'fulfilled' ? saavnAlbums.value : []),
      ...(jamendoAlbums.status === 'fulfilled' ? jamendoAlbums.value : []),
    ];

    return results.slice(0, limit);
  },

  /**
   * Trending tracks with language support (Tamil, Hindi, English, All)
   */
  async getTrending(limit = 20, language = 'all') {
    const tracks = await SaavnProvider.getTrending(limit, language);
    if (tracks.length > 0) return tracks.slice(0, limit);

    // Fallback to Jamendo if Saavn is unreachable
    return JamendoProvider.getTrending(limit);
  },

  /**
   * New releases with language support
   */
  async getNewReleases(limit = 20, language = 'all') {
    const tracks = await SaavnProvider.getNewReleases(limit, language);
    if (tracks.length > 0) return tracks.slice(0, limit);

    return JamendoProvider.getNewReleases(limit);
  },

  /**
   * Curated language charts (Tamil Top 50, Hindi Top 50, English Global Top 50)
   */
  async getCharts(language = 'all') {
    return SaavnProvider.getCharts(language);
  },

  /**
   * Popular artists (Tamil, Telugu, Hindi, English & global)
   */
  async getPopularArtists(limit = 12) {
    const defaultPopularNames = [
      'Anirudh Ravichander',
      'A.R. Rahman',
      'Devi Sri Prasad',
      'Arijit Singh',
      'Taylor Swift',
      'Thaman S',
      'The Weeknd',
      'Sid Sriram',
      'Shreya Ghoshal',
      'S.P. Balasubrahmanyam',
      'Yuvan Shankar Raja',
      'Pritam',
      'Ed Sheeran',
      'Ilaiyaraaja',
      'Badshah',
    ];

    try {
      const artists = await Promise.all(
        defaultPopularNames.slice(0, limit).map(async (name) => {
          const res = await SaavnProvider.searchArtists(name, 1);
          return res?.[0] || null;
        })
      );
      const filtered = artists.filter(Boolean);
      if (filtered.length > 0) return filtered;
    } catch {}

    return JamendoProvider.getPopularArtists(limit);
  },

  /**
   * Retrieve a single track by unified ID
   */
  async getTrack(id) {
    if (!id) return null;

    if (id.startsWith('saavn-')) {
      return SaavnProvider.getTrack(id);
    }
    if (id.startsWith('yt-')) {
      return YouTubeProvider.getTrack(id);
    }
    if (id.startsWith('spotify-')) {
      return SpotifyProvider.searchTracks(id, 1).then((res) => res[0] || null);
    }
    if (id.startsWith('jamendo-')) {
      return JamendoProvider.getTrack ? JamendoProvider.getTrack(id) : null;
    }

    return MusopenProvider.getTrack(id);
  },

  /**
   * Resolve any external YouTube or Spotify URL
   */
  async resolveLink(url) {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const ytId = YouTubeProvider.parseYouTubeId(url);
      if (ytId) {
        return YouTubeProvider.getTrack(`yt-${ytId}`);
      }
    }
    if (url.includes('spotify.com')) {
      return SpotifyProvider.resolveSpotifyUrl(url);
    }
    return null;
  },

  /**
   * Retrieve album by ID
   */
  async getAlbum(id) {
    if (id.startsWith('saavn-album-') || id.startsWith('saavn-')) {
      return SaavnProvider.getAlbum(id);
    }
    return MusopenProvider.getAlbum(id);
  },

  /**
   * Retrieve artist details by ID
   */
  async getArtist(id) {
    if (id.startsWith('saavn-artist-') || id.startsWith('saavn-')) {
      return SaavnProvider.getArtist(id);
    }
    return JamendoProvider.getArtist(id);
  },

  /**
   * Retrieve tracks by artist ID
   */
  async getTracksByArtist(artistId, limit = 30) {
    if (artistId.startsWith('saavn-artist-') || artistId.startsWith('saavn-')) {
      return SaavnProvider.getTracksByArtist(artistId, limit);
    }
    return JamendoProvider.getTracksByArtist(artistId, limit);
  },

  /**
   * Retrieve tracks by genre
   */
  async getTracksByGenre(genre, limit = 20) {
    if (['tamil', 'hindi', 'english', 'telugu', 'malayalam', 'punjabi', 'kannada', 'bollywood', 'kollywood', 'tollywood', 'mollywood', 'sandalwood'].includes(genre.toLowerCase())) {
      return SaavnProvider.searchTracks(genre, limit, 1, genre);
    }
    return JamendoProvider.getTracksByGenre(genre, limit);
  },

  /**
   * Genre definitions with language support
   */
  getGenres() {
    return [
      { id: 'tamil', name: '🦁 Tamil Hits', color: '#F97316', language: 'tamil' },
      { id: 'telugu', name: '⚡ Telugu Hits', color: '#10B981', language: 'telugu' },
      { id: 'hindi', name: '🇮🇳 Bollywood & Hindi', color: '#EAB308', language: 'hindi' },
      { id: 'english', name: '🌍 Global English', color: '#38BDF8', language: 'english' },
      { id: 'malayalam', name: '🌴 Malayalam Hits', color: '#14B8A6', language: 'malayalam' },
      { id: 'punjabi', name: '🪕 Punjabi Hits', color: '#EC4899', language: 'punjabi' },
      { id: 'kannada', name: '👑 Kannada Hits', color: '#8B5CF6', language: 'kannada' },
      { id: 'pop', name: 'Pop Hits', color: '#F472B6', source: 'saavn' },
      { id: 'hiphop', name: 'Hip-Hop & Rap', color: '#8B5CF6', source: 'saavn' },
      { id: 'rock', name: 'Rock & Indie', color: '#EC4899', source: 'saavn' },
      { id: 'electronic', name: 'EDM & Electronic', color: '#06B6D4', source: 'saavn' },
      { id: 'acoustic', name: 'Acoustic & Unplugged', color: '#84CC16', source: 'saavn' },
      { id: 'classical', name: 'Classical & Carnatic', color: '#10B981', source: 'musopen' },
      { id: 'ambient', name: 'Ambient & Lo-Fi', color: '#6366F1', source: 'jamendo' },
    ];
  },

  /**
   * Get music categorized across Tamil, English, Hindi, and Telugu (old & new)
   */
  async getAllLanguages(era = 'all') {
    return SaavnProvider.getAllLanguagesMusic(era);
  },
};

module.exports = MusicAggregator;
