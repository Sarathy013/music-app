const express = require('express');
const router = express.Router();
const { getHistory, addToHistory, clearHistory } = require('../controllers/historyController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/', getHistory);
router.post('/', addToHistory);
router.delete('/', clearHistory);

module.exports = router;
