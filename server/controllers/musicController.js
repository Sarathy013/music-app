const MusicAggregator = require('../services/musicAggregator');

// GET /api/music/search?q=...&type=tracks|composers|albums&limit=20&page=1&language=all|tamil|hindi|english&source=all|saavn|youtube|spotify
exports.search = async (req, res, next) => {
  try {
    const { q, type = 'tracks', limit = 20, page = 1, language = 'all', source = 'all' } = req.query;
    if (!q) return res.status(400).json({ success: false, message: 'Query parameter q is required.' });

    let results = [];
    if (type === 'tracks') {
      results = await MusicAggregator.searchTracks(q, {
        limit: Number(limit),
        page: Number(page),
        language,
        source,
      });
    } else if (type === 'composers' || type === 'artists') {
      results = await MusicAggregator.searchComposers(q, Number(limit));
    } else if (type === 'albums') {
      results = await MusicAggregator.searchAlbums(q, Number(limit));
    }

    res.json({
      success: true,
      results,
      query: q,
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
    const tracks = await MusicAggregator.getTrending(Number(limit), language);
    res.json({ success: true, tracks, language });
  } catch (err) {
    next(err);
  }
};

// GET /api/music/new-releases?limit=20&language=all|tamil|hindi|english
exports.getNewReleases = async (req, res, next) => {
  try {
    const { limit = 20, language = 'all' } = req.query;
    const tracks = await MusicAggregator.getNewReleases(Number(limit), language);
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
    const { limit = 20 } = req.query;
    const tracks = await MusicAggregator.getTracksByGenre(req.params.id, Number(limit));
    res.json({ success: true, tracks, genre: req.params.id });
  } catch (err) {
    next(err);
  }
};

// GET /api/music/artists
exports.getPopularArtists = async (req, res, next) => {
  try {
    const { limit = 12 } = req.query;
    const artists = await MusicAggregator.getPopularArtists(Number(limit));
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

    const LyricsService = require('../services/lyricsService');
    const lyricsData = await LyricsService.getLyrics({
      title,
      artist,
      album,
      duration: duration ? Number(duration) : undefined,
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
