const logger = require('../config/logger');
const nicheFinderService = require('../services/nicheFinderService');

/**
 * Find trending niches based on keywords and parameters
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.findNiches = async (req, res) => {
  try {
    logger.info('Finding niches with parameters:', req.body);
    
    // Validate request body
    const { keywords, platform, nicheType, engagementLevel, competition } = req.body;
    
    if (!keywords || !keywords.trim()) {
      return res.status(400).json({
        status: 400,
        message: 'Keywords are required'
      });
    }
    
    // Call the real niche finding service
    const niches = await nicheFinderService.findNiches({
      keywords,
      platform,
      nicheType,
      engagementLevel,
      competition
    });
    
    // Return the found niches
    res.status(200).json({
      niches
    });
  } catch (error) {
    logger.error('Error finding niches:', error);
    res.status(500).json({
      status: 500,
      message: error.message || 'Internal server error'
    });
  }
};
