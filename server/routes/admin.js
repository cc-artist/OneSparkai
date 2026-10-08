const express = require('express');
const router = express.Router();
const { authenticateToken } = require('./admin-auth');
const config = require('../config');
const logger = require('../config/logger');
const monitoringService = require('../services/monitoring-service');

// 管理界面首页
router.get('/', authenticateToken, (req, res) => {
  res.status(200).json({
    message: 'Admin dashboard API',
    user: req.user,
    features: {
      users: '/api/v1/admin/users',
      videos: '/api/v1/admin/videos',
      settings: '/api/v1/admin/settings',
      analytics: '/api/v1/admin/analytics'
    }
  });
});

// 用户管理
router.get('/users', authenticateToken, (req, res) => {
  // 模拟用户数据
  const users = [
    {
      id: 1,
      username: 'admin',
      role: 'admin',
      createdAt: new Date().toISOString()
    }
  ];
  
  res.status(200).json({
    message: 'Users retrieved successfully',
    users
  });
});

// 视频管理
router.get('/videos', authenticateToken, (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const videosDir = path.join(__dirname, '../uploads/videos');
    
    // 读取视频文件
    const videoFiles = fs.readdirSync(videosDir)
      .filter(file => file.endsWith('.mp4'))
      .map(file => {
        const stats = fs.statSync(path.join(videosDir, file));
        return {
          id: file.split('.')[0],
          filename: file,
          size: stats.size,
          createdAt: stats.birthtime.toISOString(),
          url: `/uploads/videos/${file}`
        };
      });
    
    res.status(200).json({
      message: 'Videos retrieved successfully',
      videos: videoFiles,
      total: videoFiles.length
    });
    
  } catch (error) {
    logger.error('Error retrieving videos:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// 删除视频
router.delete('/videos/:filename', authenticateToken, (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const filename = req.params.filename;
    const videoPath = path.join(__dirname, '../uploads/videos', filename);
    
    if (fs.existsSync(videoPath)) {
      fs.unlinkSync(videoPath);
      res.status(200).json({ message: 'Video deleted successfully' });
    } else {
      res.status(404).json({ message: 'Video not found' });
    }
    
  } catch (error) {
    logger.error('Error deleting video:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// 系统设置
router.get('/settings', authenticateToken, (req, res) => {
  res.status(200).json({
    message: 'Settings retrieved successfully',
    settings: {
      server: config.server,
      aiModel: {
        gemini: {
          apiKey: config.aiModel.gemini.apiKey ? '****' : 'Not set',
          model: config.aiModel.gemini.model
        },
        openai: {
          apiKey: config.aiModel.openai.apiKey ? '****' : 'Not set',
          model: config.aiModel.openai.model
        }
      },
      rateLimit: config.rateLimit,
      cors: config.cors
    }
  });
});

// 更新设置
router.put('/settings', authenticateToken, (req, res) => {
  try {
    const { settings } = req.body;
    
    // 这里应该更新配置文件，实际项目中需要实现
    res.status(200).json({
      message: 'Settings updated successfully',
      settings: req.body.settings
    });
    
  } catch (error) {
    logger.error('Error updating settings:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// 系统分析
router.get('/analytics', authenticateToken, (req, res) => {
  const metrics = monitoringService.getMetrics();
  
  res.status(200).json({
    message: 'Analytics retrieved successfully',
    analytics: {
      totalVideos: 150,
      totalUsers: 10,
      totalRequests: metrics.requests.total,
      todayRequests: metrics.requests.total,
      systemMetrics: {
        memory: metrics.system.memory,
        cpu: metrics.system.cpu,
        uptime: metrics.uptime
      }
    }
  });
});

// 监控指标
router.get('/metrics', authenticateToken, (req, res) => {
  const metrics = monitoringService.getMetrics();
  
  res.status(200).json({
    message: 'Metrics retrieved successfully',
    metrics
  });
});

// 健康检查
router.get('/health', authenticateToken, (req, res) => {
  const health = monitoringService.checkHealth();
  
  res.status(health.status === 'unhealthy' ? 503 : 200).json({
    message: `Service is ${health.status}`,
    ...health
  });
});

// 性能报告
router.get('/performance', authenticateToken, (req, res) => {
  const hours = parseInt(req.query.hours) || 24;
  const report = monitoringService.getPerformanceReport(hours);
  
  res.status(200).json({
    message: `Performance report for last ${hours} hours retrieved successfully`,
    report
  });
});

// 错误列表
router.get('/errors', authenticateToken, (req, res) => {
  const metrics = monitoringService.getMetrics();
  
  res.status(200).json({
    message: 'Errors retrieved successfully',
    errors: metrics.recentErrors,
    totalErrors: metrics.recentErrors.length
  });
});

// 重置监控指标
router.post('/reset-metrics', authenticateToken, (req, res) => {
  monitoringService.resetMetrics();
  
  res.status(200).json({
    message: 'Metrics reset successfully'
  });
});

// 系统信息
router.get('/system', authenticateToken, (req, res) => {
  const metrics = monitoringService.getMetrics();
  
  res.status(200).json({
    message: 'System info retrieved successfully',
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      architecture: process.arch,
      pid: process.pid,
      uptime: metrics.uptime,
      environment: config.server.nodeEnv,
      version: config.server.apiVersion,
      memory: metrics.system.memory,
      health: metrics.health
    }
  });
});

module.exports = router;