/**
 * Spotify Music Provider & Resolver
 * Enables searching and importing Spotify tracks and playlists into the app.
 * Resolves songs to high-fidelity audio streams for playback and playlist storage.
 */

const axios = require('axios');
const SaavnProvider = require('./saavnProvider');

function parseSpotifyId(input) {
  if (!input) return null;
  // Match spotify track URL
  const trackMatch = input.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?track\/([a-zA-Z0-9]+)/);
  if (trackMatch) return { type: 'track', id: trackMatch[1] };

  // Match spotify playlist URL
  const playlistMatch = input.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?playlist\/([a-zA-Z0-9]+)/);
  if (playlistMatch) return { type: 'playlist', id: playlistMatch[1] };

  // Match spotify URI
  if (input.startsWith('spotify:track:')) return { type: 'track', id: input.replace('spotify:track:', '') };
  if (input.startsWith('spotify:playlist:')) return { type: 'playlist', id: input.replace('spotify:playlist:', '') };

  return null;
}

const SpotifyProvider = {
  /**
   * Resolve a Spotify URL using oEmbed and match high-quality audio
   */
  async resolveSpotifyUrl(url) {
    try {
      const oembedRes = await axios.get('https://open.spotify.com/oembed', {
        params: { url },
        timeout: 6000,
      });

      const data = oembedRes.data;
      if (!data) return null;

      const title = data.title || 'Unknown Track';
      const artworkUrl = data.thumbnail_url || null;

      // Extract artist from title if possible (often format: "Title by Artist")
      let songTitle = title;
      let artist = 'Spotify Artist';
      if (title.includes(' by ')) {
        const parts = title.split(' by ');
        songTitle = parts[0].trim();
        artist = parts[1].trim();
      }

      // Match high quality audio stream
      let streamUrl = null;
      let matchedDuration = 0;
      try {
        const matches = await SaavnProvider.searchTracks(`${songTitle} ${artist}`, 2);
        if (matches?.length && matches[0].streamUrl) {
          streamUrl = matches[0].streamUrl;
          matchedDuration = matches[0].duration;
        }
      } catch {}

      const parsed = parseSpotifyId(url);
      const trackId = parsed?.id || Math.random().toString(36).substring(2, 9);

      return {
        id: `spotify-${trackId}`,
        rawId: trackId,
        title: songTitle,
        artist,
        album: 'Spotify Track',
        duration: matchedDuration || 180,
        artworkUrl,
        streamUrl,
        source: 'spotify',
        spotifyUrl: url,
      };
    } catch (err) {
      console.warn('Spotify oEmbed resolve error:', err.message);
      return null;
    }
  },

  /**
   * Search Spotify (queries Saavn and tags with Spotify source matching)
   */
  async searchTracks(query, limit = 15) {
    try {
      // Check if it's a Spotify link
      const parsed = parseSpotifyId(query);
      if (parsed) {
        const direct = await this.resolveSpotifyUrl(query);
        if (direct) return [direct];
      }

      // Search matching songs and tag them
      const results = await SaavnProvider.searchTracks(query, limit);
      return results.map((t) => ({
        ...t,
        id: t.id.replace('saavn-', 'spotify-'),
        source: 'spotify',
      }));
    } catch (err) {
      console.warn('Spotify search error:', err.message);
      return [];
    }
  },

  parseSpotifyId,
};

module.exports = SpotifyProvider;
