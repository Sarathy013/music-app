const express = require('express');
const router = express.Router();
const {
  search, getTrending, getNewReleases, getGenres, getGenreTracks,
  getPopularArtists, getPopularAlbums, getTrack, getAlbum, getArtist, streamAudio,
  getCharts, resolveLink, getAllLanguages, getLyrics, getMoodRecommendations,
} = require('../controllers/musicController');

router.get('/search', search);
router.get('/trending', getTrending);
router.get('/new-releases', getNewReleases);
router.get('/charts', getCharts);
router.get('/mood-recommendations', getMoodRecommendations);
router.get('/languages', getAllLanguages);
router.get('/resolve-link', resolveLink);
router.get('/genres', getGenres);
router.get('/genres/:id/tracks', getGenreTracks);
router.get('/artists', getPopularArtists);
router.get('/popular-albums', getPopularAlbums);
router.get('/lyrics', getLyrics);
router.get('/stream', streamAudio);
router.get('/tracks/:id', getTrack);
router.get('/albums/:id', getAlbum);
router.get('/artists/:id', getArtist);

module.exports = router;
