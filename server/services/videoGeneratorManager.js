const logger = require('../config/logger');
const config = require('../config');
const videoGeneratorService = require('./videoGeneratorService');
const animateDiffService = require('./animateDiffService');
const hostedAnimateDiffService = require('./hostedAnimateDiffService');

/**
 * Video Generator Manager to handle multiple video generation services
 * and randomly select between them for load balancing and redundancy
 */
class VideoGeneratorManager {
  constructor() {
    // Available video generation services
    this.services = {
      animatediff: {
        service: animateDiffService,
        weight: 1,
        supportsMimic: true,
        description: 'AnimateDiff Video Generator'
      },
      hostedAnimatediff: {
        service: hostedAnimateDiffService,
        weight: 2, // Higher weight to prefer hosted service
        supportsMimic: true,
        description: 'Hosted AnimateDiff Video Generator (Replicate/Runway)'
      },
      pika: {
        service: null, // Will be initialized if API key is available
        weight: 1,
        supportsMimic: true,
        description: 'Pika AI Video Generator'
      },
      stableVideo: {
        service: null, // Will be initialized if API key is available
        weight: 1,
        supportsMimic: true,
        description: 'Stable Video Diffusion Generator'
      }
    };
    
    // Initialize services based on configuration
    this.initializeServices();
  }

  /**
   * Initialize services based on configuration
   */
  initializeServices() {
    // Check for Pika AI configuration
    if (config.aiModel && config.aiModel.pika && config.aiModel.pika.apiKey) {
      try {
        // In a real implementation, you would initialize the Pika AI service here
        // this.services.pika.service = new PikaAIService(config.aiModel.pika);
        logger.info('Pika AI service initialized');
      } catch (error) {
        logger.error('Failed to initialize Pika AI service:', error.message);
        this.services.pika.service = null;
      }
    }
    
    // Check for Stable Video Diffusion configuration
    if (config.aiModel && config.aiModel.stableVideo && config.aiModel.stableVideo.apiKey) {
      try {
        // In a real implementation, you would initialize the Stable Video Diffusion service here
        // this.services.stableVideo.service = new StableVideoService(config.aiModel.stableVideo);
        logger.info('Stable Video Diffusion service initialized');
      } catch (error) {
        logger.error('Failed to initialize Stable Video Diffusion service:', error.message);
        this.services.stableVideo.service = null;
      }
    }
  }

  /**
   * Select a random service based on weights and capabilities
   * @param {Object} options - Selection options
   * @param {boolean} options.supportsMimic - Whether the service must support mimic video generation
   * @returns {Object} - Selected service configuration
   */
  selectService(options = {}) {
    const { supportsMimic = false } = options;
    
    // Filter available services
    const availableServices = Object.entries(this.services)
      .filter(([_, serviceConfig]) => {
        // Check if service is initialized
        if (!serviceConfig.service) return false;
        
        // Check if service supports mimic if required
        if (supportsMimic && !serviceConfig.supportsMimic) return false;
        
        return true;
      })
      .map(([name, config]) => ({ name, ...config }));
    
    if (availableServices.length === 0) {
      throw new Error('No available video generation services');
    }
    
    // If only one service is available, use that
    if (availableServices.length === 1) {
      logger.info(`Only one service available: ${availableServices[0].name}`);
      return availableServices[0];
    }
    
    // Calculate total weight
    const totalWeight = availableServices.reduce((sum, service) => sum + service.weight, 0);
    
    // Generate a random number between 0 and totalWeight
    let random = Math.random() * totalWeight;
    
    // Select service based on weight
    for (const service of availableServices) {
      random -= service.weight;
      if (random <= 0) {
        logger.info(`Selected service: ${service.name}`);
        return service;
      }
    }
    
    // Fallback to first service
    logger.warn('Failed to select service by weight, falling back to first service');
    return availableServices[0];
  }

  /**
   * Generate a video using a randomly selected service
   * @param {Object} params - Video generation parameters
   * @param {string} requestId - Request ID for tracing
   * @returns {Promise<Object>} - Video generation result
   */
  async generateVideo(params, requestId) {
    try {
      logger.info({
        message: 'Starting video generation with manager',
        params: params,
        requestId: requestId,
        timestamp: new Date().toISOString()
      });
      
      // Check if this is a mimic video request
      const isMimicRequest = params.mimicVideoUrl || params.referenceVideo;
      
      // Select a service based on requirements
      const selectedService = this.selectService({ supportsMimic: isMimicRequest });
      
      // Call the selected service
      const result = await selectedService.service.generateVideo(params, requestId);
      
      // Add service information to the result
      result.serviceName = selectedService.name;
      result.serviceDescription = selectedService.description;
      
      logger.info({
        message: 'Video generation completed with selected service',
        service: selectedService.name,
        requestId: requestId,
        result: result,
        timestamp: new Date().toISOString()
      });
      
      return result;
    } catch (error) {
      logger.error({
        message: 'Error in video generation manager',
        error: error.message,
        stack: error.stack,
        requestId: requestId,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  /**
   * Get video status from the appropriate service
   * @param {string} serviceName - Name of the service that generated the video
   * @param {string} taskId - Task ID
   * @param {string} requestId - Request ID for tracing
   * @returns {Promise<Object>} - Video status
   */
  async getVideoStatus(serviceName, taskId, requestId) {
    try {
      logger.info({
        message: 'Getting video status from manager',
        serviceName: serviceName,
        taskId: taskId,
        requestId: requestId,
        timestamp: new Date().toISOString()
      });
      
      // Get the service
      const serviceConfig = this.services[serviceName];
      if (!serviceConfig || !serviceConfig.service) {
        throw new Error(`Service ${serviceName} not available`);
      }
      
      // Call the service's getVideoStatus method
      const result = await serviceConfig.service.getVideoStatus(taskId, requestId);
      
      logger.info({
        message: 'Video status retrieved from service',
        service: serviceName,
        requestId: requestId,
        result: result,
        timestamp: new Date().toISOString()
      });
      
      return result;
    } catch (error) {
      logger.error({
        message: 'Error getting video status from manager',
        error: error.message,
        stack: error.stack,
        requestId: requestId,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  /**
   * Mimic a video using a randomly selected service that supports mimic functionality
   * @param {Object} params - Mimic video parameters
   * @param {string} requestId - Request ID for tracing
   * @returns {Promise<Object>} - Video generation result
   */
  async mimicVideo(params, requestId) {
    try {
      logger.info({
        message: 'Starting mimic video generation',
        params: params,
        requestId: requestId,
        timestamp: new Date().toISOString()
      });
      
      // Ensure mimic parameters are properly formatted
      const mimicParams = {
        ...params,
        videoModel: params.videoModel || 'mimic-v1',
        // Add any additional parameters needed for mimic functionality
        mimicMode: true
      };
      
      // Generate video with mimic parameters
      return await this.generateVideo(mimicParams, requestId);
    } catch (error) {
      logger.error({
        message: 'Error in mimic video generation',
        error: error.message,
        stack: error.stack,
        requestId: requestId,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  /**
   * Get available services information
   * @returns {Object} - Available services information
   */
  getAvailableServices() {
    return Object.entries(this.services)
      .filter(([_, serviceConfig]) => serviceConfig.service)
      .map(([name, serviceConfig]) => ({
        name,
        description: serviceConfig.description,
        supportsMimic: serviceConfig.supportsMimic,
        weight: serviceConfig.weight
      }));
  }
}

module.exports = new VideoGeneratorManager();
