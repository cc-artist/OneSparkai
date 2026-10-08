const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const uuidv4 = require('uuid').v4;

// Create Express app
const app = express();
const PORT = process.env.PORT || 3002;

// Enable CORS
app.use(cors({
  origin: '*'
}));

// Parse JSON requests
app.use(express.json({
  limit: '10mb'
}));

// Parse URL-encoded requests
app.use(express.urlencoded({
  extended: true,
  limit: '10mb'
}));

// Serve static files for uploaded videos
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(path.join(uploadsDir, 'videos'))) {
  fs.mkdirSync(path.join(uploadsDir, 'videos'), { recursive: true });
}
app.use('/uploads', (req, res, next) => {
  // Add CORS headers for static files
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
}, express.static(uploadsDir));

// Video tasks cache
const videoTasks = {};

// Root route
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Welcome to One Spark API',
    status: 'ok',
    service: 'one-spark-backend',
    version: 'v1',
    api_base_url: `http://localhost:${PORT}/api/v1`
  });
});

// API routes
app.post('/api/v1/video-generator', (req, res) => {
  try {
    const { videoModel, videoTitle, videoDescription, videoStyle, resolution, voiceOver, voiceScript } = req.body;
    
    // Generate task ID
    const taskId = uuidv4();
    
    // Create task
    videoTasks[taskId] = {
      taskId,
      status: 'pending',
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      videoParams: {
        videoModel,
        videoTitle,
        videoDescription,
        videoStyle,
        resolution,
        voiceOver,
        voiceScript
      }
    };
    
    console.log('Created video generation task:', taskId);
    console.log('Task details:', videoTasks[taskId]);
    
    res.status(200).json({
      taskId,
      status: 'pending',
      message: 'Video generation started',
      progress: 0
    });
  } catch (error) {
    console.error('Error creating video generation task:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Get video status
app.get('/api/v1/video-generator/:taskId', (req, res) => {
  try {
    const { taskId } = req.params;
    
    if (!videoTasks[taskId]) {
      return res.status(404).json({
        error: 'Task not found',
        message: 'Task not found'
      });
    }
    
    let task = videoTasks[taskId];
    task.updatedAt = new Date();
    
    // Update progress
    if (task.status === 'pending') {
      task.status = 'processing';
      task.progress = 20;
    } else if (task.status === 'processing') {
      task.progress = Math.min(task.progress + 15, 95);
      
      // Check if task should be completed
      const taskAge = (new Date() - new Date(task.createdAt)) / 1000;
      if (taskAge > 8 || task.progress >= 90) {
        task.status = 'completed';
        task.progress = 100;
        task.completedAt = new Date();
        
        // Generate video URL
        const videoFileName = `${taskId}.mp4`;
        const videoFilePath = path.join(uploadsDir, 'videos', videoFileName);
        
        // Create a dummy video file for testing
        fs.writeFileSync(videoFilePath, 'Dummy video content');
        
        task.videoUrl = `http://localhost:${PORT}/uploads/videos/${videoFileName}`;
        task.message = 'Video generation completed successfully';
      }
    }
    
    videoTasks[taskId] = task;
    
    console.log('Task status:', task);
    
    res.status(200).json({
      taskId: task.taskId,
      status: task.status,
      progress: task.progress,
      message: task.message,
      videoUrl: task.videoUrl,
      estimatedTime: 'Calculating...',
      serviceName: 'Local',
      videoModel: task.videoParams.videoModel
    });
  } catch (error) {
    console.error('Error getting video status:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Get video history
app.get('/api/v1/video-generator/history', (req, res) => {
  try {
    const history = Object.values(videoTasks).map(task => ({
      taskId: task.taskId,
      status: task.status,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      completedAt: task.completedAt,
      videoTitle: task.videoParams.videoTitle,
      videoUrl: task.videoUrl,
      videoModel: task.videoParams.videoModel
    }));
    
    res.status(200).json({
      history
    });
  } catch (error) {
    console.error('Error getting video history:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: development`);
  console.log(`API version: v1`);
  console.log(`API docs available at: http://localhost:${PORT}/api-docs`);
}).on('error', (error) => {
  console.error('Server startup error:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please free the port and try again.`);
  }
  process.exit(1);
});

module.exports = app;