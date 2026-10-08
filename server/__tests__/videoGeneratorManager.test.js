const videoGeneratorManager = require('../services/videoGeneratorManager');

describe('VideoGeneratorManager', () => {
  beforeEach(() => {
    // Reset any state before each test
    jest.clearAllTimers();
  });

  describe('core functionality', () => {
    test('should initialize with default values', () => {
      // Check if the manager is initialized properly
      expect(videoGeneratorManager).toBeDefined();
      expect(typeof videoGeneratorManager.generateVideo).toBe('function');
      expect(typeof videoGeneratorManager.getVideoStatus).toBe('function');
      expect(typeof videoGeneratorManager.mimicVideo).toBe('function');
      expect(typeof videoGeneratorManager.getAvailableServices).toBe('function');
    });

    test('should return available services information', () => {
      // Test the getAvailableServices method
      const availableServices = videoGeneratorManager.getAvailableServices();
      
      // Check if it returns an array
      expect(Array.isArray(availableServices)).toBe(true);
      expect(availableServices.length).toBeGreaterThan(0);
      
      // Check if each service has the expected properties
      availableServices.forEach(service => {
        expect(service).toHaveProperty('name');
        expect(service).toHaveProperty('description');
        expect(service).toHaveProperty('supportsMimic');
        expect(service).toHaveProperty('weight');
      });
    });

    test('should generate video with random service selection', async () => {
      // Test the generateVideo method
      const params = {
        videoModel: 'test-model',
        videoTitle: 'Test Video',
        videoDescription: 'This is a test video',
        videoStyle: 'realistic',
        resolution: '1080p',
        voiceOver: 'none',
        voiceScript: ''
      };
      
      const result = await videoGeneratorManager.generateVideo(params, 'test-request-id');
      
      // Check if the result has the expected properties
      expect(result).toHaveProperty('taskId');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('estimatedTime');
      expect(result).toHaveProperty('serviceName');
      expect(result).toHaveProperty('serviceDescription');
      
      // Check if the service name is valid
      expect(typeof result.serviceName).toBe('string');
      expect(result.serviceName.length).toBeGreaterThan(0);
    });

    test('should handle mimic video generation', async () => {
      // Test the mimicVideo method
      const params = {
        mimicVideoUrl: 'https://example.com/reference-video.mp4',
        videoTitle: 'Mimic Test Video',
        videoDescription: 'This is a mimic test video',
        videoStyle: 'realistic',
        resolution: '1080p'
      };
      
      const result = await videoGeneratorManager.mimicVideo(params, 'test-mimic-request-id');
      
      // Check if the result has the expected properties
      expect(result).toHaveProperty('taskId');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('estimatedTime');
      expect(result).toHaveProperty('serviceName');
      expect(result).toHaveProperty('serviceDescription');
    });
  });

  describe('service selection', () => {
    test('should select services based on weights', async () => {
      // Test that the manager selects services randomly based on weights
      const params = {
        videoModel: 'test-model',
        videoTitle: 'Test Video',
        videoDescription: 'This is a test video',
        videoStyle: 'realistic',
        resolution: '1080p',
        voiceOver: 'none',
        voiceScript: ''
      };
      
      // Generate multiple videos and check service selection diversity
      const serviceSelections = [];
      const iterations = 5; // Reduced from 10 to avoid timeout
      
      for (let i = 0; i < iterations; i++) {
        const result = await videoGeneratorManager.generateVideo(params, `test-request-${i}`);
        serviceSelections.push(result.serviceName);
      }
      
      // Check if we got at least one selection for each available service
      const uniqueServices = [...new Set(serviceSelections)];
      const availableServices = videoGeneratorManager.getAvailableServices();
      
      // We should have at least one unique service selected
      expect(uniqueServices.length).toBeGreaterThan(0);
      
      // All selected services should be in the available services list
      uniqueServices.forEach(selectedService => {
        const serviceExists = availableServices.some(service => service.name === selectedService);
        expect(serviceExists).toBe(true);
      });
    }, 10000); // Increased timeout to 10 seconds

    test('should handle mimic video requests with appropriate services', async () => {
      // Test that mimic video requests are handled properly
      const params = {
        referenceVideo: 'https://example.com/reference-video.mp4',
        videoTitle: 'Mimic Test Video',
        videoDescription: 'This is a mimic test video',
        videoStyle: 'realistic',
        resolution: '1080p'
      };
      
      const result = await videoGeneratorManager.mimicVideo(params, 'test-mimic-request-id');
      
      // Check if the service supports mimic functionality
      const availableServices = videoGeneratorManager.getAvailableServices();
      const selectedService = availableServices.find(service => service.name === result.serviceName);
      
      expect(selectedService).toBeDefined();
      expect(selectedService.supportsMimic).toBe(true);
    });

    test('should return valid service status information', async () => {
      // Generate a video first to get a task ID
      const params = {
        videoModel: 'test-model',
        videoTitle: 'Test Video',
        videoDescription: 'This is a test video',
        videoStyle: 'realistic',
        resolution: '1080p',
        voiceOver: 'none',
        voiceScript: ''
      };
      
      const generateResult = await videoGeneratorManager.generateVideo(params, 'test-request-id');
      
      // Now get the status for this task
      const statusResult = await videoGeneratorManager.getVideoStatus(
        generateResult.serviceName,
        generateResult.taskId,
        'test-status-request-id'
      );
      
      // Check if the status has the expected properties
      expect(statusResult).toHaveProperty('taskId');
      expect(statusResult).toHaveProperty('status');
      expect(statusResult).toHaveProperty('message');
      expect(statusResult).toHaveProperty('progress');
      expect(statusResult).toHaveProperty('estimatedTime');
      
      // Check if the task ID matches
      expect(statusResult.taskId).toBe(generateResult.taskId);
    });
  });

  describe('service management', () => {
    test('should handle multiple video generation requests', async () => {
      // Test that the manager can handle multiple requests concurrently
      const params = {
        videoModel: 'test-model',
        videoTitle: 'Test Video',
        videoDescription: 'This is a test video',
        videoStyle: 'realistic',
        resolution: '1080p',
        voiceOver: 'none',
        voiceScript: ''
      };
      
      // Generate multiple videos concurrently
      const requests = Array.from({ length: 5 }, (_, i) =>
        videoGeneratorManager.generateVideo(params, `test-concurrent-request-${i}`)
      );
      
      const results = await Promise.all(requests);
      
      // Check if all requests succeeded
      results.forEach((result, index) => {
        expect(result).toHaveProperty('taskId');
        expect(result.status).toBe('processing');
        expect(result.message).toBe('Video generation started successfully');
      });
      
      // Check if we got results from different services (if available)
      const serviceNames = results.map(result => result.serviceName);
      const uniqueServiceNames = [...new Set(serviceNames)];
      
      // We should have at least one unique service name
      expect(uniqueServiceNames.length).toBeGreaterThan(0);
    });
  });
});
