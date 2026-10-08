const logger = require('../config/logger');

class TaskManager {
  constructor() {
    this.tasks = new Map();
    this.taskIdCounter = 0;
    this.pendingQueue = [];
    this.processingTasks = new Set();
    this.maxConcurrentTasks = 5;
  }

  createTask(type, data = {}) {
    const taskId = `task-${++this.taskIdCounter}-${Date.now()}`;
    
    const task = {
      id: taskId,
      type: type,
      status: 'pending',
      data: data,
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      startedAt: null,
      completedAt: null,
      error: null,
      result: null
    };

    this.tasks.set(taskId, task);
    this.pendingQueue.push(taskId);
    
    logger.info(`创建任务: ${taskId}, 类型: ${type}`);
    
    this._processQueue();
    
    return taskId;
  }

  getTask(taskId) {
    return this.tasks.get(taskId) || null;
  }

  updateTask(taskId, updates) {
    const task = this.tasks.get(taskId);
    if (!task) {
      return false;
    }

    Object.assign(task, updates, { updatedAt: new Date() });
    this.tasks.set(taskId, task);
    
    logger.debug(`更新任务: ${taskId}, 状态: ${task.status}`);
    
    return true;
  }

  updateProgress(taskId, progress, message = '') {
    return this.updateTask(taskId, { 
      progress: Math.min(100, Math.max(0, progress)),
      status: progress >= 100 ? 'completed' : 'processing',
      progressMessage: message
    });
  }

  completeTask(taskId, result) {
    return this.updateTask(taskId, {
      status: 'completed',
      progress: 100,
      result: result,
      completedAt: new Date()
    });
  }

  failTask(taskId, error) {
    return this.updateTask(taskId, {
      status: 'failed',
      error: typeof error === 'string' ? error : error.message,
      completedAt: new Date()
    });
  }

  deleteTask(taskId) {
    this.tasks.delete(taskId);
    const index = this.pendingQueue.indexOf(taskId);
    if (index > -1) {
      this.pendingQueue.splice(index, 1);
    }
    this.processingTasks.delete(taskId);
    
    logger.info(`删除任务: ${taskId}`);
  }

  getAllTasks() {
    return Array.from(this.tasks.values());
  }

  getTasksByStatus(status) {
    return Array.from(this.tasks.values()).filter(t => t.status === status);
  }

  async _processQueue() {
    while (this.pendingQueue.length > 0 && 
           this.processingTasks.size < this.maxConcurrentTasks) {
      
      const taskId = this.pendingQueue.shift();
      const task = this.tasks.get(taskId);
      
      if (!task) continue;
      
      this.processingTasks.add(taskId);
      task.status = 'processing';
      task.startedAt = new Date();
      task.updatedAt = new Date();
      
      logger.info(`开始处理任务: ${taskId}`);
      
      this._executeTask(taskId).then(() => {
        this.processingTasks.delete(taskId);
        this._processQueue();
      }).catch((error) => {
        this.processingTasks.delete(taskId);
        this.failTask(taskId, error);
        logger.error(`任务执行失败: ${taskId}, 错误: ${error.message}`);
        this._processQueue();
      });
    }
  }

  async _executeTask(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) return;

    try {
      switch (task.type) {
        case 'prompt-generation':
          await this._executePromptGeneration(task);
          break;
        case 'content-analysis':
          await this._executeContentAnalysis(task);
          break;
        case 'video-generation':
          await this._executeVideoGeneration(task);
          break;
        case 'image-generation':
          await this._executeImageGeneration(task);
          break;
        default:
          throw new Error(`未知任务类型: ${task.type}`);
      }
    } catch (error) {
      throw error;
    }
  }

  async _executePromptGeneration(task) {
    const aiService = require('./ai-service');
    const { content, options } = task.data;
    
    try {
      this.updateProgress(task.id, 20, '正在分析内容...');
      
      const prompt = `你是一位专业的AI提示词专家。请基于以下内容，生成高质量的提示词：\n\n${content}\n\n要求：\n1. 详细描述内容主题\n2. 包含风格和语气要求\n3. 适合用于AI内容生成`;
      
      this.updateProgress(task.id, 50, '正在调用AI模型...');
      
      const result = await aiService.callModel(prompt, options);
      
      this.updateProgress(task.id, 80, '正在整理结果...');
      
      this.completeTask(task.id, {
        prompt: result.content,
        modelUsed: result.modelUsed,
        confidence: 95
      });
      
      logger.info(`提示词生成任务完成: ${task.id}`);
    } catch (error) {
      throw error;
    }
  }

  async _executeContentAnalysis(task) {
    const aiService = require('./ai-service');
    const { content } = task.data;
    
    try {
      this.updateProgress(task.id, 30, '正在分析文档内容...');
      
      const prompt = `请分析以下文档内容，提取关键信息：\n\n${content}\n\n分析维度：\n1. 主题\n2. 关键词\n3. 核心要点\n4. 目标受众\n5. 写作风格\n\n请用JSON格式输出`;
      
      this.updateProgress(task.id, 60, '正在调用AI分析...');
      
      const result = await aiService.callModel(prompt, { maxTokens: 800 });
      
      let analysis;
      try {
        analysis = JSON.parse(result.content);
      } catch {
        analysis = { summary: result.content };
      }
      
      this.updateProgress(task.id, 90, '正在整理分析结果...');
      
      this.completeTask(task.id, {
        analysis: analysis,
        modelUsed: result.modelUsed
      });
      
      logger.info(`内容分析任务完成: ${task.id}`);
    } catch (error) {
      throw error;
    }
  }

  async _executeVideoGeneration(task) {
    this.updateProgress(task.id, 100, '视频生成任务已委托');
    this.completeTask(task.id, { delegated: true });
  }

  async _executeImageGeneration(task) {
    this.updateProgress(task.id, 100, '图像生成任务已委托');
    this.completeTask(task.id, { delegated: true });
  }

  getStats() {
    const pending = this.pendingQueue.length;
    const processing = this.processingTasks.size;
    const completed = Array.from(this.tasks.values()).filter(t => t.status === 'completed').length;
    const failed = Array.from(this.tasks.values()).filter(t => t.status === 'failed').length;
    
    return {
      pending,
      processing,
      completed,
      failed,
      total: this.tasks.size,
      maxConcurrentTasks: this.maxConcurrentTasks
    };
  }
}

module.exports = new TaskManager();