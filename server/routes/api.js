const express = require('express');
const router = express.Router();

// Import route handlers
const videoGeneratorRoutes = require('./video-generator');
const nicheFinderRoutes = require('./niche-finder');
const voiceGeneratorRoutes = require('./voice-generator');
const channelAnalysisRoutes = require('./channel-analysis');
const screenshotFinderRoutes = require('./screenshot-finder');
const ideaToPromptRoutes = require('./idea-to-prompt');
const multiModalReversePromptRoutes = require('./multi-modal-reverse-prompt');
const authRoutes = require('./auth');
const creditsRoutes = require('./credits');
const settingsRoutes = require('./settings');

// API routes
/**
 * @swagger
 * /health:
 *   get:
 *     summary: Check API health
 *     description: Returns the current status of the API
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: API is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 timestamp:
 *                   type: string
 *                   example: 2026-03-20T10:00:00.000Z
 *                 service:
 *                   type: string
 *                   example: algrow-backend
 *                 version:
 *                   type: string
 *                   example: v1
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'one-spark-backend',
    version: 'v1'
  });
});

// Video Generator routes
router.use('/video-generator', videoGeneratorRoutes);

// Niche Finder routes
router.use('/niche-finder', nicheFinderRoutes);

// Voice Generator routes
router.use('/voice-generator', voiceGeneratorRoutes);

// Channel Analysis routes
router.use('/channel-analysis', channelAnalysisRoutes);

// Screenshot Finder routes
router.use('/screenshot-finder', screenshotFinderRoutes);

// Auth routes
router.use('/auth', authRoutes);

// Credits routes
router.use('/credits', creditsRoutes);

// Settings routes
router.use('/settings', settingsRoutes);

// Idea to Prompt routes
router.use('/idea-to-prompt', ideaToPromptRoutes);

// Multi-modal Reverse Prompt routes
router.use('/multi-modal-reverse-prompt', multiModalReversePromptRoutes);

module.exports = router;
