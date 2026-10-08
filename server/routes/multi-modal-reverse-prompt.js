const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const logger = require('../config/logger');
const config = require('../config');
const documentAnalysisService = require('../services/documentAnalysisService');
const ideaToPromptService = require('../services/ideaToPromptService');
const reversePromptEngine = require('../services/reverse-prompt-engine');
const axios = require('axios');

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    cb(null, true);
  }
});

router.post('/', upload.array('files', 10), async (req, res) => {
  try {
    const { textInput, fileUrls, contentCategory } = req.body;
    const files = req.files || [];

    logger.info('Received multi-modal reverse prompt request');
    logger.info(`Text input length: ${textInput?.length || 0}`);
    logger.info(`File URLs count: ${fileUrls?.length || 0}`);
    logger.info(`Files count: ${files.length}`);
    logger.info(`Content category: ${contentCategory}`);

    let aggregatedContent = '';
    const contentSources = [];

    if (textInput && textInput.trim()) {
      aggregatedContent += textInput.trim() + '\n\n';
      contentSources.push('text input');
    }

    if (files && files.length > 0) {
      for (const file of files) {
        try {
          const fileInfo = {
            name: file.originalname,
            size: file.size,
            type: file.mimetype,
            path: file.path
          };

          if (file.mimetype.startsWith('text/') || 
              file.mimetype === 'application/json' ||
              ['.txt', '.md', '.json'].includes(path.extname(file.originalname).toLowerCase())) {
            const textContent = file.buffer.toString('utf8');
            aggregatedContent += textContent + '\n\n';
            contentSources.push(`file: ${file.originalname}`);
          } else {
            const tempPath = `./temp_${Date.now()}_${file.originalname}`;
            const fs = require('fs');
            fs.writeFileSync(tempPath, file.buffer);

            const extractedText = await documentAnalysisService.extractContent({
              path: tempPath,
              type: file.mimetype,
              name: file.originalname
            });

            aggregatedContent += extractedText + '\n\n';
            contentSources.push(`file: ${file.originalname}`);

            fs.unlinkSync(tempPath);
          }
        } catch (fileError) {
          logger.warn(`Error processing file ${file.originalname}:`, fileError.message);
        }
      }
    }

    if (fileUrls) {
      const urls = Array.isArray(fileUrls) ? fileUrls : [fileUrls];
      const urlErrors = [];
      
      for (const url of urls) {
        if (url && url.trim()) {
          try {
            logger.info(`Fetching content from URL: ${url}`);
            const response = await axios.get(url.trim(), {
              timeout: 15000, // 增加超时时间到15秒
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
              },
              responseType: 'text',
              validateStatus: function(status) {
                return status >= 200 && status < 300; // 只接受成功的状态码
              }
            });

            let urlContent = '';
            const contentType = response.headers['content-type'] || '';
            logger.info(`URL content type: ${contentType}`);

            if (contentType.includes('text/html')) {
              const cheerio = require('cheerio');
              const $ = cheerio.load(response.data);
              // 改进HTML内容提取，去除脚本和样式
              $('script, style').remove();
              // 提取标题和正文
              const title = $('title').text().trim();
              const bodyText = $('body').text().trim();
              urlContent = title ? `${title}\n\n${bodyText}` : bodyText;
            } else if (contentType.includes('text/plain')) {
              urlContent = response.data;
            } else {
              urlContent = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
            }

            // 清理和过滤内容
            const cleanedContent = documentAnalysisService.cleanText(urlContent);
            // 限制内容长度，但确保保留核心信息
            const maxContentLength = 5000;
            const finalContent = cleanedContent.length > maxContentLength 
              ? cleanedContent.substring(0, maxContentLength) + '... [Content truncated]' 
              : cleanedContent;
            
            aggregatedContent += finalContent + '\n\n';
            contentSources.push(`URL: ${url}`);
            logger.info(`Successfully fetched and processed content from URL: ${url}, length: ${finalContent.length}`);
          } catch (urlError) {
            const errorMessage = `Error fetching URL ${url}: ${urlError.message}`;
            logger.warn(errorMessage);
            urlErrors.push(errorMessage);
          }
        }
      }
      
      // 如果有URL错误，将错误信息添加到响应中
      if (urlErrors.length > 0) {
        logger.info(`URL errors: ${urlErrors.join(', ')}`);
      }
    }

    if (!aggregatedContent.trim()) {
      return res.status(400).json({
        message: 'No content provided. Please provide at least one input method (text, files, or URLs).'
      });
    }

    logger.info(`Aggregated content from sources: ${contentSources.join(', ')}`);
    logger.info(`Total aggregated content length: ${aggregatedContent.length} characters`);

    const analysisResult = documentAnalysisService.analyzeContent(aggregatedContent, {
      name: 'aggregated-input',
      type: 'text/plain',
      path: 'memory'
    });

    logger.info('Content analysis completed');

    let reversePromptResult;
    
    try {
      reversePromptResult = await reversePromptEngine.generate(aggregatedContent);
      logger.info(`Reverse prompt generated using ReversePromptEngine, quality: ${reversePromptResult.qualityReport?.overallQuality || 'unknown'}`);
    } catch (engineError) {
      logger.warn('ReversePromptEngine failed, falling back to IdeaToPromptService:', engineError.message);
      try {
        reversePromptResult = await ideaToPromptService.generatePrompt(
          aggregatedContent,
          contentCategory || 'copywriting'
        );
        logger.info(`Reverse prompt generated using IdeaToPromptService, generated by: ${reversePromptResult.generatedBy}`);
      } catch (newServiceError) {
        logger.warn('IdeaToPromptService failed, falling back to documentAnalysisService:', newServiceError.message);
        reversePromptResult = await documentAnalysisService.generateReversePrompt(
          analysisResult,
          aggregatedContent,
          contentCategory || 'copywriting'
        );
        logger.info(`Reverse prompt generated using fallback, generated by: ${reversePromptResult.generatedBy}`);
      }
    }

    logger.info(`Reverse prompt generated, generated by: ${reversePromptResult.generatedBy}`);

    const parameterSettings = {
      mode: contentCategory || 'copywriting',
      temperature: 0.7,
      maxTokens: 1500,
      topP: 0.9
    };

    const processingWorkflow = [
      { step: '1', name: '文本语义分析', description: '分析输入内容的语义和主题' },
      { step: '2', name: '关键词提取', description: '提取核心关键词和关键短语' },
      { step: '3', name: '风格识别', description: '识别内容风格和语气' },
      { step: '4', name: '结构化分析', description: '分析内容结构和元素' },
      { step: '5', name: '提示词生成', description: '生成结构化的反向提示词' }
    ];

    res.status(200).json({
      confidence: reversePromptResult.confidence,
      reversePrompt: reversePromptResult.reversePrompt,
      chinesePrompt: reversePromptResult.chinesePrompt,
      englishPrompt: reversePromptResult.englishPrompt,
      structuredDetails: reversePromptResult.structuredDetails,
      parameterSettings: parameterSettings,
      processingWorkflow: processingWorkflow,
      contentSources: contentSources,
      analysis: reversePromptResult.analysis,
      generatedBy: reversePromptResult.generatedBy,
      aggregatedContentLength: aggregatedContent.length,
      validation: reversePromptResult.validation
    });

  } catch (error) {
    logger.error('Error in multi-modal reverse prompt generation:', error);
    res.status(500).json({
      message: 'Error generating reverse prompt',
      error: error.message
    });
  }
});

module.exports = router;