const express = require('express');
const router = express.Router();
const IdeaToPromptService = require('../services/ideaToPromptService');
const logger = require('../config/logger');

const ideaToPromptService = new IdeaToPromptService();

/**
 * POST /api/v1/idea-to-prompt/generate
 * 生成反推提示词
 */
router.post('/generate', async (req, res) => {
  try {
    const { textInput, contentCategory = 'copywriting' } = req.body;

    if (!textInput || typeof textInput !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'textInput is required and must be a string'
      });
    }

    logger.info(`Received Idea to Prompt request, content length: ${textInput.length}`);

    const result = await ideaToPromptService.generatePrompt(textInput, contentCategory);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Error in Idea to Prompt generation:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * GET /api/v1/idea-to-prompt/health
 * 健康检查
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'idea-to-prompt',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
