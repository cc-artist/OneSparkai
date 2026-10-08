const animateDiffService = require('../services/animateDiffService');

describe('AnimateDiffService', () => {
  beforeEach(() => {
    // Reset any state before each test
    jest.clearAllTimers();
  });

  describe('core functionality', () => {
    test('should initialize with default values', () => {
      // Check if the service is initialized properly
      expect(animateDiffService).toBeDefined();
      expect(animateDiffService.isHealthy).toBe(true);
      expect(typeof animateDiffService.generateVideo).toBe('function');
      expect(typeof animateDiffService.getVideoStatus).toBe('function');
    });

    test('should generate a valid request ID', () => {
      // Generate a request ID
      const requestId = animateDiffService.generateRequestId();
      
      // Check if it's a valid string
      expect(typeof requestId).toBe('string');
      expect(requestId.length).toBeGreaterThan(0);
      // Check if it matches the expected format
      expect(requestId).toMatch(/^req-\d+-[a-z0-9]{9}$/);
    });

    test('should use mock implementation for generateVideo', async () => {
      // Test the generateVideo method
      const params = {
        videoModel: 'animatediff-sd',
        videoTitle: 'Test Video',
        videoDescription: 'This is a test video',
        videoStyle: 'realistic',
        resolution: '1080p',
        voiceOver: 'none',
        voiceScript: ''
      };
      
      const result = await animateDiffService.generateVideo(params);
      
      // Check if the result has the expected properties
      expect(result).toHaveProperty('taskId');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('estimatedTime');
      expect(result).toHaveProperty('service');
      expect(result).toHaveProperty('requestId');
      
      // Check if the service type is correct
      expect(result.service).toMatch(/^(mock-)?animate-diff$/);
    });

    test('should return valid mock status for any task ID', async () => {
      // Test the getVideoStatus method with a mock task ID
      const taskId = 'animate-mock-1234567890-abcdefghi';
      const result = await animateDiffService.getVideoStatus(taskId);
      
      // Check if the result has the expected properties
      expect(result).toHaveProperty('taskId', taskId);
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('progress');
      expect(result).toHaveProperty('estimatedTime');
      expect(result).toHaveProperty('service');
      
      // Check if the service type is correct
      expect(result.service).toMatch(/^(mock-)?animate-diff$/);
    });

    test('should return a valid mock response for generateVideo', async () => {
      // Test with different parameters
      const params = {
        videoModel: 'animatediff-stable',
        videoTitle: 'Another Test Video',
        videoDescription: 'This is another test video with more details',
        videoStyle: 'cartoon',
        resolution: '720p',
        voiceOver: 'stealth',
        voiceScript: 'This is a test voice script'
      };
      
      const result = await animateDiffService.generateVideo(params);
      
      // Check response structure
      expect(result.status).toBe('processing');
      expect(typeof result.taskId).toBe('string');
      expect(result.taskId.length).toBeGreaterThan(0);
      expect(result.message).toBe('Video generation started successfully');
      expect(result.estimatedTime).toBe('1-2 minutes');
    });

    test('should return consistent mock status for the same task ID', async () => {
      // Test with the same task ID multiple times
      const taskId = 'animate-mock-1234567890-test12345';
      
      // Get status multiple times
      const status1 = await animateDiffService.getVideoStatus(taskId);
      const status2 = await animateDiffService.getVideoStatus(taskId);
      
      // Check if the task ID is consistent
      expect(status1.taskId).toBe(taskId);
      expect(status2.taskId).toBe(taskId);
      // Check if the service type is consistent
      expect(status1.service).toBe(status2.service);
      // Progress should increase over time, but not decrease
      expect(status2.progress).toBeGreaterThanOrEqual(status1.progress);
    });
  });

  describe('mock functionality', () => {
    test('should generate realistic mock progress', async () => {
      // Test with a fixed task ID to ensure consistent progress calculation
      const fixedTaskId = 'animate-mock-0000000000-fixed123';
      
      const result = await animateDiffService.getVideoStatus(fixedTaskId);
      
      // Check if progress is a number between 0 and 100
      expect(result.progress).toBeGreaterThanOrEqual(0);
      expect(result.progress).toBeLessThanOrEqual(100);
      // Check if it's an integer
      expect(Number.isInteger(result.progress)).toBe(true);
    });

    test('should return appropriate status messages based on progress', async () => {
      // Create a task ID that will generate 80% progress
      const highProgressTaskId = `animate-mock-${Date.now() - 800000}-highprog`;
      // Create a task ID that will generate 30% progress
      const lowProgressTaskId = `animate-mock-${Date.now() - 300000}-lowprog`;
      // Create a task ID that will generate 100% progress
      const completedTaskId = `animate-mock-${Date.now() - 1000000}-completed`;
      
      const highProgressResult = await animateDiffService.getVideoStatus(highProgressTaskId);
      const lowProgressResult = await animateDiffService.getVideoStatus(lowProgressTaskId);
      const completedResult = await animateDiffService.getVideoStatus(completedTaskId);
      
      // Check high progress message
      expect(highProgressResult.message).toContain('Finalizing video');
      // Check low progress message
      expect(lowProgressResult.message).toContain('Generating content');
      // Check completed message
      expect(completedResult.status).toBe('completed');
      expect(completedResult.message).toBe('Video generation completed successfully');
    });
  });
});
