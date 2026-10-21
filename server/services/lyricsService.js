const axios = require('axios');

function normalizeQuery(str) {
  if (!str) return '';
  return str
    .replace(/\s*\(From "[^"]*"\)/gi, '')
    .replace(/\s*\(From '[^']*'\)/gi, '')
    .replace(/\s*\[From "[^"]*"\]/gi, '')
    .replace(/\s*\(Original Motion Picture Soundtrack\)/gi, '')
    .replace(/\s*\(Lofi Flip\)/gi, '')
    .replace(/\s*\(Dance Mix\)/gi, '')
    .replace(/\s*\(Slowed.*Reverb\)/gi, '')
    .replace(/\s*\(Official Video\)/gi, '')
    .replace(/\s*\(Lyrics\)/gi, '')
    .replace(/\s*\(Audio\)/gi, '')
    .replace(/\s*-\s*Telugu/gi, '')
    .replace(/\s*-\s*Tamil/gi, '')
    .replace(/\s*-\s*Hindi/gi, '')
    .replace(/["'’]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getPrimaryArtist(artistStr) {
  if (!artistStr) return '';
  return artistStr.split(/[,/&•]|feat\.|ft\./i)[0].trim();
}

class LyricsService {
  static async getLyrics({ title, artist, album, duration }) {
    const cleanTitle = normalizeQuery(title);
    const primaryArtist = getPrimaryArtist(artist);
    const cleanAlbum = normalizeQuery(album);

    // 1. Try LRCLIB exact get API
    try {
      const getParams = {
        track_name: cleanTitle,
        artist_name: primaryArtist,
      };
      if (cleanAlbum) getParams.album_name = cleanAlbum;
      if (duration && duration > 0) getParams.duration = Math.round(duration);

      const res = await axios.get('https://lrclib.net/api/get', {
        params: getParams,
        headers: { 'User-Agent': 'VibeStreamApp/1.0 (https://vibestream.app)' },
        timeout: 4500,
      });

      if (res.data && (res.data.syncedLyrics || res.data.plainLyrics)) {
        return {
          id: res.data.id,
          trackName: res.data.trackName,
          artistName: res.data.artistName,
          syncedLyrics: res.data.syncedLyrics || null,
          plainLyrics: res.data.plainLyrics || null,
          isSynced: !!res.data.syncedLyrics,
          source: 'lrclib',
        };
      }
    } catch (err) {}

    // 2. Try LRCLIB search API
    const searchQueries = [
      `${cleanTitle} ${primaryArtist}`,
      cleanTitle,
      `${title} ${primaryArtist}`,
    ];

    for (const q of searchQueries) {
      try {
        const res = await axios.get('https://lrclib.net/api/search', {
          params: { q: q.trim() },
          headers: { 'User-Agent': 'VibeStreamApp/1.0 (https://vibestream.app)' },
          timeout: 4500,
        });

        const list = res.data || [];
        if (list.length > 0) {
          const best = list.find((item) => item.syncedLyrics) || list.find((item) => item.plainLyrics) || list[0];
          if (best && (best.syncedLyrics || best.plainLyrics)) {
            return {
              id: best.id,
              trackName: best.trackName,
              artistName: best.artistName,
              syncedLyrics: best.syncedLyrics || null,
              plainLyrics: best.plainLyrics || null,
              isSynced: !!best.syncedLyrics,
              source: 'lrclib',
            };
          }
        }
      } catch (err) {}
    }

    // 3. Fallback to Lyrics.ovh
    try {
      const ovhRes = await axios.get(
        `https://api.lyrics.ovh/v1/${encodeURIComponent(primaryArtist)}/${encodeURIComponent(cleanTitle)}`,
        { timeout: 4000 }
      );
      if (ovhRes.data?.lyrics) {
        return {
          id: null,
          trackName: cleanTitle,
          artistName: primaryArtist,
          syncedLyrics: null,
          plainLyrics: ovhRes.data.lyrics.trim(),
          isSynced: false,
          source: 'lyrics.ovh',
        };
      }
    } catch (err) {}

    return null;
  }
}

module.exports = LyricsService;
