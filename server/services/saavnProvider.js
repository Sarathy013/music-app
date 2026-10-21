/**
 * JioSaavn Music Provider
 * Powers Tamil, Hindi, English, and worldwide music search and streaming.
 * Provides direct 320kbps / 160kbps MP4/AAC streams and 500x500 HD album art.
 */

const axios = require('axios');
const CryptoJS = require('crypto-js');

const SAAVN_API_BASE = 'https://www.jiosaavn.com/api.php';
const DES_KEY = '38346591';

// Decode HTML entities commonly found in song titles
function cleanText(text) {
  if (!text) return '';
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

// Upgrade thumbnail to crisp 500x500 resolution
function upgradeArtwork(imageUrl) {
  if (!imageUrl) return null;
  return imageUrl
    .replace('50x50', '500x500')
    .replace('150x150', '500x500');
}

// Decrypt DES-ECB encrypted media stream URL
function decryptMediaUrl(encryptedUrl) {
  if (!encryptedUrl) return null;
  try {
    const key = CryptoJS.enc.Utf8.parse(DES_KEY);
    const decrypted = CryptoJS.DES.decrypt(
      { ciphertext: CryptoJS.enc.Base64.parse(encryptedUrl) },
      key,
      { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 }
    );
    const raw = decrypted.toString(CryptoJS.enc.Utf8);
    if (!raw) return null;
    // Replace 96kbps with pristine 320kbps audio stream
    return raw.replace('_96.mp4', '_320.mp4');
  } catch (err) {
    console.warn('Saavn DES decryption error:', err.message);
    return null;
  }
}

// Format raw Saavn track object into standard FreeBeat track structure
function formatTrack(raw) {
  if (!raw) return null;

  const id = raw.id || raw.songid;
  const moreInfo = raw.more_info || {};
  const encMedia = moreInfo.encrypted_media_url || raw.encrypted_media_url;
  const streamUrl = decryptMediaUrl(encMedia);

  const title = cleanText(raw.title || raw.song);
  
  // Extract primary artists / singers
  let artist = '';
  if (moreInfo.artistMap?.primary_artists?.length) {
    artist = moreInfo.artistMap.primary_artists.map((a) => cleanText(a.name)).join(', ');
  } else if (moreInfo.music) {
    artist = cleanText(moreInfo.music);
  } else if (raw.singers) {
    artist = cleanText(raw.singers);
  } else if (raw.subtitle) {
    // raw.subtitle often format: "Artist1, Artist2 - Movie"
    const parts = raw.subtitle.split('-');
    artist = cleanText(parts[0]);
  } else {
    artist = 'Unknown Artist';
  }

  const album = cleanText(moreInfo.album || raw.album || '');
  const duration = Number(moreInfo.duration || raw.duration || 0);
  const artworkUrl = upgradeArtwork(raw.image);
  const language = (raw.language || 'hindi').toLowerCase();
  const year = raw.year || moreInfo.release_date?.slice(0, 4) || null;

  return {
    id: `saavn-${id}`,
    rawId: id,
    title,
    artist,
    album,
    duration,
    artworkUrl,
    streamUrl,
    previewUrl: streamUrl,
    genre: language ? `${language.charAt(0).toUpperCase() + language.slice(1)} Music` : 'Popular',
    language,
    year,
    source: 'saavn',
    license: 'Streaming License',
  };
}

const SaavnProvider = {
  /**
   * Search single page from JioSaavn
   */
  async searchSinglePage(query, limit = 40, page = 1, language = null) {
    try {
      let searchQuery = query;
      if (language && language !== 'all') {
        if (!query.toLowerCase().includes(language.toLowerCase())) {
          searchQuery = `${query} ${language}`;
        }
      }

      const response = await axios.get(SAAVN_API_BASE, {
        params: {
          __call: 'search.getResults',
          _format: 'json',
          _marker: '0',
          api_version: '4',
          ctx: 'web6dot0',
          n: Math.min(50, limit),
          p: page,
          q: searchQuery,
        },
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        timeout: 9000,
      });

      const items = response.data?.results || [];
      let formatted = items.map(formatTrack).filter((t) => t && t.streamUrl);

      if (language && language !== 'all') {
        const langLower = language.toLowerCase();
        formatted = formatted.sort((a, b) => {
          const aMatch = a.language === langLower ? 1 : 0;
          const bMatch = b.language === langLower ? 1 : 0;
          return bMatch - aMatch;
        });
      }

      return formatted;
    } catch (err) {
      console.warn('Saavn searchSinglePage error:', err.message);
      return [];
    }
  },

  /**
   * Search songs with auto-pagination for large limits
   */
  async searchTracks(query, limit = 20, page = 1, language = null) {
    if (limit <= 40) {
      return this.searchSinglePage(query, limit, page, language);
    }

    // Auto-paginate in parallel to fulfill requests up to hundreds or 1000 songs
    const pagesToFetch = Math.min(25, Math.ceil(limit / 40));
    const startPage = (page - 1) * pagesToFetch + 1;
    const promises = [];
    for (let i = 0; i < pagesToFetch; i++) {
      promises.push(this.searchSinglePage(query, 40, startPage + i, language));
    }

    const pages = await Promise.all(promises);
    const seen = new Set();
    const result = [];
    for (const list of pages) {
      for (const t of list) {
        if (t && t.id && !seen.has(t.id)) {
          seen.add(t.id);
          result.push(t);
        }
      }
    }
    return result.slice(0, limit);
  },

  /**
   * Search artists / singers
   */
  async searchArtists(query, limit = 10) {
    try {
      const response = await axios.get(SAAVN_API_BASE, {
        params: {
          __call: 'search.getArtistResults',
          _format: 'json',
          _marker: '0',
          api_version: '4',
          ctx: 'web6dot0',
          n: limit,
          p: 1,
          q: query,
        },
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 9000,
      });

      const results = response.data?.results || [];
      return results.map((a) => ({
        id: `saavn-artist-${a.artistid || a.id}`,
        rawId: a.artistid || a.id,
        name: cleanText(a.name),
        role: a.role || 'Artist',
        artworkUrl: upgradeArtwork(a.image),
        source: 'saavn',
      }));
    } catch (err) {
      console.warn('Saavn searchArtists error:', err.message);
      return [];
    }
  },

  /**
   * Search albums
   */
  async searchAlbums(query, limit = 10) {
    try {
      const response = await axios.get(SAAVN_API_BASE, {
        params: {
          __call: 'search.getAlbumResults',
          _format: 'json',
          _marker: '0',
          api_version: '4',
          ctx: 'web6dot0',
          n: limit,
          p: 1,
          q: query,
        },
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 9000,
      });

      const results = response.data?.results || [];
      return results.map((a) => ({
        id: `saavn-album-${a.id}`,
        rawId: a.id,
        name: cleanText(a.title),
        artist: cleanText(a.artist || a.music || 'Various Artists'),
        year: a.year || null,
        artworkUrl: upgradeArtwork(a.image),
        source: 'saavn',
      }));
    } catch (err) {
      console.warn('Saavn searchAlbums error:', err.message);
      return [];
    }
  },

  /**
   * Get track details by ID
   */
  async getTrack(id) {
    const rawId = id.replace('saavn-', '');
    try {
      const response = await axios.get(SAAVN_API_BASE, {
        params: {
          __call: 'song.getDetails',
          _format: 'json',
          _marker: '0',
          api_version: '4',
          ctx: 'web6dot0',
          pids: rawId,
        },
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 9000,
      });

      const songData = response.data?.songs?.[0] || response.data?.[rawId];
      if (songData) {
        return formatTrack(songData);
      }
      return null;
    } catch (err) {
      console.warn('Saavn getTrack error:', err.message);
      return null;
    }
  },

  /**
   * Get album details and tracklist
   */
  async getAlbum(id) {
    const rawId = id.replace('saavn-album-', '').replace('saavn-', '');
    try {
      const response = await axios.get(SAAVN_API_BASE, {
        params: {
          __call: 'content.getAlbumDetails',
          _format: 'json',
          _marker: '0',
          api_version: '4',
          ctx: 'web6dot0',
          albumid: rawId,
        },
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 9000,
      });

      const data = response.data;
      if (!data) return null;

      const tracks = (data.list || []).map(formatTrack).filter((t) => t && t.streamUrl);

      return {
        id: `saavn-album-${rawId}`,
        name: cleanText(data.title),
        artist: cleanText(data.primary_artists || data.artist || 'Various Artists'),
        year: data.year,
        artworkUrl: upgradeArtwork(data.image),
        source: 'saavn',
        tracks,
      };
    } catch (err) {
      console.warn('Saavn getAlbum error:', err.message);
      return null;
    }
  },

  /**
   * Get artist details and top songs
   */
  async getArtist(id) {
    const rawId = id.replace('saavn-artist-', '').replace('saavn-', '');
    try {
      const response = await axios.get(SAAVN_API_BASE, {
        params: {
          __call: 'artist.getArtistPageDetails',
          _format: 'json',
          _marker: '0',
          api_version: '4',
          ctx: 'web6dot0',
          artistId: rawId,
          n_song: 30,
        },
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 9000,
      });

      const data = response.data;
      if (!data) return null;

      const tracks = (data.topSongs || []).map(formatTrack).filter((t) => t && t.streamUrl);

      return {
        id: `saavn-artist-${rawId}`,
        name: cleanText(data.name),
        bio: cleanText(data.bio || ''),
        artworkUrl: upgradeArtwork(data.image),
        source: 'saavn',
        tracks,
      };
    } catch (err) {
      console.warn('Saavn getArtist error:', err.message);
      return null;
    }
  },

  /**
   * Get top tracks by artist
   */
  async getTracksByArtist(artistId, limit = 30) {
    const artist = await this.getArtist(artistId);
    return artist?.tracks ? artist.tracks.slice(0, limit) : [];
  },

  /**
   * Trending songs with optional language filter
   */
  async getTrending(limit = 20, language = 'all') {
    let query = 'Trending Songs';
    if (language === 'tamil') query = 'Top Tamil Songs';
    else if (language === 'hindi') query = 'Top Hindi Songs';
    else if (language === 'english') query = 'Top Global English Hits';
    else if (language === 'telugu') query = 'Top Telugu Songs';

    return this.searchTracks(query, limit, 1, language);
  },

  /**
   * New releases with optional language filter
   */
  async getNewReleases(limit = 20, language = 'all') {
    let query = 'Latest Releases';
    if (language === 'tamil') query = 'Latest Tamil Songs 2024';
    else if (language === 'hindi') query = 'Latest Hindi Songs 2024';
    else if (language === 'english') query = 'Latest English Pop 2024';
    else if (language === 'telugu') query = 'Latest Telugu Songs 2024';

    return this.searchTracks(query, limit, 1, language);
  },

  /**
   * Curated language charts (Top Tamil, Top English, Top Hindi, Top Telugu)
   */
  async getCharts(language = 'all') {
    const queries = {
      tamil: ['Tamil Top 50', 'Anirudh Hits', 'AR Rahman Tamil Hits', 'Latest Kollywood Hits'],
      english: ['Global Top 50', 'Today Top Hits English', 'Billboard Hot 100', 'Taylor Swift Hits'],
      hindi: ['Hindi Top 50', 'Arijit Singh Hits', 'Bollywood Romance Hits', 'Latest Hindi Hits'],
      telugu: ['Telugu Top 50', 'Tollywood Hits', 'Devi Sri Prasad Hits', 'Thaman S Hits', 'Latest Telugu Hits'],
    };

    const targetLangs = language === 'all' ? ['tamil', 'english', 'hindi', 'telugu'] : [language];
    const results = {};

    for (const lang of targetLangs) {
      const qList = queries[lang] || [`Top ${lang} Songs`];
      const tracks = await this.searchTracks(qList[0], 20, 1, lang);
      results[lang] = tracks;
    }

    return results;
  },

  /**
   * Retrieve categorized music across all languages (Tamil, English, Hindi, Telugu)
   * Supporting both New Hits and Golden Old Classics
   */
  async getAllLanguagesMusic(era = 'all') {
    const configs = {
      tamil: {
        name: 'Tamil',
        label: '🦁 Tamil (தமிழ்)',
        newQueries: [
          'Latest Tamil Songs 2024 Anirudh',
          'AR Rahman Tamil Superhits',
          'Top Kollywood Hits Vijay Ajith',
          'Tamil Dance Kuthu Hits',
          'Santhosh Narayanan Tamil Hits',
          'Tamil Love Melodies Yuvan Harris',
        ],
        oldQueries: [
          'Classic Tamil Old 80s 90s Ilaiyaraaja SPB',
          'Tamil Evergreen Love Melodies Janaki',
          'SP Balasubrahmanyam Tamil Classics',
          'Tamil 70s 80s Golden Hits TMS Susheela',
          'Tamil 2000s Hits Vidyasagar Deva',
          'K J Yesudas Tamil Hit Songs',
        ],
      },
      english: {
        name: 'English',
        label: '🌍 English (Global)',
        newQueries: [
          'Billboard Hot 100 Hits',
          'Today Top Hits Global Pop',
          'Taylor Swift The Weeknd Hits',
          'Global Dance Pop EDM Hits Dua Lipa',
          'Ed Sheeran Bruno Mars Acoustic Melodies',
          'Viral English Pop Hits 2024',
        ],
        oldQueries: [
          'Classic English 70s 80s 90s Rock Pop Queen',
          'Retro English Pop Hits Michael Jackson',
          'Classic Rock 80s 90s Hits',
          'Acoustic Classics 90s English',
          'Golden English Pop Evergreen Beatles',
          'Retro 80s Synthpop Hits',
        ],
      },
      hindi: {
        name: 'Hindi',
        label: '🇮🇳 Hindi (हिंदी)',
        newQueries: [
          'Latest Bollywood Hits 2024',
          'Arijit Singh Romantic Hits',
          'Top Hindi Romantic Hits Pritam',
          'Bollywood Party Dance Hits',
          'Atif Aslam Shreya Ghoshal Hits',
          'Bollywood 2020s Melodies',
        ],
        oldQueries: [
          'Old Hindi Songs Kishore Kumar Lata 70s 80s',
          '90s Evergreen Bollywood Songs Alka Udit Kumar Sanu',
          'RD Burman Evergreen Hits',
          'Mohammad Rafi Classic Hits',
          'Sonu Nigam KK 2000s Hits',
          'Mukesh Asha Bhosle Retro Hindi',
        ],
      },
      telugu: {
        name: 'Telugu',
        label: '⚡ Telugu (తెలుగు)',
        newQueries: [
          'Telugu Latest Songs Tollywood 2024',
          'Devi Sri Prasad DSP Telugu Hits',
          'Thaman S Telugu Superhits',
          'Sid Sriram Telugu Melodies',
          'Allu Arjun Mahesh Babu Telugu Hits',
          'Telugu Romantic Love Songs',
        ],
        oldQueries: [
          'SPB Telugu Golden Classics',
          'Classic Telugu Songs Ilaiyaraaja Old',
          '90s Tollywood Evergreen Songs',
          'Ghantasala Susheela Telugu Classics',
          'Telugu 80s Golden Hits',
          'Keeravani Telugu Classic Melodies',
        ],
      },
    };

    const dedupList = (list) => {
      const seen = new Set();
      return (list || []).filter((t) => {
        if (!t || !t.id) return false;
        if (seen.has(t.id)) return false;
        seen.add(t.id);
        return true;
      });
    };

    const result = {};

    await Promise.all(
      Object.keys(configs).map(async (langKey) => {
        const item = configs[langKey];
        try {
          if (era === 'new') {
            const promises = item.newQueries.map((q) => this.searchSinglePage(q, 40, 1, langKey));
            const responses = await Promise.allSettled(promises);
            const collected = responses
              .filter((r) => r.status === 'fulfilled')
              .flatMap((r) => r.value || []);
            result[langKey] = {
              title: item.label,
              language: langKey,
              tracks: dedupList(collected),
            };
          } else if (era === 'old') {
            const promises = item.oldQueries.map((q) => this.searchSinglePage(q, 40, 1, langKey));
            const responses = await Promise.allSettled(promises);
            const collected = responses
              .filter((r) => r.status === 'fulfilled')
              .flatMap((r) => r.value || []);
            result[langKey] = {
              title: item.label,
              language: langKey,
              tracks: dedupList(collected),
            };
          } else {
            // 'all' era - load rich 350-500+ songs catalog across new & old
            const newPromises = item.newQueries.map((q) => this.searchSinglePage(q, 40, 1, langKey));
            const oldPromises = item.oldQueries.map((q) => this.searchSinglePage(q, 40, 1, langKey));

            const [newRes, oldRes] = await Promise.all([
              Promise.allSettled(newPromises),
              Promise.allSettled(oldPromises),
            ]);

            const newTracks = dedupList(
              newRes.filter((r) => r.status === 'fulfilled').flatMap((r) => r.value || [])
            );
            const oldTracks = dedupList(
              oldRes.filter((r) => r.status === 'fulfilled').flatMap((r) => r.value || [])
            );
            const combined = dedupList([...newTracks, ...oldTracks]);

            result[langKey] = {
              title: item.label,
              language: langKey,
              newTracks,
              oldTracks,
              tracks: combined,
            };
          }
        } catch (err) {
          console.warn(`Error fetching ${langKey} music:`, err.message);
          result[langKey] = {
            title: item.label,
            language: langKey,
            newTracks: [],
            oldTracks: [],
            tracks: [],
          };
        }
      })
    );

    return result;
  },
};

module.exports = SaavnProvider;
