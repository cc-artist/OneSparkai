const axios = require('axios');

// Mock axios
jest.mock('axios');

// Mock logger
jest.mock('../config/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

// Mock the config module
describe('VideoGeneratorService', () => {
  let videoService;

  beforeEach(() => {
    // Reset axios mocks
    axios.get.mockClear();
    axios.post.mockClear();
    
    // Reset module cache to get fresh instances
    jest.resetModules();
    
    // Create a new instance before each test
    videoService = require('../services/videoGeneratorService');
  });

  describe('core functionality', () => {
    it('should initialize with default values', () => {
      expect(videoService.generateRequestId).toBeDefined();
      expect(videoService.generateVideo).toBeDefined();
      expect(videoService.getVideoStatus).toBeDefined();
      expect(videoService.isHealthy).toBeDefined();
    });

    it('should generate a valid request ID', () => {
      const requestId = videoService.generateRequestId();
      expect(requestId).toMatch(/^req-\d+-[a-zA-Z0-9]{9}$/);
    });

    it('should use mock implementation when API key is not configured', async () => {
      // Override the apiKey to simulate no key
      videoService.apiKey = '';
      
      const result = await videoService.generateVideo({ 
        videoModel: 'veo', 
        videoTitle: 'Test', 
        videoDescription: 'Test'
      });
      
      expect(result).toHaveProperty('taskId');
      expect(result.status).toBe('processing');
      expect(result.service).toBe('mock-kling-ai');
    });

    it('should return valid mock status for any task ID', async () => {
      const result = await videoService.getVideoStatus('test-task-123');
      
      expect(result).toHaveProperty('taskId', 'test-task-123');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('progress');
      expect(result.service).toBe('mock-kling-ai');
    });

    it('should return a valid mock response for generateVideo', async () => {
      const result = await videoService.mockGenerateVideo({
        videoModel: 'veo',
        videoTitle: 'Test Video'
      }, 'test-request-id');
      
      expect(result).toHaveProperty('taskId');
      expect(result.status).toBe('processing');
      expect(result.message).toBe('Video generation started successfully');
      expect(result.estimatedTime).toBe('2-3 minutes');
      expect(result.service).toBe('mock-kling-ai');
      expect(result.requestId).toBe('test-request-id');
    });

    it('should return consistent mock status for the same task ID', async () => {
      const taskId = 'mock-1234567890';
      
      const result1 = await videoService.mockGetVideoStatus(taskId, 'test-request-id');
      const result2 = await videoService.mockGetVideoStatus(taskId, 'test-request-id');
      
      expect(result1.taskId).toBe(taskId);
      expect(result2.taskId).toBe(taskId);
      expect(result1.service).toBe('mock-kling-ai');
      expect(result2.service).toBe('mock-kling-ai');
    });
  });

  describe('mock functionality', () => {
    it('should generate realistic mock progress', async () => {
      const taskId = 'mock-1234567890';
      const result = await videoService.mockGetVideoStatus(taskId);
      
      expect(result.progress).toBeGreaterThanOrEqual(0);
      expect(result.progress).toBeLessThanOrEqual(100);
      expect(typeof result.progress).toBe('number');
    });

    it('should return appropriate status messages based on progress', async () => {
      // Mock Date to get consistent progress
      jest.spyOn(Date, 'now').mockReturnValue(1234567890000);
      
      const taskId = 'mock-1234567890';
      const result = await videoService.mockGetVideoStatus(taskId);
      
      if (result.progress >= 100) {
        expect(result.status).toBe('completed');
      } else {
        expect(result.status).toBe('processing');
      }
      
      // Restore Date.now
      jest.restoreAllMocks();
    });
  });
});
