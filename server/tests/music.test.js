const test = require('node:test');
const assert = require('node:assert/strict');

const SaavnProvider = require('../services/saavnProvider');
const YouTubeProvider = require('../services/youtubeProvider');
const SpotifyProvider = require('../services/spotifyProvider');
const JamendoProvider = require('../services/jamendoProvider');
const MusopenProvider = require('../services/musicProvider');
const MusicAggregator = require('../services/musicAggregator');
const musicController = require('../controllers/musicController');

function stub(t, target, key, implementation) {
  const original = target[key];
  target[key] = implementation;
  t.after(() => {
    target[key] = original;
  });
}

function responseRecorder() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test('search selects Jamendo even when a language filter is set', async (t) => {
  const track = { id: 'jamendo-only', title: 'Jamendo result', artist: 'Artist', source: 'jamendo' };
  let jamendoCalls = 0;
  stub(t, JamendoProvider, 'searchTracks', async (query, limit, page) => {
    jamendoCalls++;
    assert.equal(query, 'free music');
    assert.equal(limit, 5);
    assert.equal(page, 2);
    return [track];
  });
  stub(t, SaavnProvider, 'searchTracks', async () => assert.fail('Saavn must not be queried'));
  stub(t, YouTubeProvider, 'searchTracks', async () => assert.fail('YouTube must not be queried'));
  stub(t, SpotifyProvider, 'searchTracks', async () => assert.fail('Spotify must not be queried'));

  const result = await MusicAggregator.searchTracks('free music', {
    source: 'jamendo',
    language: 'tamil',
    limit: 5,
    page: 2,
  });

  assert.deepEqual(result, [track]);
  assert.equal(jamendoCalls, 1);
});

test('source-specific Musopen searches return catalog recordings', async (t) => {
  const track = { id: 'musopen-5', title: 'Classical recording', artist: 'Composer', source: 'musopen' };
  stub(t, MusopenProvider, 'searchTracks', async (query, limit, page) => {
    assert.equal(query, 'Beethoven');
    assert.equal(limit, 4);
    assert.equal(page, 1);
    return [track];
  });
  stub(t, SaavnProvider, 'searchTracks', async () => assert.fail('Saavn must not be queried'));
  stub(t, YouTubeProvider, 'searchTracks', async () => assert.fail('YouTube must not be queried'));
  stub(t, JamendoProvider, 'searchTracks', async () => assert.fail('Jamendo must not be queried'));

  assert.deepEqual(
    await MusicAggregator.searchTracks('Beethoven', { source: 'musopen', limit: 4 }),
    [track]
  );
});

test('global searches include both open catalogs without failing if one provider rejects', async (t) => {
  const saavnTracks = Array.from({ length: 20 }, (_, index) => ({
    id: `saavn-test-${index}`,
    title: `Popular Song ${index}`,
    artist: 'Singer',
  }));
  const jamendoTrack = { id: 'jamendo-test-1', title: 'Indie Song', artist: 'Band' };
  const musopenTrack = { id: 'musopen-test-1', title: 'Piano Song', artist: 'Composer' };
  stub(t, SaavnProvider, 'searchTracks', async () => saavnTracks);
  stub(t, YouTubeProvider, 'searchTracks', async () => []);
  stub(t, JamendoProvider, 'searchTracks', async () => [jamendoTrack]);
  stub(t, MusopenProvider, 'searchTracks', async () => [musopenTrack]);

  const results = await MusicAggregator.searchTracks(`global-${Date.now()}`, { limit: 10 });
  assert.deepEqual(results.slice(0, 4).map((track) => track.id), [
    saavnTracks[0].id,
    jamendoTrack.id,
    musopenTrack.id,
    saavnTracks[1].id,
  ]);
  assert.equal(results.length, 10);
});

test('deduplication keeps different songs that share a common opening word', async (t) => {
  const tracks = [
    { id: 'first', title: 'Beautiful Day', artist: 'Singer One' },
    { id: 'second', title: 'Beautiful Things', artist: 'Singer Two' },
    { id: 'duplicate', title: 'Beautiful Day (Official Audio)', artist: 'Singer One' },
  ];
  stub(t, SaavnProvider, 'searchTracks', async () => tracks);
  stub(t, YouTubeProvider, 'searchTracks', async () => []);
  stub(t, JamendoProvider, 'searchTracks', async () => []);
  stub(t, MusopenProvider, 'searchTracks', async () => []);

  const result = await MusicAggregator.searchTracks(`dedup-${Date.now()}`, { limit: 10 });
  assert.deepEqual(result.map((track) => track.id), ['first', 'second']);
});

test('provider track, album, and artist IDs route to their originating catalog', async (t) => {
  const jamendoTrack = { id: 'jamendo-8', title: 'Track', source: 'jamendo' };
  const jamendoAlbum = { id: 'jamendo-album-3', name: 'Album', source: 'jamendo' };
  const musopenArtist = { id: 'musopen-artist-12', name: 'Composer', source: 'musopen' };
  stub(t, JamendoProvider, 'getTrack', async (id) => id === 'jamendo-8' ? jamendoTrack : null);
  stub(t, JamendoProvider, 'getAlbum', async (id) => id === 'jamendo-album-3' ? jamendoAlbum : null);
  stub(t, MusopenProvider, 'getArtist', async (id) => id === 'musopen-artist-12' ? musopenArtist : null);

  assert.equal(await MusicAggregator.getTrack('jamendo-8'), jamendoTrack);
  assert.equal(await MusicAggregator.getAlbum('jamendo-album-3'), jamendoAlbum);
  assert.equal(await MusicAggregator.getArtist('musopen-artist-12'), musopenArtist);
});

test('search endpoint rejects invalid input before calling providers', async () => {
  const invalidCases = [
    { q: ['not', 'a', 'string'] },
    { q: 'a'.repeat(201) },
    { q: 'test', type: 'unknown' },
    { q: 'test', limit: '1000' },
    { q: 'test', page: '0' },
    { q: 'test', source: 'unknown' },
  ];

  for (const query of invalidCases) {
    const res = responseRecorder();
    let forwardedError = null;
    await musicController.search({ query }, res, (error) => { forwardedError = error; });
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.success, false);
    assert.equal(forwardedError, null);
  }
});

test('search endpoint normalizes valid bounded input and supports Musopen', async (t) => {
  const result = [{ id: 'musopen-1', title: 'Test' }];
  stub(t, MusicAggregator, 'searchTracks', async (query, options) => {
    assert.equal(query, 'Bach');
    assert.deepEqual(options, {
      limit: 10,
      page: 2,
      language: 'all',
      source: 'musopen',
    });
    return result;
  });
  const res = responseRecorder();

  await musicController.search({
    query: { q: ' Bach ', limit: '10', page: '2', source: 'musopen' },
  }, res, assert.fail);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.results, result);
  assert.equal(res.body.query, 'Bach');
});
