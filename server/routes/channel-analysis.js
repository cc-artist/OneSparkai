const express = require('express');
const router = express.Router();
const ChannelAnalysisController = require('../controllers/channel-analysis');

// Channel Analysis routes
router.get('/', (req, res) => {
  res.status(200).json({
    message: 'Channel Analysis API is running'
  });
});

// Test POST route
router.post('/test', (req, res) => {
  res.status(200).json({ message: 'POST test working', body: req.body });
});

// Analyze a channel with proper this binding
router.post('/analyze', ChannelAnalysisController.analyzeChannel.bind(ChannelAnalysisController));

module.exports = router;
