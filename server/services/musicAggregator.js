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
  const seenTracks = new Set();
  return (tracks || []).filter((t) => {
    if (!t || !t.title || !t.id || seenIds.has(t.id)) return false;
    const title = normalizeForDedupe(t.title);
    const artist = normalizeForDedupe(t.artist || '');
    const key = artist ? `${title}::${artist}` : title;
    if (!key || seenTracks.has(key)) return false;
    seenTracks.add(key);
    seenIds.add(t.id);
    return true;
  });
}

function normalizeForDedupe(value) {
  return String(value)
    .toLowerCase()
    .replace(/\s*[\[(][^)\]]*(?:from|feat|ft\.|remix|version|audio|video|lyric|remaster|soundtrack|ost|original|bonus|edit|mix)[^)\]]*[\])]/gi, '')
    .replace(/[-–—_|:]/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function interleaveTrackLists(trackLists) {
  const interleaved = [];
  const maxLength = Math.max(0, ...trackLists.map((tracks) => tracks.length));
  for (let index = 0; index < maxLength; index++) {
    for (const tracks of trackLists) {
      if (tracks[index]) interleaved.push(tracks[index]);
    }
  }
  return interleaved;
}

// In-memory TTL cache for lightning fast responses and low latency
const memoryCache = new Map();
function getCache(key) {
  const item = memoryCache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return item.data;
}

function setCache(key, data, ttlMs = 15 * 60 * 1000) {
  if (memoryCache.size > 800) {
    const firstKeys = Array.from(memoryCache.keys()).slice(0, 150);
    firstKeys.forEach((k) => memoryCache.delete(k));
  }
  memoryCache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

const MusicAggregator = {
  /**
   * Search across all providers with language and source filtering
   */
  async searchTracks(query, options = {}) {
    const limit = options.limit ?? 20;
    const page = options.page ?? 1;
    const language = (options.language || 'all').toLowerCase();
    const source = (options.source || 'all').toLowerCase();
    const normalizedQuery = query.trim();

    const cacheKey = `search_${normalizedQuery.toLowerCase()}_${limit}_${page}_${language}_${source}`;
    const cached = getCache(cacheKey);
    if (cached) return cached;

    // Check if query is a direct link (YouTube or Spotify)
    if ((source === 'all' || source === 'youtube') &&
        (normalizedQuery.includes('youtube.com') || normalizedQuery.includes('youtu.be'))) {
      const ytTracks = await YouTubeProvider.searchTracks(normalizedQuery, 5);
      if (ytTracks.length > 0) {
        setCache(cacheKey, ytTracks, 30 * 60 * 1000);
        return ytTracks;
      }
    }
    if ((source === 'all' || source === 'spotify') && normalizedQuery.includes('spotify.com')) {
      const spTrack = await SpotifyProvider.resolveSpotifyUrl(normalizedQuery);
      if (spTrack) {
        setCache(cacheKey, [spTrack], 30 * 60 * 1000);
        return [spTrack];
      }
    }

    let results = [];
    if (source === 'saavn') {
      results = await SaavnProvider.searchTracks(normalizedQuery, limit, page, language);
    } else if (source === 'youtube') {
      const q = language !== 'all' && !normalizedQuery.toLowerCase().includes(language) ? `${normalizedQuery} ${language}` : normalizedQuery;
      results = await YouTubeProvider.searchTracks(q, limit);
    } else if (source === 'spotify') {
      results = await SpotifyProvider.searchTracks(normalizedQuery, limit);
    } else if (source === 'jamendo') {
      results = await JamendoProvider.searchTracks(normalizedQuery, limit, page);
    } else if (source === 'musopen') {
      results = await MusopenProvider.searchTracks(normalizedQuery, limit, page);
    } else {
      const saavnQuery = language !== 'all' && !normalizedQuery.toLowerCase().includes(language)
        ? `${normalizedQuery} ${language}`
        : normalizedQuery;
      const [saavnRes, ytRes, jamendoRes, musopenRes] = await Promise.allSettled([
        SaavnProvider.searchTracks(saavnQuery, limit, page, language),
        YouTubeProvider.searchTracks(normalizedQuery, Math.min(10, Math.ceil(limit * 0.3))),
        JamendoProvider.searchTracks(normalizedQuery, Math.min(10, limit), page),
        MusopenProvider.searchTracks(normalizedQuery, Math.min(10, limit), page),
      ]);

      const saavnTracks = saavnRes.status === 'fulfilled' ? saavnRes.value : [];
      const ytTracks = ytRes.status === 'fulfilled' ? ytRes.value : [];
      const jamendoTracks = jamendoRes.status === 'fulfilled' ? jamendoRes.value : [];
      const musopenTracks = musopenRes.status === 'fulfilled' ? musopenRes.value : [];

      const combined = interleaveTrackLists([saavnTracks, jamendoTracks, musopenTracks, ytTracks]);
      results = dedup(combined).slice(0, limit);
    }

    if (results.length > 0) {
      setCache(cacheKey, results, 8 * 60 * 1000); // 8 minutes cache for searches
    }
    return results;
  },

  /**
   * Search composers / artists
   */
  async searchComposers(query, limit = 10) {
    const cacheKey = `search_composers_${query.toLowerCase()}_${limit}`;
    const cached = getCache(cacheKey);
    if (cached) return cached;

    const [saavnArtists, jamendoArtists, musopenArtists] = await Promise.allSettled([
      SaavnProvider.searchArtists(query, limit),
      JamendoProvider.searchArtists(query, 5),
      MusopenProvider.searchComposers(query, 5),
    ]);

    const results = [
      ...(saavnArtists.status === 'fulfilled' ? saavnArtists.value : []),
      ...(jamendoArtists.status === 'fulfilled' ? jamendoArtists.value : []),
      ...(musopenArtists.status === 'fulfilled' ? musopenArtists.value : []),
    ].slice(0, limit);

    if (results.length > 0) setCache(cacheKey, results, 30 * 60 * 1000);
    return results;
  },

  /**
   * Search albums
   */
  async searchAlbums(query, limit = 10) {
    const cacheKey = `search_albums_${query.toLowerCase()}_${limit}`;
    const cached = getCache(cacheKey);
    if (cached) return cached;

    const [saavnAlbums, jamendoAlbums, musopenAlbums] = await Promise.allSettled([
      SaavnProvider.searchAlbums(query, limit),
      JamendoProvider.searchAlbums(query, 5),
      MusopenProvider.searchAlbums(query, 5),
    ]);

    const results = [
      ...(saavnAlbums.status === 'fulfilled' ? saavnAlbums.value : []),
      ...(jamendoAlbums.status === 'fulfilled' ? jamendoAlbums.value : []),
      ...(musopenAlbums.status === 'fulfilled' ? musopenAlbums.value : []),
    ].slice(0, limit);

    if (results.length > 0) setCache(cacheKey, results, 30 * 60 * 1000);
    return results;
  },

  /**
   * Trending tracks with language support (Tamil, Hindi, English, All)
   */
  async getTrending(limit = 20, language = 'all') {
    const cacheKey = `trending_${language}_${limit}`;
    const cached = getCache(cacheKey);
    if (cached) return cached;

    const [saavnResult, jamendoResult, musopenResult] = await Promise.allSettled([
      SaavnProvider.getTrending(limit, language),
      JamendoProvider.getTrending(Math.min(limit, 10)),
      MusopenProvider.getTrending(Math.min(limit, 10)),
    ]);
    const tracks = dedup(interleaveTrackLists([
      saavnResult.status === 'fulfilled' ? saavnResult.value : [],
      jamendoResult.status === 'fulfilled' ? jamendoResult.value : [],
      musopenResult.status === 'fulfilled' ? musopenResult.value : [],
    ])).slice(0, limit);
    if (tracks.length > 0) setCache(cacheKey, tracks, 20 * 60 * 1000);
    return tracks;
  },

  /**
   * New releases with language support
   */
  async getNewReleases(limit = 20, language = 'all') {
    const cacheKey = `new_releases_${language}_${limit}`;
    const cached = getCache(cacheKey);
    if (cached) return cached;

    const [saavnResult, jamendoResult, musopenResult] = await Promise.allSettled([
      SaavnProvider.getNewReleases(limit, language),
      JamendoProvider.getNewReleases(Math.min(limit, 10)),
      MusopenProvider.getNewReleases(Math.min(limit, 10)),
    ]);
    const tracks = dedup(interleaveTrackLists([
      saavnResult.status === 'fulfilled' ? saavnResult.value : [],
      jamendoResult.status === 'fulfilled' ? jamendoResult.value : [],
      musopenResult.status === 'fulfilled' ? musopenResult.value : [],
    ])).slice(0, limit);
    if (tracks.length > 0) setCache(cacheKey, tracks, 20 * 60 * 1000);
    return tracks;
  },

  /**
   * Curated language charts (Tamil Top 50, Hindi Top 50, English Global Top 50)
   */
  async getCharts(language = 'all') {
    const cacheKey = `charts_${language}`;
    const cached = getCache(cacheKey);
    if (cached) return cached;
    const res = await SaavnProvider.getCharts(language);
    if (res?.length) setCache(cacheKey, res, 30 * 60 * 1000);
    return res;
  },

  /**
   * Popular artists (Tamil, Telugu, Hindi, English & global)
   */
  async getPopularArtists(limit = 12) {
    const cacheKey = `popular_artists_${limit}`;
    const cached = getCache(cacheKey);
    if (cached) return cached;

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
      if (filtered.length > 0) {
        setCache(cacheKey, filtered, 60 * 60 * 1000);
        return filtered;
      }
    } catch {}

    const jam = await JamendoProvider.getPopularArtists(limit);
    return jam;
  },

  /**
   * Popular & trending blockbuster albums
   */
  async getPopularAlbums(limit = 12, language = 'all') {
    const cacheKey = `popular_albums_${language}_${limit}`;
    const cached = getCache(cacheKey);
    if (cached) return cached;

    const albumSeeds = {
      all: ['Amaran', 'Pushpa 2', 'Devara', 'Stree 2', 'Kalki 2898 AD', 'GOAT Vijay', 'Aavesham', '1989 Taylors Version', 'Starboy', 'KGF Chapter 2', 'Jailer', 'Leo'],
      tamil: ['Amaran', 'Vettaiyan', 'GOAT Vijay', 'Raayan', 'Leo', 'Jailer', 'Ponniyin Selvan', 'Vikram', 'Master', 'Thiruchitrambalam'],
      telugu: ['Pushpa 2 The Rule', 'Devara', 'Kalki 2898 AD', 'Saripodhaa Sanivaaram', 'Guntur Kaaram', 'HanuMan', 'Tillu Square', 'Salaar', 'RRR'],
      hindi: ['Stree 2', 'Animal', 'Bhool Bhulaiyaa 3', 'Dunki', 'Fighter', 'Jawan', 'Pathaan', 'Brahmastra', 'Kabir Singh'],
      english: ['The Tortured Poets Department', 'Hit Me Hard and Soft', 'Short n Sweet', 'Starboy', 'After Hours', 'Divide', '1989 Taylors Version', 'Future Nostalgia'],
      malayalam: ['Aavesham', 'Premalu', 'Manjummel Boys', 'Bramayugam', 'RDX', 'Hridayam', 'Minnal Murali'],
      punjabi: ['Ghost Diljit Dosanjh', 'Making Memories Karan Aujla', 'Moosetape Sidhu Moose Wala', 'Four Me Karan Aujla'],
      kannada: ['KGF Chapter 2', 'Kantara', 'Kabzaa', 'Vikrant Rona', '777 Charlie', 'Tagaru'],
    };

    const seeds = albumSeeds[language] || albumSeeds.all;
    try {
      const promises = seeds.slice(0, limit).map(async (name) => {
        const res = await SaavnProvider.searchAlbums(name, 1);
        return res?.[0] || null;
      });
      const albums = (await Promise.all(promises)).filter(Boolean);
      const seenIds = new Set();
      const unique = albums.filter((a) => {
        if (!a || !a.id || seenIds.has(a.id)) return false;
        seenIds.add(a.id);
        return true;
      });
      if (unique.length > 0) {
        setCache(cacheKey, unique, 45 * 60 * 1000);
        return unique;
      }
    } catch (err) {
      console.warn('Error fetching popular albums:', err.message);
    }
    return [];
  },

  /**
   * Retrieve a single track by unified ID
   */
  async getTrack(id) {
    if (!id) return null;
    const cacheKey = `track_${id}`;
    const cached = getCache(cacheKey);
    if (cached) return cached;

    let track = null;
    if (id.startsWith('saavn-')) {
      track = await SaavnProvider.getTrack(id);
    } else if (id.startsWith('yt-')) {
      track = await YouTubeProvider.getTrack(id);
    } else if (id.startsWith('spotify-')) {
      track = await SpotifyProvider.searchTracks(id, 1).then((res) => res[0] || null);
    } else if (id.startsWith('jamendo-')) {
      track = await JamendoProvider.getTrack(id);
    } else if (id.startsWith('musopen-')) {
      track = await MusopenProvider.getTrack(id);
    } else {
      track = await MusopenProvider.getTrack(id);
    }

    if (track) setCache(cacheKey, track, 60 * 60 * 1000);
    return track;
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
    const cacheKey = `album_${id}`;
    const cached = getCache(cacheKey);
    if (cached) return cached;

    let album = null;
    if (id.startsWith('saavn-album-') || id.startsWith('saavn-')) {
      album = await SaavnProvider.getAlbum(id);
    } else if (id.startsWith('jamendo-album-')) {
      album = await JamendoProvider.getAlbum(id);
    } else if (id.startsWith('musopen-album-')) {
      album = await MusopenProvider.getAlbum(id);
    } else {
      album = await MusopenProvider.getAlbum(id);
    }

    if (album) setCache(cacheKey, album, 60 * 60 * 1000);
    return album;
  },

  /**
   * Retrieve artist details by ID
   */
  async getArtist(id) {
    const cacheKey = `artist_${id}`;
    const cached = getCache(cacheKey);
    if (cached) return cached;

    let artist = null;
    if (id.startsWith('saavn-artist-') || id.startsWith('saavn-')) {
      artist = await SaavnProvider.getArtist(id);
    } else if (id.startsWith('musopen-artist-')) {
      artist = await MusopenProvider.getArtist(id);
    } else {
      artist = await JamendoProvider.getArtist(id);
    }

    if (artist) setCache(cacheKey, artist, 60 * 60 * 1000);
    return artist;
  },

  /**
   * Retrieve tracks by artist ID
   */
  async getTracksByArtist(artistId, limit = 30) {
    const cacheKey = `artist_tracks_${artistId}_${limit}`;
    const cached = getCache(cacheKey);
    if (cached) return cached;

    let tracks = [];
    if (artistId.startsWith('saavn-artist-') || artistId.startsWith('saavn-')) {
      tracks = await SaavnProvider.getTracksByArtist(artistId, limit);
    } else if (artistId.startsWith('musopen-artist-')) {
      tracks = await MusopenProvider.getTracksByArtist(artistId, limit);
    } else {
      tracks = await JamendoProvider.getTracksByArtist(artistId, limit);
    }

    if (tracks?.length) setCache(cacheKey, tracks, 60 * 60 * 1000);
    return tracks;
  },

  /**
   * Retrieve tracks by genre
   */
  async getTracksByGenre(genre, limit = 20) {
    const normalizedGenre = genre.toLowerCase();
    if (['tamil', 'hindi', 'english', 'telugu', 'malayalam', 'punjabi', 'kannada', 'bollywood', 'kollywood', 'tollywood', 'mollywood', 'sandalwood'].includes(normalizedGenre)) {
      return SaavnProvider.searchTracks(genre, limit, 1, genre);
    }
    if (['classical', 'baroque', 'classical-era', 'romantic', 'modern', 'renaissance', 'chamber', 'symphony', 'opera', 'piano', 'choral'].includes(normalizedGenre)) {
      return MusopenProvider.searchTracks(genre.replace('-', ' '), limit);
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
