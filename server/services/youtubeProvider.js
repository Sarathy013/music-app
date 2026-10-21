const ytSearch = require('yt-search');
const SaavnProvider = require('./saavnProvider');

function parseYouTubeId(input) {
  if (!input) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;
  const match = input.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
  return match ? match[1] : null;
}

function cleanTitle(title) {
  if (!title) return '';
  return title
    .replace(/\s*\(Official Video\)/gi, '')
    .replace(/\s*\[Official Video\]/gi, '')
    .replace(/\s*\(Official Music Video\)/gi, '')
    .replace(/\s*\[Official Music Video\]/gi, '')
    .replace(/\s*\(Audio\)/gi, '')
    .replace(/\s*\[Audio\]/gi, '')
    .replace(/\s*\(Lyric Video\)/gi, '')
    .replace(/\s*\[Lyric Video\]/gi, '')
    .replace(/\s*\(Full Video\)/gi, '')
    .replace(/\s*\[Full Video\]/gi, '')
    .replace(/\s*\(Lyrical Video\)/gi, '')
    .replace(/\s*\|.*$/g, '')
    .replace(/ft\..*$/gi, '')
    .trim();
}

async function matchStreamForYouTube(title, artist) {
  const queries = [
    `${title} ${artist}`,
    title,
  ];

  for (const q of queries) {
    try {
      const matches = await SaavnProvider.searchTracks(q.trim(), 4);
      const found = matches.find((m) => m && m.streamUrl);
      if (found) {
        return {
          streamUrl: found.streamUrl,
          duration: found.duration,
          artworkUrl: found.artworkUrl,
        };
      }
    } catch {}
  }
  return null;
}

const YouTubeProvider = {
  async searchTracks(query, limit = 15) {
    try {
      const ytId = parseYouTubeId(query);
      if (ytId) {
        const directTrack = await this.getTrack(`yt-${ytId}`);
        if (directTrack) return [directTrack];
      }

      const res = await ytSearch(query);
      const videos = (res.videos || []).slice(0, limit);

      // Match tracks in parallel so YouTube songs have valid 320k streamUrls immediately
      const tracks = await Promise.all(
        videos.map(async (v) => {
          const cleaned = cleanTitle(v.title);
          const authorName = v.author?.name || 'YouTube Artist';
          const match = await matchStreamForYouTube(cleaned, authorName);

          return {
            id: `yt-${v.videoId}`,
            rawId: v.videoId,
            title: cleaned,
            artist: authorName,
            album: 'YouTube Music',
            duration: match?.duration || v.seconds || 0,
            artworkUrl: match?.artworkUrl || v.thumbnail || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
            streamUrl: match?.streamUrl || null,
            source: 'youtube',
            youtubeUrl: v.url,
            views: v.views,
            uploadedAt: v.ago,
          };
        })
      );

      // Only return playable tracks with valid streamUrls
      const playable = tracks.filter((t) => t.streamUrl);
      return playable.length > 0 ? playable : tracks;
    } catch (err) {
      console.warn('YouTube searchTracks error:', err.message);
      return [];
    }
  },

  async getTrack(id) {
    const videoId = id.replace('yt-', '');
    try {
      const res = await ytSearch({ videoId });
      if (!res) return null;

      const title = cleanTitle(res.title);
      const artist = res.author?.name || 'YouTube Artist';
      const artworkUrl = res.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
      const duration = res.seconds || 0;

      const match = await matchStreamForYouTube(title, artist);

      return {
        id: `yt-${videoId}`,
        rawId: videoId,
        title,
        artist,
        album: 'YouTube Music',
        duration: match?.duration || duration,
        artworkUrl: match?.artworkUrl || artworkUrl,
        streamUrl: match?.streamUrl || null,
        source: 'youtube',
        youtubeUrl: res.url,
      };
    } catch (err) {
      console.warn('YouTube getTrack error:', err.message);
      return null;
    }
  },

  async resolveStream(track) {
    if (track.streamUrl) return track.streamUrl;
    const match = await matchStreamForYouTube(track.title, track.artist);
    return match?.streamUrl || null;
  },

  parseYouTubeId,
};

module.exports = YouTubeProvider;
