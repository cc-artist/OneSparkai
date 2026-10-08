const logger = require('../config/logger');
const aiService = require('./ai-service');
const taskManager = require('./task-manager');

class MonitoringService {
  constructor() {
    this.metrics = {
      requests: { total: 0, success: 0, failed: 0, byEndpoint: {} },
      aiCalls: { total: 0, success: 0, failed: 0, fallback: 0, byModel: {} },
      tasks: { created: 0, completed: 0, failed: 0, inProgress: 0 },
      responseTime: { total: 0, count: 0, max: 0, min: Infinity, byEndpoint: {} },
      errors: [],
      memoryUsage: { history: [] },
      cpuUsage: { history: [] },
      queueLength: { history: [] },
      concurrentRequests: { max: 0, current: 0 }
    };
    this.startTime = Date.now();
    this.errorHistory = [];
    this.maxErrorHistory = 100;
    this.maxMetricHistory = 60;
    
    this.startMonitoring();
    this.startHealthCheck();
  }

  startMonitoring() {
    this.metricsInterval = setInterval(() => {
      this.recordSystemMetrics();
    }, 5000);

    this.logInterval = setInterval(() => {
      this.logSummary();
    }, 60000);
  }

  startHealthCheck() {
    this.healthCheckInterval = setInterval(() => {
      const health = this.checkHealth();
      if (health.status === 'degraded') {
        logger.warn(`[健康检查] 服务状态降级: ${health.issues.join(', ')}`);
      }
    }, 30000);
  }

  recordSystemMetrics() {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    this.metrics.memoryUsage.history.push({
      timestamp: Date.now(),
      rss: memoryUsage.rss,
      heapTotal: memoryUsage.heapTotal,
      heapUsed: memoryUsage.heapUsed,
      external: memoryUsage.external
    });
    
    this.metrics.cpuUsage.history.push({
      timestamp: Date.now(),
      user: cpuUsage.user,
      system: cpuUsage.system
    });

    if (this.metrics.memoryUsage.history.length > this.maxMetricHistory) {
      this.metrics.memoryUsage.history.shift();
    }
    if (this.metrics.cpuUsage.history.length > this.maxMetricHistory) {
      this.metrics.cpuUsage.history.shift();
    }
  }

  recordRequest(success, endpoint = 'unknown') {
    this.metrics.requests.total++;
    if (success) {
      this.metrics.requests.success++;
    } else {
      this.metrics.requests.failed++;
    }

    if (!this.metrics.requests.byEndpoint[endpoint]) {
      this.metrics.requests.byEndpoint[endpoint] = { total: 0, success: 0, failed: 0 };
    }
    this.metrics.requests.byEndpoint[endpoint].total++;
    if (success) {
      this.metrics.requests.byEndpoint[endpoint].success++;
    } else {
      this.metrics.requests.byEndpoint[endpoint].failed++;
    }
  }

  recordAICall(success, model = 'unknown', fallback = false) {
    this.metrics.aiCalls.total++;
    if (success) {
      this.metrics.aiCalls.success++;
      if (fallback) {
        this.metrics.aiCalls.fallback++;
      }
    } else {
      this.metrics.aiCalls.failed++;
    }

    if (!this.metrics.aiCalls.byModel[model]) {
      this.metrics.aiCalls.byModel[model] = { total: 0, success: 0, failed: 0 };
    }
    this.metrics.aiCalls.byModel[model].total++;
    if (success) {
      this.metrics.aiCalls.byModel[model].success++;
    } else {
      this.metrics.aiCalls.byModel[model].failed++;
    }
  }

  recordTask(status) {
    if (status === 'created') {
      this.metrics.tasks.created++;
      this.metrics.tasks.inProgress++;
    } else if (status === 'completed') {
      this.metrics.tasks.completed++;
      this.metrics.tasks.inProgress = Math.max(0, this.metrics.tasks.inProgress - 1);
    } else if (status === 'failed') {
      this.metrics.tasks.failed++;
      this.metrics.tasks.inProgress = Math.max(0, this.metrics.tasks.inProgress - 1);
    }
  }

  recordResponseTime(timeMs, endpoint = 'unknown') {
    this.metrics.responseTime.total += timeMs;
    this.metrics.responseTime.count++;
    this.metrics.responseTime.max = Math.max(this.metrics.responseTime.max, timeMs);
    this.metrics.responseTime.min = Math.min(this.metrics.responseTime.min, timeMs);

    if (!this.metrics.responseTime.byEndpoint[endpoint]) {
      this.metrics.responseTime.byEndpoint[endpoint] = { total: 0, count: 0, max: 0, min: Infinity };
    }
    const epMetrics = this.metrics.responseTime.byEndpoint[endpoint];
    epMetrics.total += timeMs;
    epMetrics.count++;
    epMetrics.max = Math.max(epMetrics.max, timeMs);
    epMetrics.min = Math.min(epMetrics.min, timeMs);
  }

  recordConcurrentRequest(delta) {
    this.metrics.concurrentRequests.current += delta;
    this.metrics.concurrentRequests.max = Math.max(
      this.metrics.concurrentRequests.max,
      this.metrics.concurrentRequests.current
    );
  }

  recordError(error, context = '', endpoint = '') {
    const errorRecord = {
      timestamp: new Date().toISOString(),
      message: error.message || String(error),
      stack: error.stack,
      context: context,
      endpoint: endpoint,
      type: error.name || 'Error',
      code: error.code || null
    };
    
    this.metrics.errors.push(errorRecord);
    if (this.metrics.errors.length > this.maxErrorHistory) {
      this.metrics.errors.shift();
    }
    
    logger.error(`[监控] 错误记录: ${context} - ${error.message}`, {
      endpoint,
      errorType: error.name,
      errorCode: error.code
    });
  }

  getMetrics() {
    const avgResponseTime = this.metrics.responseTime.count > 0 
      ? (this.metrics.responseTime.total / this.metrics.responseTime.count).toFixed(2)
      : 0;
    
    const requestSuccessRate = this.metrics.requests.total > 0
      ? ((this.metrics.requests.success / this.metrics.requests.total) * 100).toFixed(2)
      : 0;
    
    const aiSuccessRate = this.metrics.aiCalls.total > 0
      ? ((this.metrics.aiCalls.success / this.metrics.aiCalls.total) * 100).toFixed(2)
      : 0;
    
    const uptime = this.formatUptime(Date.now() - this.startTime);
    
    const recentMemory = this.metrics.memoryUsage.history.slice(-10);
    const avgMemoryUsage = recentMemory.length > 0
      ? (recentMemory.reduce((sum, m) => sum + m.heapUsed, 0) / recentMemory.length / (1024 * 1024)).toFixed(2)
      : 0;

    const endpointMetrics = {};
    for (const [endpoint, data] of Object.entries(this.metrics.requests.byEndpoint)) {
      const epAvgTime = this.metrics.responseTime.byEndpoint[endpoint];
      endpointMetrics[endpoint] = {
        total: data.total,
        success: data.success,
        failed: data.failed,
        successRate: data.total > 0 ? `${((data.success / data.total) * 100).toFixed(2)}%` : '0%',
        avgResponseTime: epAvgTime && epAvgTime.count > 0 
          ? `${(epAvgTime.total / epAvgTime.count).toFixed(2)}ms` 
          : '0ms'
      };
    }

    const modelMetrics = {};
    for (const [model, data] of Object.entries(this.metrics.aiCalls.byModel)) {
      modelMetrics[model] = {
        total: data.total,
        success: data.success,
        failed: data.failed,
        successRate: data.total > 0 ? `${((data.success / data.total) * 100).toFixed(2)}%` : '0%'
      };
    }

    return {
      uptime,
      timestamp: new Date().toISOString(),
      requests: {
        ...this.metrics.requests,
        successRate: `${requestSuccessRate}%`,
        byEndpoint: endpointMetrics
      },
      aiCalls: {
        ...this.metrics.aiCalls,
        successRate: `${aiSuccessRate}%`,
        byModel: modelMetrics
      },
      tasks: {
        ...this.metrics.tasks,
        completionRate: this.metrics.tasks.created > 0 
          ? `${((this.metrics.tasks.completed / this.metrics.tasks.created) * 100).toFixed(2)}%`
          : '0%'
      },
      responseTime: {
        average: `${avgResponseTime}ms`,
        max: `${this.metrics.responseTime.max}ms`,
        min: this.metrics.responseTime.min === Infinity ? '0ms' : `${this.metrics.responseTime.min}ms`,
        byEndpoint: this.metrics.responseTime.byEndpoint
      },
      system: {
        memory: {
          current: {
            rss: `${(process.memoryUsage().rss / (1024 * 1024)).toFixed(2)} MB`,
            heapTotal: `${(process.memoryUsage().heapTotal / (1024 * 1024)).toFixed(2)} MB`,
            heapUsed: `${(process.memoryUsage().heapUsed / (1024 * 1024)).toFixed(2)} MB`,
            external: `${(process.memoryUsage().external / (1024 * 1024)).toFixed(2)} MB`
          },
          average: `${avgMemoryUsage} MB`
        },
        cpu: {
          usage: process.cpuUsage()
        },
        concurrentRequests: this.metrics.concurrentRequests
      },
      availableModels: aiService.getAvailableModels(),
      activeTasks: taskManager.getStats().pending + taskManager.getStats().processing,
      recentErrors: this.metrics.errors.slice(-10)
    };
  }

  formatUptime(ms) {
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    
    if (days > 0) {
      return `${days}天 ${hours}小时 ${minutes}分钟`;
    } else if (hours > 0) {
      return `${hours}小时 ${minutes}分钟 ${seconds}秒`;
    } else if (minutes > 0) {
      return `${minutes}分钟 ${seconds}秒`;
    } else {
      return `${seconds}秒`;
    }
  }

  logSummary() {
    const metrics = this.getMetrics();
    
    logger.info(`[监控摘要] 运行时间: ${metrics.uptime}`);
    logger.info(`[监控摘要] 请求: 总数=${metrics.requests.total}, 成功=${metrics.requests.success}, 失败=${metrics.requests.failed}, 成功率=${metrics.requests.successRate}`);
    logger.info(`[监控摘要] AI调用: 总数=${metrics.aiCalls.total}, 成功=${metrics.aiCalls.success}, 失败=${metrics.aiCalls.failed}, 降级=${metrics.aiCalls.fallback}`);
    logger.info(`[监控摘要] 任务: 创建=${metrics.tasks.created}, 完成=${metrics.tasks.completed}, 失败=${metrics.tasks.failed}, 进行中=${metrics.tasks.inProgress}`);
    logger.info(`[监控摘要] 响应时间: 平均=${metrics.responseTime.average}, 最大=${metrics.responseTime.max}, 最小=${metrics.responseTime.min}`);
    logger.info(`[监控摘要] 内存使用: ${metrics.system.memory.current.heapUsed}`);
  }

  checkHealth() {
    const successRate = this.metrics.requests.total > 0
      ? ((this.metrics.requests.success / this.metrics.requests.total) * 100).toFixed(2)
      : '100.00';
    const aiSuccessRate = this.metrics.aiCalls.total > 0
      ? ((this.metrics.aiCalls.success / this.metrics.aiCalls.total) * 100).toFixed(2)
      : '100.00';
    const avgResponseTime = this.metrics.responseTime.count > 0
      ? (this.metrics.responseTime.total / this.metrics.responseTime.count).toFixed(2)
      : '0';
    const issues = [];

    if (parseFloat(successRate) < 90) {
      issues.push(`请求成功率低于90%: ${successRate}`);
    }

    if (parseFloat(aiSuccessRate) < 85) {
      issues.push(`AI调用成功率低于85%: ${aiSuccessRate}`);
    }

    if (parseFloat(avgResponseTime) > 5000) {
      issues.push(`平均响应时间超过5秒: ${avgResponseTime}`);
    }

    if (aiService.getAvailableModels().length === 0) {
      issues.push('未配置任何AI模型');
    }

    const heapUsedMB = process.memoryUsage().heapUsed / (1024 * 1024);
    if (heapUsedMB > 500) {
      issues.push(`内存使用过高: ${heapUsedMB.toFixed(2)} MB`);
    }

    const taskStats = taskManager.getStats();
    const inProgress = taskStats.pending + taskStats.processing;
    if (inProgress > 10) {
      issues.push(`进行中任务过多: ${inProgress}`);
    }

    return {
      status: issues.length === 0 ? 'healthy' : issues.length <= 2 ? 'degraded' : 'unhealthy',
      issues: issues
    };
  }

  resetMetrics() {
    this.metrics = {
      requests: { total: 0, success: 0, failed: 0, byEndpoint: {} },
      aiCalls: { total: 0, success: 0, failed: 0, fallback: 0, byModel: {} },
      tasks: { created: 0, completed: 0, failed: 0, inProgress: 0 },
      responseTime: { total: 0, count: 0, max: 0, min: Infinity, byEndpoint: {} },
      errors: [],
      memoryUsage: { history: [] },
      cpuUsage: { history: [] },
      queueLength: { history: [] },
      concurrentRequests: { max: 0, current: 0 }
    };
    this.startTime = Date.now();
    logger.info('[监控] 指标已重置');
  }

  getPerformanceReport(hours = 24) {
    const metrics = this.getMetrics();
    const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
    
    const recentErrors = this.metrics.errors.filter(e => new Date(e.timestamp).getTime() >= cutoffTime);
    
    return {
      period: `${hours}小时`,
      startTime: new Date(cutoffTime).toISOString(),
      endTime: new Date().toISOString(),
      summary: {
        totalRequests: metrics.requests.total,
        successRate: metrics.requests.successRate,
        avgResponseTime: metrics.responseTime.average,
        aiSuccessRate: metrics.aiCalls.successRate,
        taskCompletionRate: metrics.tasks.completionRate,
        errorCount: recentErrors.length
      },
      topEndpoints: Object.entries(metrics.requests.byEndpoint)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 10)
        .map(([endpoint, data]) => ({
          endpoint,
          ...data,
          successRate: data.total > 0 ? `${((data.success / data.total) * 100).toFixed(2)}%` : '0%'
        })),
      modelPerformance: Object.entries(metrics.aiCalls.byModel)
        .map(([model, data]) => ({
          model,
          ...data,
          successRate: data.total > 0 ? `${((data.success / data.total) * 100).toFixed(2)}%` : '0%'
        })),
      errors: recentErrors.slice(-20),
      health: metrics.health
    };
  }

  shutdown() {
    if (this.metricsInterval) clearInterval(this.metricsInterval);
    if (this.logInterval) clearInterval(this.logInterval);
    if (this.healthCheckInterval) clearInterval(this.healthCheckInterval);
    logger.info('[监控] 监控服务已关闭');
  }
}

module.exports = new MonitoringService();