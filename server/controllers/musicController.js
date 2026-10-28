const MusicAggregator = require('../services/musicAggregator');

function parseBoundedInteger(value, fallback, maximum) {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= maximum ? parsed : null;
}

// GET /api/music/search?q=...&type=tracks|composers|albums&limit=20&page=1&language=all|tamil|hindi|english&source=all|saavn|youtube|spotify
exports.search = async (req, res, next) => {
  try {
    const { q, type = 'tracks', limit = 20, page = 1, language = 'all', source = 'all' } = req.query;
    if (typeof q !== 'string' || !q.trim() || q.trim().length > 200) {
      return res.status(400).json({ success: false, message: 'Query parameter q must be between 1 and 200 characters.' });
    }
    if (!['tracks', 'composers', 'artists', 'albums'].includes(type)) {
      return res.status(400).json({ success: false, message: 'type must be tracks, artists, composers, or albums.' });
    }
    const parsedLimit = parseBoundedInteger(limit, 20, 100);
    const parsedPage = parseBoundedInteger(page, 1, 1000);
    if (parsedLimit === null || parsedPage === null) {
      return res.status(400).json({ success: false, message: 'limit must be 1-100 and page must be 1-1000.' });
    }
    if (typeof language !== 'string' || !/^[a-z-]{1,24}$/i.test(language)) {
      return res.status(400).json({ success: false, message: 'language must be a valid language code.' });
    }
    if (!['all', 'saavn', 'youtube', 'spotify', 'jamendo', 'musopen'].includes(source)) {
      return res.status(400).json({ success: false, message: 'unsupported music source.' });
    }

    let results = [];
    if (type === 'tracks') {
      results = await MusicAggregator.searchTracks(q.trim(), {
        limit: parsedLimit,
        page: parsedPage,
        language,
        source,
      });
    } else if (type === 'composers' || type === 'artists') {
      results = await MusicAggregator.searchComposers(q.trim(), parsedLimit);
    } else if (type === 'albums') {
      results = await MusicAggregator.searchAlbums(q.trim(), parsedLimit);
    }

    res.json({
      success: true,
      results,
      query: q.trim(),
      type,
      language,
      source,
      total: results.length,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/music/trending?limit=20&language=all|tamil|hindi|english
exports.getTrending = async (req, res, next) => {
  try {
    const { limit = 20, language = 'all' } = req.query;
    const parsedLimit = parseBoundedInteger(limit, 20, 100);
    if (parsedLimit === null) return res.status(400).json({ success: false, message: 'limit must be between 1 and 100.' });
    const tracks = await MusicAggregator.getTrending(parsedLimit, language);
    res.json({ success: true, tracks, language });
  } catch (err) {
    next(err);
  }
};

// GET /api/music/new-releases?limit=20&language=all|tamil|hindi|english
exports.getNewReleases = async (req, res, next) => {
  try {
    const { limit = 20, language = 'all' } = req.query;
    const parsedLimit = parseBoundedInteger(limit, 20, 100);
    if (parsedLimit === null) return res.status(400).json({ success: false, message: 'limit must be between 1 and 100.' });
    const tracks = await MusicAggregator.getNewReleases(parsedLimit, language);
    res.json({ success: true, tracks, language });
  } catch (err) {
    next(err);
  }
};

// GET /api/music/charts?language=all|tamil|english|hindi|telugu
exports.getCharts = async (req, res, next) => {
  try {
    const { language = 'all' } = req.query;
    const charts = await MusicAggregator.getCharts(language);
    res.json({ success: true, charts });
  } catch (err) {
    next(err);
  }
};

// GET /api/music/languages?era=all|new|old
exports.getAllLanguages = async (req, res, next) => {
  try {
    const { era = 'all' } = req.query;
    const data = await MusicAggregator.getAllLanguages(era);
    res.json({ success: true, languages: data, era });
  } catch (err) {
    next(err);
  }
};

// GET /api/music/resolve-link?url=...
exports.resolveLink = async (req, res, next) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ success: false, message: 'url parameter is required' });

    const track = await MusicAggregator.resolveLink(url);
    if (!track) return res.status(404).json({ success: false, message: 'Could not resolve audio for link.' });

    res.json({ success: true, track });
  } catch (err) {
    next(err);
  }
};

// GET /api/music/genres
exports.getGenres = async (req, res, next) => {
  try {
    const genres = MusicAggregator.getGenres();
    res.json({ success: true, genres });
  } catch (err) {
    next(err);
  }
};

// GET /api/music/genres/:id/tracks
exports.getGenreTracks = async (req, res, next) => {
  try {
    const parsedLimit = parseBoundedInteger(req.query.limit, 20, 100);
    if (parsedLimit === null) return res.status(400).json({ success: false, message: 'limit must be between 1 and 100.' });
    const tracks = await MusicAggregator.getTracksByGenre(req.params.id, parsedLimit);
    res.json({ success: true, tracks, genre: req.params.id });
  } catch (err) {
    next(err);
  }
};

// GET /api/music/artists
exports.getPopularArtists = async (req, res, next) => {
  try {
    const parsedLimit = parseBoundedInteger(req.query.limit, 12, 100);
    if (parsedLimit === null) return res.status(400).json({ success: false, message: 'limit must be between 1 and 100.' });
    const artists = await MusicAggregator.getPopularArtists(parsedLimit);
    res.json({ success: true, artists });
  } catch (err) {
    next(err);
  }
};

// GET /api/music/tracks/:id
exports.getTrack = async (req, res, next) => {
  try {
    const track = await MusicAggregator.getTrack(req.params.id);
    if (!track) return res.status(404).json({ success: false, message: 'Track not found.' });
    res.json({ success: true, track });
  } catch (err) {
    next(err);
  }
};

// GET /api/music/popular-albums?limit=12&language=all
exports.getPopularAlbums = async (req, res, next) => {
  try {
    const { language = 'all' } = req.query;
    const parsedLimit = parseBoundedInteger(req.query.limit, 12, 100);
    if (parsedLimit === null) return res.status(400).json({ success: false, message: 'limit must be between 1 and 100.' });
    const albums = await MusicAggregator.getPopularAlbums(parsedLimit, language);
    res.json({ success: true, albums, language });
  } catch (err) {
    next(err);
  }
};

// GET /api/music/albums/:id
exports.getAlbum = async (req, res, next) => {
  try {
    const album = await MusicAggregator.getAlbum(req.params.id);
    if (!album) return res.status(404).json({ success: false, message: 'Album not found.' });
    res.json({ success: true, album });
  } catch (err) {
    next(err);
  }
};

// GET /api/music/artists/:id
exports.getArtist = async (req, res, next) => {
  try {
    const artist = await MusicAggregator.getArtist(req.params.id);
    if (!artist) return res.status(404).json({ success: false, message: 'Artist not found.' });
    const tracks = await MusicAggregator.getTracksByArtist(req.params.id);
    res.json({ success: true, artist, tracks });
  } catch (err) {
    next(err);
  }
};

// GET /api/music/lyrics?title=...&artist=...&album=...&duration=...
exports.getLyrics = async (req, res, next) => {
  try {
    const { title, artist, album, duration } = req.query;
    if (!title) {
      return res.status(400).json({ success: false, message: 'title is required' });
    }

    const parsedDuration = duration === undefined ? undefined : Number(duration);
    if (duration !== undefined && (!Number.isFinite(parsedDuration) || parsedDuration < 0 || parsedDuration > 86400)) {
      return res.status(400).json({ success: false, message: 'duration must be between 0 and 86400 seconds.' });
    }

    const LyricsService = require('../services/lyricsService');
    const lyricsData = await LyricsService.getLyrics({
      title,
      artist,
      album,
      duration: parsedDuration,
    });

    if (!lyricsData) {
      return res.json({
        success: true,
        found: false,
        message: 'Lyrics not found for this track',
        lyrics: null,
      });
    }

    res.json({
      success: true,
      found: true,
      lyrics: lyricsData,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/music/stream?url=...
exports.streamAudio = async (req, res, next) => {
  try {
    const { url, download, filename } = req.query;
    if (!url) return res.status(400).send('url parameter is required');

    const axios = require('axios');
    const range = req.headers.range;
    const headers = {};
    if (range) headers.range = range;

    const response = await axios({
      method: 'get',
      url,
      responseType: 'stream',
      headers,
      timeout: 25000,
      validateStatus: () => true,
    });

    res.set('Access-Control-Allow-Origin', '*');
    res.set('Content-Type', response.headers['content-type'] || 'audio/mpeg');
    if (response.headers['content-range']) res.set('Content-Range', response.headers['content-range']);
    if (response.headers['content-length']) res.set('Content-Length', response.headers['content-length']);
    if (response.headers['accept-ranges']) res.set('Accept-Ranges', response.headers['accept-ranges']);

    if (download === 'true' || download === '1') {
      const safeName = (filename || 'track.mp3').replace(/[^a-zA-Z0-9._-]/g, '_');
      res.set('Content-Disposition', `attachment; filename="${safeName}"`);
    }

    req.on('close', () => {
      try {
        if (response.data && !response.data.destroyed) {
          response.data.destroy();
        }
      } catch {}
    });

    response.data.on('error', (err) => {
      if (!res.headersSent) next(err);
      else res.end();
    });

    res.status(response.status);
    response.data.pipe(res);
  } catch (err) {
    next(err);
  }
};

// GET /api/music/mood-recommendations?mood=sad|love|happy|party|chill|workout|rain|devotional&language=all|tamil|hindi|english|telugu&limit=30
exports.getMoodRecommendations = async (req, res, next) => {
  try {
    const { mood = 'love', language = 'all', limit = 30 } = req.query;
    const parsedLimit = parseBoundedInteger(limit, 30, 100);
    if (parsedLimit === null) return res.status(400).json({ success: false, message: 'limit must be between 1 and 100.' });

    const MOOD_MAP = {
      sad: 'Sad Emotional Heartbreak Pain Melancholy Songs',
      love: 'Romantic Love Melodies Duets Feeling Songs',
      romantic: 'Romantic Love Melodies Duets Feeling Songs',
      happy: 'Happy Upbeat Joyful Feel Good Celebration Hits',
      party: 'Dance Party Club Kuthu High Bass Bangers',
      chill: 'Chill Acoustic Lo-Fi Relaxing Soft Peaceful Songs',
      workout: 'High Energy Workout Gym Motivation Bass Pump Songs',
      rain: 'Rain Songs Monsoon Nostalgia Evergreen Melodies',
      devotional: 'Devotional Spiritual Bhakti Peaceful Chants',
      mix: 'Top Mega Superhit Melodies All Time Best Songs',
    };

    const moodKey = (mood || 'love').toLowerCase();
    const moodQuery = MOOD_MAP[moodKey] || MOOD_MAP.love;

    const langPrefix = language && language !== 'all' ? `${language} ` : '';
    const query = `${langPrefix}${moodQuery}`;

    const tracks = await MusicAggregator.searchTracks(query, {
      limit: parsedLimit,
      language: language.toLowerCase(),
      source: 'all',
    });

    res.json({
      success: true,
      mood: moodKey,
      language: language.toLowerCase(),
      tracks,
      total: tracks.length,
    });
  } catch (err) {
    next(err);
  }
};
