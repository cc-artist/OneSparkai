const logger = require('../config/logger');
const aiService = require('./ai-service');
const qualityService = require('./prompt-quality-service');

class ReversePromptEngine {
  constructor() {
    this.promptTemplates = {
      english: {
        professional: `
          Analyze the following content and generate a comprehensive reverse prompt:
          
          Content: {content}
          
          Requirements:
          1. Extract the core topic and main ideas
          2. Identify key themes, concepts, and arguments
          3. Determine the writing style and tone
          4. Analyze the target audience
          5. Identify the purpose and objective of the content
          
          Output format:
          - Topic: [main subject]
          - Summary: [concise summary of key points]
          - Keywords: [list of important terms]
          - Style: [formal/informal/technical/creative]
          - Tone: [persuasive/informative/entertaining]
          - Audience: [target readers]
          - Purpose: [what the content aims to achieve]
          - Key elements: [essential components to include]
        `.trim(),
        
        creative: `
          Deconstruct this content and create an artistic reverse prompt:
          
          Content: {content}
          
          Analyze:
          - The creative vision and aesthetic
          - Emotional impact and mood
          - Narrative structure and flow
          - Symbolism and imagery
          - Unique voice and perspective
          
          Provide a prompt that captures the essence for creative generation.
        `.trim(),
        
        technical: `
          Perform technical analysis of this content for precise reverse prompting:
          
          Content: {content}
          
          Technical breakdown:
          - Domain-specific terminology
          - Technical concepts and frameworks
          - Data and statistics
          - Methodology and processes
          - Key technical insights
          
          Generate a technically accurate reverse prompt.
        `.trim()
      },
      
      chinese: {
        professional: `
          分析以下内容并生成全面的反推提示词：
          
          内容：{content}
          
          要求：
          1. 提取核心主题和主要观点
          2. 识别关键主题、概念和论点
          3. 确定写作风格和语气
          4. 分析目标受众
          5. 识别内容的目的和目标
          
          输出格式：
          - 主题：[主要主题]
          - 摘要：[要点简明摘要]
          - 关键词：[重要术语列表]
          - 风格：[正式/非正式/技术/创意]
          - 语气：[说服性/信息性/娱乐性]
          - 受众：[目标读者]
          - 目的：[内容旨在实现的目标]
          - 关键要素：[需要包含的基本组成部分]
        `.trim(),
        
        creative: `
          解构此内容并创建艺术性反推提示词：
          
          内容：{content}
          
          分析：
          - 创意视野和美学
          - 情感影响和氛围
          - 叙事结构和流程
          - 象征意义和意象
          - 独特的声音和视角
          
          提供一个能够捕捉创意生成本质的提示词。
        `.trim(),
        
        technical: `
          对此内容进行技术分析以进行精确的反向提示：
          
          内容：{content}
          
          技术分解：
          - 领域特定术语
          - 技术概念和框架
          - 数据和统计
          - 方法论和流程
          - 关键技术见解
          
          生成技术准确的反向提示词。
        `.trim()
      }
    };
    
    this.noisePatterns = [
      /[\u4e00-\u9fa5]+推广/g,
      /[\u4e00-\u9fa5]+广告/g,
      /点击链接/g,
      /立即购买/g,
      /限时优惠/g,
      /免费领取/g,
      /关注我们/g,
      /扫码关注/g,
      /公众号/g,
      /微信号/g,
      /微博/g,
      /抖音/g,
      /快手/g,
      /小红书/g,
      /淘宝/g,
      /京东/g,
      /拼多多/g,
      /[a-zA-Z]+推广/g,
      /advertisement/i,
      /sponsored/i,
      /promotion/i,
      /click here/i,
      /buy now/i,
      /subscribe/i,
      /follow us/i,
      /@[\u4e00-\u9fa5a-zA-Z0-9_]+/g,
      /#[\u4e00-\u9fa5a-zA-Z0-9_]+/g,
      /http[s]?:\/\/[\w\-\.]+\.[a-zA-Z]{2,}(\/[\w\-\.~:/?#\[\]@!\$&'\(\)\*\+,;=]*)?/g,
      /www\.[\w\-\.]+\.[a-zA-Z]{2,}/g
    ];
    
    this.invalidPatterns = [
      /\s{3,}/g,
      /[，,、]{3,}/g,
      /[。.]{3,}/g,
      /[！!]{3,}/g,
      /[？?]{3,}/g,
      /[；;]{3,}/g,
      /[：:]{3,}/g,
      /[-—]{3,}/g,
      /[_]{3,}/g,
      /[=]{3,}/g,
      /[*]{3,}/g,
      /[#]{3,}/g,
      /[@]{3,}/g,
      /[$]{3,}/g,
      /[%]{3,}/g,
      /[\^]{3,}/g,
      /[&]{3,}/g,
      /[*]{3,}/g,
      /[(]{3,}/g,
      /[)]{3,}/g,
      /[\[](3,)/g,
      /[\]]{3,}/g,
      /[\{]{3,}/g,
      /[\}]{3,}/g,
      /[|]{3,}/g,
      /[\\]{3,}/g,
      /[\/]{3,}/g,
      /[\"]{3,}/g,
      /[\']{3,}/g,
      /[\`]{3,}/g,
      /[\~]{3,}/g,
      /[\<]{3,}/g,
      /[\>]{3,}/g
    ];
  }

  cleanContent(content) {
    if (!content) return '';
    
    let cleaned = content;
    
    this.noisePatterns.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '');
    });
    
    this.invalidPatterns.forEach(pattern => {
      cleaned = cleaned.replace(pattern, match => match.charAt(0));
    });
    
    cleaned = cleaned.replace(/\s+/g, ' ');
    
    cleaned = cleaned.replace(/([。.！!？?；;：:])\s+([。.！!？?；;：:])/g, '$1$2');
    
    cleaned = cleaned.replace(/([。.！!？?])\s*([。.！!？?])/g, '$1$2');
    
    cleaned = cleaned.trim();
    
    if (cleaned.length === 0) {
      logger.warn('Content became empty after cleaning');
    }
    
    return cleaned;
  }

  detectContentStyle(content) {
    const techTerms = ['技术', '算法', '系统', '架构', '代码', '开发', 'API', '数据', '分析', '模型', 'framework', 'algorithm', 'system', 'architecture', 'code', 'development'];
    const creativeTerms = ['艺术', '创意', '设计', '灵感', '故事', '情感', '美学', '视觉', '创作', '表达', 'creative', 'art', 'design', 'story', 'emotion', 'aesthetic', 'visual'];
    
    let techCount = 0;
    let creativeCount = 0;
    
    techTerms.forEach(term => {
      if (content.includes(term)) techCount++;
    });
    
    creativeTerms.forEach(term => {
      if (content.includes(term)) creativeCount++;
    });
    
    if (techCount >= 3) return 'technical';
    if (creativeCount >= 3) return 'creative';
    return 'professional';
  }

  async analyzeContentWithAI(content, language) {
    const style = this.detectContentStyle(content);
    const templateKey = language === 'chinese' ? 'chinese' : 'english';
    const template = this.promptTemplates[templateKey][style];
    
    const prompt = template.replace('{content}', content.substring(0, 2000));
    
    try {
      const result = await aiService.callAIModel(prompt, 1500);
      
      if (!result || !result.content) {
        logger.warn('AI analysis returned empty result');
        return null;
      }
      
      return this.parseAIResult(result.content, language);
    } catch (error) {
      logger.error('AI analysis failed:', error.message);
      return null;
    }
  }

  parseAIResult(result, language) {
    try {
      const analysis = {
        topic: '',
        summary: '',
        keywords: [],
        style: '',
        tone: '',
        audience: '',
        purpose: '',
        keyElements: []
      };
      
      const lines = result.split('\n');
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        if (trimmedLine.startsWith('- Topic:') || trimmedLine.startsWith('- 主题：')) {
          analysis.topic = trimmedLine.replace(/- Topic:\s*/i, '').replace(/- 主题：\s*/, '').trim();
        } else if (trimmedLine.startsWith('- Summary:') || trimmedLine.startsWith('- 摘要：')) {
          analysis.summary = trimmedLine.replace(/- Summary:\s*/i, '').replace(/- 摘要：\s*/, '').trim();
        } else if (trimmedLine.startsWith('- Keywords:') || trimmedLine.startsWith('- 关键词：')) {
          const keywordsStr = trimmedLine.replace(/- Keywords:\s*/i, '').replace(/- 关键词：\s*/, '').trim();
          analysis.keywords = keywordsStr.split(/[,，、]/).map(k => k.trim()).filter(k => k.length > 0);
        } else if (trimmedLine.startsWith('- Style:') || trimmedLine.startsWith('- 风格：')) {
          analysis.style = trimmedLine.replace(/- Style:\s*/i, '').replace(/- 风格：\s*/, '').trim();
        } else if (trimmedLine.startsWith('- Tone:') || trimmedLine.startsWith('- 语气：')) {
          analysis.tone = trimmedLine.replace(/- Tone:\s*/i, '').replace(/- 语气：\s*/, '').trim();
        } else if (trimmedLine.startsWith('- Audience:') || trimmedLine.startsWith('- 受众：')) {
          analysis.audience = trimmedLine.replace(/- Audience:\s*/i, '').replace(/- 受众：\s*/, '').trim();
        } else if (trimmedLine.startsWith('- Purpose:') || trimmedLine.startsWith('- 目的：')) {
          analysis.purpose = trimmedLine.replace(/- Purpose:\s*/i, '').replace(/- 目的：\s*/, '').trim();
        } else if (trimmedLine.startsWith('- Key elements:') || trimmedLine.startsWith('- 关键要素：')) {
          const elementsStr = trimmedLine.replace(/- Key elements:\s*/i, '').replace(/- 关键要素：\s*/, '').trim();
          analysis.keyElements = elementsStr.split(/[,，、]/).map(e => e.trim()).filter(e => e.length > 0);
        }
      }
      
      return analysis;
    } catch (error) {
      logger.error('Failed to parse AI result:', error.message);
      return null;
    }
  }

  generateStructuredPrompt(analysis, language) {
    if (!analysis) return '';
    
    const parts = [];
    
    if (analysis.topic && analysis.topic.length > 0) {
      parts.push(language === 'chinese' ? `主题：${analysis.topic}` : `Topic: ${analysis.topic}`);
    }
    
    if (analysis.summary && analysis.summary.length > 0) {
      parts.push(language === 'chinese' ? `内容摘要：${analysis.summary}` : `Content summary: ${analysis.summary}`);
    }
    
    if (analysis.keywords && analysis.keywords.length > 0) {
      const keywordsStr = analysis.keywords.join(language === 'chinese' ? '、' : ', ');
      parts.push(language === 'chinese' ? `关键词：${keywordsStr}` : `Keywords: ${keywordsStr}`);
    }
    
    if (analysis.style && analysis.style.length > 0) {
      parts.push(language === 'chinese' ? `风格：${analysis.style}` : `Style: ${analysis.style}`);
    }
    
    if (analysis.tone && analysis.tone.length > 0) {
      parts.push(language === 'chinese' ? `语气：${analysis.tone}` : `Tone: ${analysis.tone}`);
    }
    
    if (analysis.audience && analysis.audience.length > 0) {
      parts.push(language === 'chinese' ? `目标受众：${analysis.audience}` : `Target audience: ${analysis.audience}`);
    }
    
    if (analysis.purpose && analysis.purpose.length > 0) {
      parts.push(language === 'chinese' ? `目的：${analysis.purpose}` : `Purpose: ${analysis.purpose}`);
    }
    
    if (analysis.keyElements && analysis.keyElements.length > 0) {
      const elementsStr = analysis.keyElements.join(language === 'chinese' ? '、' : ', ');
      parts.push(language === 'chinese' ? `关键要素：${elementsStr}` : `Key elements: ${elementsStr}`);
    }
    
    const separator = language === 'chinese' ? '。' : '. ';
    let prompt = parts.join(separator);
    
    if (prompt.length > 0 && !prompt.endsWith(separator.charAt(0))) {
      prompt += separator.charAt(0);
    }
    
    return prompt;
  }

  translatePrompt(prompt, fromLang, toLang) {
    if (!prompt) return '';
    if (fromLang === toLang) return prompt;
    
    const translations = {
      'Topic:': '主题：',
      'Content summary:': '内容摘要：',
      'Keywords:': '关键词：',
      'Style:': '风格：',
      'Tone:': '语气：',
      'Target audience:': '目标受众：',
      'Purpose:': '目的：',
      'Key elements:': '关键要素：',
      'formal': '正式',
      'informal': '非正式',
      'technical': '技术',
      'creative': '创意',
      'persuasive': '说服性',
      'informative': '信息性',
      'entertaining': '娱乐性',
      'general public': '普通大众',
      'professional': '专业人士',
      'students': '学生',
      'experts': '专家',
      
      '主题：': 'Topic:',
      '内容摘要：': 'Content summary:',
      '关键词：': 'Keywords:',
      '风格：': 'Style:',
      '语气：': 'Tone:',
      '目标受众：': 'Target audience:',
      '目的：': 'Purpose:',
      '关键要素：': 'Key elements:',
      '正式': 'formal',
      '非正式': 'informal',
      '技术': 'technical',
      '创意': 'creative',
      '说服性': 'persuasive',
      '信息性': 'informative',
      '娱乐性': 'entertaining',
      '普通大众': 'general public',
      '专业人士': 'professionals',
      '学生': 'students',
      '专家': 'experts'
    };
    
    let result = prompt;
    
    for (const [from, to] of Object.entries(translations)) {
      result = result.replace(new RegExp(from, 'g'), to);
    }
    
    return result;
  }

  validateAndCorrect(prompt, language) {
    let result = prompt;
    
    if (language === 'chinese') {
      result = qualityService.removeEnglishFromChinese(result);
    } else {
      result = qualityService.removeChineseFromEnglish(result);
    }
    
    result = qualityService.removeMeaninglessNumbers(result);
    result = qualityService.removeMeaninglessSymbols(result);
    result = qualityService.normalizeWhitespace(result);
    
    return result;
  }

  calculateConfidence(analysis) {
    if (!analysis) return 'low (0%)';
    
    let score = 0;
    let maxScore = 0;
    
    if (analysis.topic && analysis.topic.length > 0) { score += 15; maxScore += 15; }
    if (analysis.summary && analysis.summary.length > 0) { score += 20; maxScore += 20; }
    if (analysis.keywords && analysis.keywords.length > 0) { score += 15; maxScore += 15; }
    if (analysis.style && analysis.style.length > 0) { score += 10; maxScore += 10; }
    if (analysis.tone && analysis.tone.length > 0) { score += 10; maxScore += 10; }
    if (analysis.audience && analysis.audience.length > 0) { score += 10; maxScore += 10; }
    if (analysis.purpose && analysis.purpose.length > 0) { score += 10; maxScore += 10; }
    if (analysis.keyElements && analysis.keyElements.length > 0) { score += 10; maxScore += 10; }
    
    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    
    let level = 'low';
    if (percentage >= 80) level = 'high';
    else if (percentage >= 50) level = 'medium';
    
    return `${level} (${percentage}%)`;
  }

  async generate(content) {
    logger.info('Starting reverse prompt generation');
    
    const cleanedContent = this.cleanContent(content);
    
    if (!cleanedContent || cleanedContent.length === 0) {
      throw new Error('内容清洗后为空，请检查输入内容');
    }
    
    const sourceLanguage = qualityService.detectSourceLanguage(cleanedContent);
    const isChinese = sourceLanguage === 'chinese' || sourceLanguage === 'mixed';
    
    logger.info(`Detected language: ${sourceLanguage}`);
    
    const aiAnalysis = await this.analyzeContentWithAI(cleanedContent, isChinese ? 'chinese' : 'english');
    
    if (!aiAnalysis) {
      throw new Error('AI分析失败，无法生成提示词');
    }
    
    let chinesePrompt = this.generateStructuredPrompt(aiAnalysis, 'chinese');
    let englishPrompt = this.generateStructuredPrompt(aiAnalysis, 'english');
    
    if (sourceLanguage === 'english') {
      chinesePrompt = this.translatePrompt(englishPrompt, 'english', 'chinese');
    } else if (sourceLanguage === 'chinese') {
      englishPrompt = this.translatePrompt(chinesePrompt, 'chinese', 'english');
    }
    
    chinesePrompt = this.validateAndCorrect(chinesePrompt, 'chinese');
    englishPrompt = this.validateAndCorrect(englishPrompt, 'english');
    
    const qualityReport = qualityService.generateQualityReport(englishPrompt, chinesePrompt);
    const confidence = this.calculateConfidence(aiAnalysis);
    
    logger.info(`Reverse prompt generation completed. Quality: ${qualityReport.overallQuality}, Confidence: ${confidence}`);
    
    return {
      englishPrompt: englishPrompt,
      chinesePrompt: chinesePrompt,
      reversePrompt: englishPrompt,
      analysis: aiAnalysis,
      confidence: confidence,
      generatedBy: 'ReversePromptEngine',
      qualityReport: qualityReport,
      sourceLanguage: sourceLanguage,
      contentLength: content.length,
      cleanedLength: cleanedContent.length
    };
  }
}

module.exports = new ReversePromptEngine();