const logger = require('../config/logger');

class PromptQualityService {
  constructor() {
    this.chineseChars = /[\u4e00-\u9fa5]/;
    this.chinesePunctuation = /[\u3000-\u303f\uff00-\uffef]/;
    this.englishChars = /[a-zA-Z]/;
    this.invalidPatterns = [
      /[\u0000-\u001f]/g,
      /[\u007f-\u009f]/g,
      /[\ufeff]/g,
      /[\u200b-\u200f]/g,
      /[\u2028-\u202f]/g,
      /[\u2060-\u206f]/g,
      /[\ufff0-\uffff]/g,
    ];
  }

  isChinese(text) {
    return this.chineseChars.test(text);
  }

  isEnglish(text) {
    return this.englishChars.test(text);
  }

  containsChinese(text) {
    return this.chineseChars.test(text);
  }

  containsEnglish(text) {
    return this.englishChars.test(text);
  }

  cleanInvalidCharacters(text) {
    if (!text) return '';
    
    let cleaned = text;
    
    this.invalidPatterns.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '');
    });
    
    return cleaned;
  }

  removeEnglishFromChinese(text) {
    if (!text) return '';
    
    let result = text;
    
    result = result.replace(/[a-zA-Z]+(?:\s+[a-zA-Z]+)*/g, '');
    
    result = result.replace(/[a-zA-Z]+(?:[0-9]+)?/g, '');
    
    result = result.replace(/\s+/g, ' ');
    
    result = result.replace(/[，,、]+/g, '、');
    
    result = result.replace(/\s*([，,。！？；：])\s*/g, '$1');
    
    return result.trim();
  }

  removeChineseFromEnglish(text) {
    if (!text) return '';
    
    let result = text;
    
    result = result.replace(/[\u4e00-\u9fa5]+/g, '');
    
    result = result.replace(/[\u3000-\u303f\uff00-\uffef]+/g, '');
    
    result = result.replace(/\s+/g, ' ');
    
    result = result.replace(/[，,、]+/g, ', ');
    
    result = result.replace(/\s*([,.!?;:])\s*/g, '$1 ');
    
    result = result.trim();
    
    if (result.endsWith(',')) {
      result = result.slice(0, -1).trim();
    }
    
    return result;
  }

  removeMeaninglessNumbers(text) {
    if (!text) return '';
    
    let result = text;
    
    result = result.replace(/\b(?:\d{4,})\b/g, '');
    
    result = result.replace(/\b(?:0{3,})\b/g, '');
    
    result = result.replace(/\b(?:\d+\.\d+)\b(?!\s*(?:percent|%|million|billion|trillion|thousand|hundred))/gi, '');
    
    result = result.replace(/\b\d{2,}\b(?=\s*[.,])/g, '');
    
    result = result.replace(/\s+/g, ' ');
    
    return result.trim();
  }

  removeMeaninglessSymbols(text) {
    if (!text) return '';
    
    let result = text;
    
    result = result.replace(/[<>{}\[\]\\|`~^@#$%&*()+=]+/g, '');
    
    result = result.replace(/--+/g, '-');
    
    result = result.replace(/~~+/g, '');
    
    result = result.replace(/\s*=\s*/g, ' ');
    
    result = result.replace(/\s+/g, ' ');
    
    result = result.replace(/\.\s*\./g, '.');
    
    result = result.replace(/,\s*,/g, ',');
    
    return result.trim();
  }

  normalizeWhitespace(text) {
    if (!text) return '';
    
    let result = text;
    
    result = result.replace(/[\t\n\r\v\f]/g, ' ');
    
    result = result.replace(/\s{2,}/g, ' ');
    
    return result.trim();
  }

  validateChinesePrompt(prompt) {
    const issues = [];
    
    if (!prompt || prompt.trim().length === 0) {
      issues.push('提示词为空');
      return { valid: false, issues, cleaned: '' };
    }
    
    const hasEnglish = this.containsEnglish(prompt);
    if (hasEnglish) {
      issues.push('包含英文内容');
    }
    
    const hasInvalidChars = this.invalidPatterns.some(pattern => pattern.test(prompt));
    if (hasInvalidChars) {
      issues.push('包含无效字符');
    }
    
    return {
      valid: issues.length === 0,
      issues,
      cleaned: prompt
    };
  }

  validateEnglishPrompt(prompt) {
    const issues = [];
    
    if (!prompt || prompt.trim().length === 0) {
      issues.push('Prompt is empty');
      return { valid: false, issues, cleaned: '' };
    }
    
    const hasChinese = this.containsChinese(prompt);
    if (hasChinese) {
      issues.push('Contains Chinese characters');
    }
    
    const hasInvalidChars = this.invalidPatterns.some(pattern => pattern.test(prompt));
    if (hasInvalidChars) {
      issues.push('Contains invalid characters');
    }
    
    const hasMeaninglessNumbers = /\b(?:\d{4,})\b/.test(prompt);
    if (hasMeaninglessNumbers) {
      issues.push('Contains meaningless numbers');
    }
    
    const hasMeaninglessSymbols = /[<>{}\[\]\\|`~^@#$%&*()+=]{2,}/.test(prompt);
    if (hasMeaninglessSymbols) {
      issues.push('Contains meaningless symbols');
    }
    
    return {
      valid: issues.length === 0,
      issues,
      cleaned: prompt
    };
  }

  processChinesePrompt(prompt) {
    logger.debug('Processing Chinese prompt');
    
    let result = prompt || '';
    
    result = this.cleanInvalidCharacters(result);
    
    result = this.removeEnglishFromChinese(result);
    
    result = this.removeMeaninglessNumbers(result);
    
    result = this.removeMeaninglessSymbols(result);
    
    result = this.normalizeWhitespace(result);
    
    const validation = this.validateChinesePrompt(result);
    
    if (!validation.valid) {
      logger.warn('Chinese prompt validation issues:', validation.issues);
    }
    
    return {
      prompt: result,
      valid: validation.valid,
      issues: validation.issues,
      processed: true
    };
  }

  processEnglishPrompt(prompt) {
    logger.debug('Processing English prompt');
    
    let result = prompt || '';
    
    result = this.cleanInvalidCharacters(result);
    
    result = this.removeChineseFromEnglish(result);
    
    result = this.removeMeaninglessNumbers(result);
    
    result = this.removeMeaninglessSymbols(result);
    
    result = this.normalizeWhitespace(result);
    
    const validation = this.validateEnglishPrompt(result);
    
    if (!validation.valid) {
      logger.warn('English prompt validation issues:', validation.issues);
    }
    
    return {
      prompt: result,
      valid: validation.valid,
      issues: validation.issues,
      processed: true
    };
  }

  processPrompts(englishPrompt, chinesePrompt, sourceLanguage) {
    logger.info(`Processing prompts, source language: ${sourceLanguage}`);
    
    const englishResult = this.processEnglishPrompt(englishPrompt);
    const chineseResult = this.processChinesePrompt(chinesePrompt);
    
    return {
      englishPrompt: englishResult.prompt,
      chinesePrompt: chineseResult.prompt,
      englishValid: englishResult.valid,
      chineseValid: chineseResult.valid,
      englishIssues: englishResult.issues,
      chineseIssues: chineseResult.issues,
      sourceLanguage: sourceLanguage
    };
  }

  detectSourceLanguage(content) {
    if (!content) return 'unknown';
    
    const chineseCount = (content.match(/[\u4e00-\u9fa5]/g) || []).length;
    const englishCount = (content.match(/[a-zA-Z]/g) || []).length;
    
    const totalChars = content.length;
    
    if (chineseCount === 0 && englishCount === 0) {
      return 'unknown';
    }
    
    const chineseRatio = chineseCount / totalChars;
    const englishRatio = englishCount / totalChars;
    
    if (chineseRatio > englishRatio * 2) {
      return 'chinese';
    } else if (englishRatio > chineseRatio * 2) {
      return 'english';
    } else {
      return 'mixed';
    }
  }

  generateQualityReport(englishPrompt, chinesePrompt) {
    const englishValidation = this.validateEnglishPrompt(englishPrompt);
    const chineseValidation = this.validateChinesePrompt(chinesePrompt);
    
    return {
      timestamp: new Date().toISOString(),
      english: {
        length: englishPrompt?.length || 0,
        valid: englishValidation.valid,
        issues: englishValidation.issues,
        hasChinese: this.containsChinese(englishPrompt),
        hasInvalidChars: this.invalidPatterns.some(p => p.test(englishPrompt || '')),
        hasMeaninglessNumbers: /\b(?:\d{4,})\b/.test(englishPrompt || '')
      },
      chinese: {
        length: chinesePrompt?.length || 0,
        valid: chineseValidation.valid,
        issues: chineseValidation.issues,
        hasEnglish: this.containsEnglish(chinesePrompt),
        hasInvalidChars: this.invalidPatterns.some(p => p.test(chinesePrompt || '')),
        hasMeaninglessNumbers: /\b(?:\d{4,})\b/.test(chinesePrompt || '')
      },
      overallQuality: englishValidation.valid && chineseValidation.valid ? 'high' : 'medium'
    };
  }
}

module.exports = new PromptQualityService();