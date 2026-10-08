const logger = require('../config/logger');
const config = require('../config');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

/**
 * Hosted AnimateDiff Service using Replicate or Runway
 * This service integrates with hosted AI services to generate videos based on prompts
 */
class HostedAnimateDiffService {
  constructor() {
    this.isHealthy = true;
    this.lastHealthCheck = Date.now();
    this.healthCheckInterval = 5 * 60 * 1000; // 5 minutes
    this.serviceType = process.env.ANIMATEDIFF_SERVICE_TYPE || 'replicate'; // Default to replicate
    
    // Start periodic health checks if in production
    if (config.server.nodeEnv === 'production') {
      this.startHealthChecks();
    }
  }

  /**
   * Start periodic health checks
   */
  startHealthChecks() {
    setInterval(async () => {
      await this.checkHealth();
    }, this.healthCheckInterval);
  }

  /**
   * Check the health of the service
   * @returns {Promise<boolean>} - Health status
   */
  async checkHealth() {
    try {
      // Check if API keys are configured
      if (this.serviceType === 'replicate' && !config.aiModel.replicate.apiKey) {
        this.isHealthy = false;
        logger.error('Replicate API key not configured');
        return false;
      }
      
      if (this.serviceType === 'runway' && !config.aiModel.runway.apiKey) {
        this.isHealthy = false;
        logger.error('Runway API key not configured');
        return false;
      }
      
      this.isHealthy = true;
      this.lastHealthCheck = Date.now();
      logger.info(`${this.serviceType} AnimateDiff service is healthy`);
      return this.isHealthy;
    } catch (error) {
      this.isHealthy = false;
      this.lastHealthCheck = Date.now();
      logger.error('Health check failed for Hosted AnimateDiff service:', error.message);
      return false;
    }
  }

  /**
   * Generate a request ID for tracing
   * @returns {string} - Request ID
   */
  generateRequestId() {
    return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate a video using Replicate
   * @param {Object} params - Video generation parameters
   * @param {string} requestId - Request ID for tracing
   * @returns {Promise<Object>} - Video generation result
   */
  async generateVideoWithReplicate(params, requestId) {
    try {
      const apiKey = config.aiModel.replicate.apiKey;
      if (!apiKey) {
        throw new Error('Replicate API key not configured');
      }
      
      // Replicate AnimateDiff model endpoint
      const endpoint = `${config.aiModel.replicate.baseUrl}/predictions`;
      
      // Prepare request data
      const requestData = {
        version: '9222a21c181b707209ef12b5e0d7e94c994b58f01c7b2fec075d2e892362f13c', // AnimateDiff v1.5
        input: {
          prompt: params.prompt,
          negative_prompt: params.negativePrompt || 'low quality, blurry, distorted',
          width: params.width || 512,
          height: params.height || 512,
          num_frames: params.numFrames || 24,
          guidance_scale: params.guidanceScale || 7.5,
          motion_scale: params.motionScale || 1.0
        }
      };
      
      logger.info({ 
        message: 'Sending request to Replicate AnimateDiff',
        requestId: requestId,
        input: requestData.input,
        timestamp: new Date().toISOString()
      });
      
      // Make API call
      const response = await axios.post(endpoint, requestData, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      logger.info({ 
        message: 'Replicate AnimateDiff request submitted',
        requestId: requestId,
        response: response.data,
        timestamp: new Date().toISOString()
      });
      
      return {
        taskId: response.data.id,
        status: response.data.status,
        message: 'Video generation started successfully',
        estimatedTime: '1-2 minutes',
        progress: 5,
        videoParams: params,
        service: 'replicate-animate-diff',
        requestId: requestId,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error({ 
        message: 'Error generating video with Replicate',
        requestId: requestId,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  /**
   * Generate a video using Runway
   * @param {Object} params - Video generation parameters
   * @param {string} requestId - Request ID for tracing
   * @returns {Promise<Object>} - Video generation result
   */
  async generateVideoWithRunway(params, requestId) {
    try {
      const apiKey = config.aiModel.runway.apiKey;
      if (!apiKey) {
        throw new Error('Runway API key not configured');
      }
      
      // Runway video generation endpoint
      const endpoint = `${config.aiModel.runway.baseUrl}/generate`;
      
      // Prepare request data
      const requestData = {
        prompt: params.prompt,
        negative_prompt: params.negativePrompt || 'low quality, blurry, distorted',
        width: params.width || 512,
        height: params.height || 512,
        duration: params.duration || 5, // in seconds
        fps: params.fps || 24
      };
      
      logger.info({ 
        message: 'Sending request to Runway video generation',
        requestId: requestId,
        input: requestData,
        timestamp: new Date().toISOString()
      });
      
      // Make API call
      const response = await axios.post(endpoint, requestData, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      logger.info({ 
        message: 'Runway video generation request submitted',
        requestId: requestId,
        response: response.data,
        timestamp: new Date().toISOString()
      });
      
      return {
        taskId: response.data.id,
        status: response.data.status,
        message: 'Video generation started successfully',
        estimatedTime: '1-2 minutes',
        progress: 5,
        videoParams: params,
        service: 'runway-video',
        requestId: requestId,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error({ 
        message: 'Error generating video with Runway',
        requestId: requestId,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  /**
   * Generate a video using the selected hosted service
   * @param {Object} params - Video generation parameters
   * @param {string} requestId - Request ID for tracing
   * @returns {Promise<Object>} - Video generation result
   */
  async generateVideo(params, requestId = this.generateRequestId()) {
    try {
      logger.info({ 
        message: 'Generating video with Hosted AnimateDiff',
        requestId: requestId,
        params: params,
        serviceType: this.serviceType,
        timestamp: new Date().toISOString()
      });

      // Check if service is healthy
      if (!this.isHealthy && config.server.nodeEnv === 'production') {
        logger.error({ 
          message: 'Hosted AnimateDiff service is unhealthy. Cannot generate video.',
          requestId: requestId,
          timestamp: new Date().toISOString()
        });
        throw new Error('Hosted AnimateDiff service is unhealthy. Cannot generate video.');
      }

      // Use mock implementation in development or test environment
      if (config.server.nodeEnv !== 'production') {
        logger.info({ 
          message: 'Using mock implementation for Hosted AnimateDiff',
          requestId: requestId,
          serviceType: this.serviceType,
          timestamp: new Date().toISOString()
        });
        return this.mockGenerateVideo(params, requestId);
      }

      // Generate video based on service type
      let result;
      if (this.serviceType === 'replicate') {
        result = await this.generateVideoWithReplicate(params, requestId);
      } else if (this.serviceType === 'runway') {
        result = await this.generateVideoWithRunway(params, requestId);
      } else {
        throw new Error(`Unsupported service type: ${this.serviceType}`);
      }
      
      logger.info({ 
        message: 'Hosted AnimateDiff video generation started',
        requestId: requestId,
        taskId: result.taskId,
        timestamp: new Date().toISOString()
      });
      
      return result;
    } catch (error) {
      logger.error({ 
        message: 'Error in Hosted AnimateDiff video generation',
        requestId: requestId,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      // Use mock implementation as fallback in case of error
      if (config.server.nodeEnv !== 'production') {
        logger.warn({ 
          message: 'Falling back to mock implementation for Hosted AnimateDiff',
          requestId: requestId,
          error: error.message,
          timestamp: new Date().toISOString()
        });
        return this.mockGenerateVideo(params, requestId);
      }
      
      // Re-throw with request ID for better error tracking
      const enhancedError = new Error(error.message);
      enhancedError.requestId = requestId;
      enhancedError.originalError = error;
      throw enhancedError;
    }
  }

  /**
   * Mock video generation implementation for development and fallback
   * @param {Object} params - Video generation parameters
   * @param {string} requestId - Request ID for tracing
   * @returns {Promise<Object>} - Mock video generation result
   */
  async mockGenerateVideo(params, requestId) {
    try {
      // Simulate API call delay with jitter
      const delay = Math.floor(Math.random() * 1500) + 500; // 500-2000ms
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Generate a realistic mock task ID
      const taskId = `hosted-animate-mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      logger.info({ 
        message: 'Mock Hosted AnimateDiff video generation completed',
        requestId: requestId,
        taskId: taskId,
        timestamp: new Date().toISOString()
      });
      
      return {
          taskId: taskId,
          status: 'processing',
          message: 'Video generation started successfully',
          estimatedTime: '1-2 minutes',
          progress: 5, // Initial progress for mock tasks
          videoParams: params,
          service: `mock-${this.serviceType}-animate-diff`,
          requestId: requestId,
          timestamp: new Date().toISOString()
        };
    } catch (error) {
      logger.error({ 
        message: 'Error in mock Hosted AnimateDiff video generation',
        requestId: requestId,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  /**
   * Get video status from Replicate
   * @param {string} taskId - Task ID
   * @param {string} requestId - Request ID for tracing
   * @returns {Promise<Object>} - Video status
   */
  async getVideoStatusFromReplicate(taskId, requestId) {
    try {
      const apiKey = config.aiModel.replicate.apiKey;
      if (!apiKey) {
        throw new Error('Replicate API key not configured');
      }
      
      const endpoint = `${config.aiModel.replicate.baseUrl}/predictions/${taskId}`;
      
      const response = await axios.get(endpoint, {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      
      const data = response.data;
      let progress = 5;
      let status = 'processing';
      let message = 'Video generation in progress';
      
      if (data.status === 'succeeded') {
        status = 'completed';
        progress = 100;
        message = 'Video generation completed successfully';
      } else if (data.status === 'failed') {
        status = 'failed';
        progress = 0;
        message = `Video generation failed: ${data.error || 'Unknown error'}`;
      } else if (data.status === 'processing') {
        // Estimate progress based on time elapsed
        const createdAt = new Date(data.created_at);
        const elapsedSeconds = (Date.now() - createdAt.getTime()) / 1000;
        progress = Math.min(90, Math.floor((elapsedSeconds / 60) * 100));
      }
      
      return {
        taskId: taskId,
        status: status,
        message: message,
        progress: progress,
        estimatedTime: status === 'completed' ? 'Completed' : '1-2 minutes remaining',
        videoUrl: data.output ? data.output : null,
        service: 'replicate-animate-diff',
        requestId: requestId,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error({ 
        message: 'Error getting video status from Replicate',
        requestId: requestId,
        taskId: taskId,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  /**
   * Get video status from Runway
   * @param {string} taskId - Task ID
   * @param {string} requestId - Request ID for tracing
   * @returns {Promise<Object>} - Video status
   */
  async getVideoStatusFromRunway(taskId, requestId) {
    try {
      const apiKey = config.aiModel.runway.apiKey;
      if (!apiKey) {
        throw new Error('Runway API key not configured');
      }
      
      const endpoint = `${config.aiModel.runway.baseUrl}/generate/${taskId}`;
      
      const response = await axios.get(endpoint, {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      
      const data = response.data;
      let progress = 5;
      let status = 'processing';
      let message = 'Video generation in progress';
      
      if (data.status === 'completed') {
        status = 'completed';
        progress = 100;
        message = 'Video generation completed successfully';
      } else if (data.status === 'failed') {
        status = 'failed';
        progress = 0;
        message = `Video generation failed: ${data.error || 'Unknown error'}`;
      } else if (data.status === 'processing') {
        progress = data.progress || 5;
      }
      
      return {
        taskId: taskId,
        status: status,
        message: message,
        progress: progress,
        estimatedTime: status === 'completed' ? 'Completed' : '1-2 minutes remaining',
        videoUrl: data.video_url ? data.video_url : null,
        service: 'runway-video',
        requestId: requestId,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error({ 
        message: 'Error getting video status from Runway',
        requestId: requestId,
        taskId: taskId,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  /**
   * Get video generation status
   * @param {string} taskId - Task ID
   * @param {string} requestId - Request ID for tracing
   * @returns {Promise<Object>} - Video status
   */
  async getVideoStatus(taskId, requestId = this.generateRequestId()) {
    try {
      logger.info({ 
        message: 'Getting Hosted AnimateDiff video status',
        requestId: requestId,
        taskId: taskId,
        serviceType: this.serviceType,
        timestamp: new Date().toISOString()
      });

      // Check if service is healthy
      if (!this.isHealthy && config.server.nodeEnv === 'production') {
        logger.error({ 
          message: 'Hosted AnimateDiff service is unhealthy. Cannot check video status.',
          requestId: requestId,
          taskId: taskId,
          timestamp: new Date().toISOString()
        });
        throw new Error('Hosted AnimateDiff service is unhealthy. Cannot check video status.');
      }

      // Use mock implementation in development or test environment
      if (config.server.nodeEnv !== 'production') {
        logger.info({ 
          message: 'Using mock implementation for Hosted AnimateDiff status check',
          requestId: requestId,
          taskId: taskId,
          serviceType: this.serviceType,
          timestamp: new Date().toISOString()
        });
        return this.mockGetVideoStatus(taskId, requestId);
      }

      // Get status based on service type
      let result;
      if (this.serviceType === 'replicate') {
        result = await this.getVideoStatusFromReplicate(taskId, requestId);
      } else if (this.serviceType === 'runway') {
        result = await this.getVideoStatusFromRunway(taskId, requestId);
      } else {
        throw new Error(`Unsupported service type: ${this.serviceType}`);
      }
      
      logger.info({ 
        message: 'Hosted AnimateDiff video status retrieved',
        requestId: requestId,
        taskId: taskId,
        status: result.status,
        progress: result.progress,
        timestamp: new Date().toISOString()
      });
      
      return result;
    } catch (error) {
      logger.error({ 
        message: 'Error getting Hosted AnimateDiff video status',
        requestId: requestId,
        taskId: taskId,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      // Use mock implementation as fallback in case of error
      if (config.server.nodeEnv !== 'production') {
        logger.warn({ 
          message: 'Falling back to mock implementation for Hosted AnimateDiff status check',
          requestId: requestId,
          taskId: taskId,
          error: error.message,
          timestamp: new Date().toISOString()
        });
        return this.mockGetVideoStatus(taskId, requestId);
      }
      
      // Re-throw with request ID for better error tracking
      const enhancedError = new Error(error.message);
      enhancedError.requestId = requestId;
      enhancedError.taskId = taskId;
      enhancedError.originalError = error;
      throw enhancedError;
    }
  }

  /**
   * Mock video status implementation for development and fallback
   * @param {string} taskId - Task ID
   * @param {string} requestId - Request ID for tracing
   * @returns {Promise<Object>} - Mock video status
   */
  async mockGetVideoStatus(taskId, requestId) {
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Generate realistic progress based on task ID (for consistency)
      const taskIdNum = parseInt(taskId.replace(/\D/g, ''), 10) || Date.now();
      // Calculate progress without % 100 to allow it to reach 100
      const progress = Math.min(100, Math.floor((Date.now() - taskIdNum) / 10000));
      
      let status = 'processing';
      let message = `Video generation in progress (${progress}%)`;
      
      if (progress >= 100) {
        status = 'completed';
        message = 'Video generation completed successfully';
      } else if (progress >= 70) {
        status = 'processing';
        message = `Video generation in progress (${progress}%) - Finalizing video`;
      } else if (progress >= 40) {
        status = 'processing';
        message = `Video generation in progress (${progress}%) - Rendering scenes`;
      } else if (progress >= 10) {
        status = 'processing';
        message = `Video generation in progress (${progress}%) - Generating content`;
      }
      
      logger.info({ 
        message: 'Mock Hosted AnimateDiff video status retrieved',
        requestId: requestId,
        taskId: taskId,
        status: status,
        progress: progress,
        timestamp: new Date().toISOString()
      });
      
      return {
        taskId: taskId,
        status: status,
        message: message,
        progress: progress,
        estimatedTime: status === 'completed' ? 'Completed' : '1-2 minutes remaining',
        videoUrl: status === 'completed' ? `https://example.com/videos/${taskId}.mp4` : null,
        service: `mock-${this.serviceType}-animate-diff`,
        requestId: requestId,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error({ 
        message: 'Error in mock Hosted AnimateDiff video status',
        requestId: requestId,
        taskId: taskId,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }
}

module.exports = new HostedAnimateDiffService();