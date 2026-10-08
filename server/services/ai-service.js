const logger = require('../config/logger');
const config = require('../config');
const axios = require('axios');

class AIService {
  constructor() {
    this.models = [];
    this.currentModel = null;
    this.fallbackModels = [];
    this.initializeModels();
  }

  initializeModels() {
    const isValidKey = (key) => key && key.trim() !== '' && !key.includes('your_') && !key.includes('placeholder');

    if (isValidKey(config.aiModel.openai.apiKey)) {
      this.models.push({
        type: 'openai',
        name: 'OpenAI',
        apiKey: config.aiModel.openai.apiKey,
        baseUrl: config.aiModel.openai.baseUrl,
        model: 'gpt-3.5-turbo',
        priority: 1
      });
    }

    if (isValidKey(config.aiModel.gemini.apiKey)) {
      this.models.push({
        type: 'gemini',
        name: 'Gemini',
        apiKey: config.aiModel.gemini.apiKey,
        baseUrl: config.aiModel.gemini.baseUrl,
        model: 'gemini-pro',
        priority: 2
      });
    }

    if (isValidKey(config.aiModel.bigModel.apiKey)) {
      this.models.push({
        type: 'bigmodel',
        name: 'GLM',
        apiKey: config.aiModel.bigModel.apiKey,
        baseUrl: config.aiModel.bigModel.baseUrl,
        model: 'glm-4',
        priority: 3
      });
    }

    if (isValidKey(config.aiModel.stepAi.apiKey)) {
      this.models.push({
        type: 'stepai',
        name: 'StepAI',
        apiKey: config.aiModel.stepAi.apiKey,
        baseUrl: config.aiModel.stepAi.baseUrl,
        model: 'step-1',
        priority: 4
      });
    }

    if (isValidKey(config.aiModel.jimeng.apiKey)) {
      this.models.push({
        type: 'jimeng',
        name: 'Jimeng',
        apiKey: config.aiModel.jimeng.apiKey,
        baseUrl: config.aiModel.jimeng.baseUrl,
        model: 'jimeng-33',
        priority: 5
      });
    }

    this.models.sort((a, b) => a.priority - b.priority);
    this.currentModel = this.models[0] || null;
    this.fallbackModels = this.models.slice(1);
    
    logger.info(`AI服务初始化完成，已配置 ${this.models.length} 个模型`);
    if (this.currentModel) {
      logger.info(`当前主模型: ${this.currentModel.name}`);
    }
  }

  async callModel(prompt, options = {}) {
    if (!this.currentModel) {
      throw new Error('未配置任何有效的AI模型');
    }

    const { 
      maxTokens = 500, 
      temperature = 0.7, 
      modelType = this.currentModel.type 
    } = options;

    let model = this.models.find(m => m.type === modelType);
    if (!model) {
      model = this.currentModel;
    }

    logger.debug(`调用AI模型: ${model.name}, prompt长度: ${prompt.length}`);

    try {
      const result = await this._callModelAPI(model, prompt, { maxTokens, temperature });
      logger.debug(`AI模型调用成功: ${model.name}`);
      return {
        success: true,
        content: result,
        modelUsed: model.name,
        modelType: model.type
      };
    } catch (error) {
      logger.error(`AI模型调用失败: ${model.name}, 错误: ${error.message}`);
      
      if (this.fallbackModels.length > 0) {
        return await this._tryFallback(prompt, options);
      }
      
      throw error;
    }
  }

  async _callModelAPI(model, prompt, options) {
    const { maxTokens, temperature } = options;

    switch (model.type) {
      case 'openai':
        return await this._callOpenAI(model, prompt, maxTokens, temperature);
      case 'gemini':
        return await this._callGemini(model, prompt, maxTokens, temperature);
      case 'bigmodel':
        return await this._callGLM(model, prompt, maxTokens, temperature);
      case 'stepai':
        return await this._callStepAI(model, prompt, maxTokens, temperature);
      case 'jimeng':
        return await this._callJimeng(model, prompt, maxTokens, temperature);
      default:
        throw new Error(`不支持的模型类型: ${model.type}`);
    }
  }

  async _callOpenAI(model, prompt, maxTokens, temperature) {
    const response = await axios.post(
      `${model.baseUrl}/chat/completions`,
      {
        model: model.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature: temperature
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${model.apiKey}`
        },
        timeout: 30000
      }
    );
    return response.data.choices[0].message.content.trim();
  }

  async _callGemini(model, prompt, maxTokens, temperature) {
    const response = await axios.post(
      `${model.baseUrl}/models/${model.model}:generateContent`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature: temperature
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${model.apiKey}`
        },
        timeout: 30000
      }
    );
    return response.data.candidates[0].content.parts[0].text;
  }

  async _callGLM(model, prompt, maxTokens, temperature) {
    const response = await axios.post(
      `${model.baseUrl}/chat/completions`,
      {
        model: model.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature: temperature
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${model.apiKey}`
        },
        timeout: 30000
      }
    );
    return response.data.choices[0].message.content.trim();
  }

  async _callStepAI(model, prompt, maxTokens, temperature) {
    const response = await axios.post(
      `${model.baseUrl}/chat/completions`,
      {
        model: model.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature: temperature
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${model.apiKey}`
        },
        timeout: 30000
      }
    );
    return response.data.choices[0].message.content.trim();
  }

  async _callJimeng(model, prompt, maxTokens, temperature) {
    const response = await axios.post(
      `${model.baseUrl}/v1/completions`,
      {
        model: model.model,
        prompt: prompt,
        max_tokens: maxTokens,
        temperature: temperature
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${model.apiKey}`
        },
        timeout: 30000
      }
    );
    return response.data.choices[0].text.trim();
  }

  async _tryFallback(prompt, options) {
    for (const fallback of this.fallbackModels) {
      try {
        logger.info(`尝试降级到备用模型: ${fallback.name}`);
        const result = await this._callModelAPI(fallback, prompt, options);
        logger.info(`降级调用成功: ${fallback.name}`);
        return {
          success: true,
          content: result,
          modelUsed: fallback.name,
          modelType: fallback.type,
          fallback: true
        };
      } catch (error) {
        logger.warn(`降级模型调用失败: ${fallback.name}, 错误: ${error.message}`);
      }
    }
    throw new Error('所有AI模型调用均失败');
  }

  getAvailableModels() {
    return this.models.map(m => ({
      type: m.type,
      name: m.name,
      priority: m.priority
    }));
  }

  setPrimaryModel(modelType) {
    const model = this.models.find(m => m.type === modelType);
    if (model) {
      this.currentModel = model;
      this.fallbackModels = this.models.filter(m => m.type !== modelType);
      logger.info(`已切换主模型为: ${model.name}`);
      return true;
    }
    return false;
  }
}

module.exports = new AIService();