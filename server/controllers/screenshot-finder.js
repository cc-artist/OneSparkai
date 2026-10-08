const logger = require('../config/logger');
const screenshotFinderService = require('../services/screenshotFinderService');

/**
 * Find screenshots based on keywords and parameters
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.findScreenshots = async (req, res) => {
  try {
    logger.info('Finding screenshots with parameters:', req.body);
    
    // Validate request body
    const { keywords, resolution = '1080p', imageStyle = 'photorealistic', imageModel = 'openai', category } = req.body;
    
    if (!keywords || !keywords.trim()) {
      return res.status(400).json({
        status: 400,
        error: 'Keywords are required'
      });
    }
    
    // Call the screenshot finding service
    const screenshots = await screenshotFinderService.findScreenshots({
      keywords,
      resolution,
      imageStyle,
      imageModel,
      category
    });
    
    // Return the found screenshots
    res.status(200).json({
      status: 200,
      message: 'Screenshots found successfully',
      data: screenshots
    });
  } catch (error) {
    logger.error('Error finding screenshots:', error);
    res.status(500).json({
      status: 500,
      error: error.message || 'Internal server error'
    });
  }
};
