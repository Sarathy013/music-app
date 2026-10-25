/**
 * Format milliseconds → m:ss
 */
export function formatDuration(ms) {
  if (!ms || isNaN(ms)) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Format seconds → m:ss
 */
export function formatSeconds(sec) {
  if (!sec || isNaN(sec)) return '0:00';
  const minutes = Math.floor(sec / 60);
  const seconds = Math.floor(sec % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Friendly relative time  e.g. "2 hours ago"
 */
export function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

/**
 * Truncate string to maxLen
 */
export function truncate(str, maxLen = 30) {
  if (!str) return '';
  return str.length > maxLen ? str.slice(0, maxLen - 1) + '…' : str;
}

/**
 * Debounce helper (for use outside hooks)
 */
export function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Normalize track title for deduplication (removes (From 'Movie'), [Remix], etc.)
 */
export function normalizeTrackTitle(title) {
  if (!title) return '';
  return title
    .toLowerCase()
    .replace(/&amp;/g, '&')
    .replace(/\s*[\(\[][^()\[\]]*(from|feat|ft\.|remix|version|audio|video|lyric|remaster|soundtrack|ost|original|bonus|edit|mix)[^()\[\]]*[\)\]]/gi, '')
    .replace(/[-–—_]/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalize primary artist for deduplication
 */
export function normalizeArtist(artist) {
  if (!artist) return '';
  return artist
    .toLowerCase()
    .split(/,|&|feat|\/|;|with/i)[0]
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')[0] || '';
}

/**
 * Get deduplication tokens for multi-variant matching (e.g. "Chuttamalle - Devara" and "Chuttamalle (From Devara)")
 */
export function getTrackDedupeTokens(track) {
  if (!track || !track.title) return [];
  const raw = String(track.title).toLowerCase();
  const tokens = new Set();

  const s = normalizeTrackTitle(track.title);
  if (s) tokens.add(s);

  // Split by common separators: ' - ', ' | ', ' : '
  const parts = raw.split(/\s*[-–—:|]\s*/).map(normalizeTrackTitle).filter(Boolean);
  for (const part of parts) {
    if (part && part.length >= 3) {
      tokens.add(part);
      const partWords = part.split(' ').filter(Boolean);
      if (partWords.length > 0 && partWords[0].length >= 6) {
        tokens.add(`single_${partWords[0]}`);
      }
      if (partWords.length >= 2) {
        tokens.add(`pair_${partWords[0]}_${partWords[1]}`);
      }
    }
  }

  const words = (s || '').split(' ').filter(Boolean);
  if (words.length > 0 && words[0].length >= 6) {
    tokens.add(`single_${words[0]}`);
  }
  if (words.length >= 2) {
    tokens.add(`pair_${words[0]}_${words[1]}`);
  }

  const art = normalizeArtist(track.artist);
  if (art) {
    if (s) tokens.add(`art_${s}_${art}`);
    for (const part of parts) {
      if (part && part.length >= 3) tokens.add(`art_${part}_${art}`);
    }
    if (words.length >= 1 && words[0].length >= 4) {
      tokens.add(`leadart_${words[0]}_${art}`);
    }
  }

  return Array.from(tokens);
}

/**
 * Get unique track key for deduplicating repeated songs
 */
export function getTrackDedupeKey(track) {
  if (!track) return '';
  const cleanTitle = normalizeTrackTitle(track.title);
  const cleanArtist = normalizeArtist(track.artist);
  return `${cleanTitle}:::${cleanArtist}`;
}

/**
 * Robust deduplication of track lists across IDs, keys, and tokens
 */
export function deduplicateTracks(tracks, existingTrackKeys = new Set(), existingTrackIds = new Set()) {
  if (!Array.isArray(tracks)) return [];
  const result = [];
  for (const track of tracks) {
    if (!track || !track.id) continue;
    if (existingTrackIds.has(track.id)) continue;

    const tokens = getTrackDedupeTokens(track);
    const isDup = tokens.some((tok) => existingTrackKeys.has(tok));
    if (isDup) continue;

    tokens.forEach((tok) => existingTrackKeys.add(tok));
    existingTrackIds.add(track.id);
    result.push(track);
  }
  return result;
}
