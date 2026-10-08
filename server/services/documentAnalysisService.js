const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const officeparser = require('officeparser');
const cheerio = require('cheerio');
const logger = require('../config/logger');
const axios = require('axios');
const config = require('../config');
const qualityService = require('./prompt-quality-service');

// Import natural for NLP functionality (fallback)
const natural = require('natural');
const tokenizer = new natural.WordTokenizer();

// Define stopwords for English (fallback)
const stopwords = [
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', "aren't", 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', "can't", 'cannot', 'could',
  "couldn't", 'did', "didn't", 'do', 'does', "doesn't", 'doing', "don't", 'down', 'during', 'each', 'few', 'for',
  'from', 'further', 'had', "hadn't", 'has', "hasn't", 'have', "haven't", 'having', 'he', "he'd", "he'll", "he's",
  'her', 'here', "here's", 'hers', 'herself', 'him', 'himself', 'his', 'how', "how's", 'i', "i'd", "i'll", "i'm",
  "i've", 'if', 'in', 'into', 'is', "isn't", 'it', "it's", 'its', 'itself', "let's", 'me', 'more', 'most', "mustn't",
  'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours',
  'ourselves', 'out', 'over', 'own', 'same', "shan't", 'she', "she'd", "she'll", "she's", 'should', "shouldn't",
  'so', 'some', 'such', 'than', 'that', "that's", 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there',
  "there's", 'these', 'they', "they'd", "they'll", "they're", "they've", 'this', 'those', 'through', 'to', 'too',
  'under', 'until', 'up', 'very', 'was', "wasn't", 'we', "we'd", "we'll", "we're", "we've", 'were', "weren't",
  'what', "what's", 'when', "when's", 'where', "where's", 'which', 'while', 'who', "who's", 'whom', 'why', "why's",
  'with', "won't", 'would', "wouldn't", 'you', "you'd", "you'll", "you're", "you've", 'your', 'yours', 'yourself',
  'yourselves'
];

// Import nodejieba for Chinese word segmentation and keyword extraction (fallback)
const nodejieba = require('nodejieba');

// Enhanced approach for document analysis using professional NLP libraries
class DocumentAnalysisService {
  /**
   * Extract content from various document types
   * @param {Object} fileInfo - File information object
   * @returns {Promise<string>} - Extracted text content
   */
  async extractContent(fileInfo) {
    try {
      const filePath = fileInfo.path;
      const fileType = fileInfo.type;
      const fileName = fileInfo.name;

      logger.info(`Extracting content from file: ${fileName}, type: ${fileType}`);
      
      let extractedText = '';

      if (fileType.startsWith('text/') || path.extname(fileName).toLowerCase() === '.txt') {
        // Text files - use utf8 encoding explicitly for Chinese support
        logger.info(`Reading text file with utf8 encoding: ${filePath}`);
        extractedText = fs.readFileSync(filePath, 'utf8');
        logger.info(`Raw extracted text length: ${extractedText.length}`);
        logger.info(`Raw extracted text (first 100 chars): ${extractedText.substring(0, 100)}`);
      } else if (fileType === 'application/pdf' || path.extname(fileName).toLowerCase() === '.pdf') {
        // PDF files
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdfParse(dataBuffer);
        extractedText = data.text;
      } else if (fileType.startsWith('application/vnd.openxmlformats-officedocument.') || 
                 fileType.startsWith('application/msword') ||
                 fileType.startsWith('application/vnd.ms-excel') ||
                 fileType.startsWith('application/vnd.ms-powerpoint')) {
        // Office documents (Word, Excel, PowerPoint)
        const dataBuffer = fs.readFileSync(filePath);
        extractedText = await officeparser.parse(dataBuffer);
      } else if (fileType === 'text/html' || path.extname(fileName).toLowerCase() === '.html' || path.extname(fileName).toLowerCase() === '.htm') {
        // HTML files
        const htmlContent = fs.readFileSync(filePath, 'utf8');
        const $ = cheerio.load(htmlContent);
        extractedText = $('body').text();
      } else {
        // Unsupported file type
        logger.warn(`Unsupported file type for content extraction: ${fileType}`);
        return `Unsupported file type: ${fileType}`;
      }

      // Clean extracted text
      logger.info(`Text before cleaning: ${extractedText.substring(0, 100)}`);
      extractedText = this.cleanText(extractedText);
      logger.info(`Text after cleaning: ${extractedText.substring(0, 100)}`);
      
      return extractedText;
    } catch (error) {
      logger.error('Error extracting content from file:', error);
      throw new Error('Failed to extract content from file');
    }
  }

  /**
   * Clean extracted text
   * @param {string} text - Raw extracted text
   * @returns {string} - Cleaned text
   */
  cleanText(text) {
    // Remove extra whitespace and control characters, but preserve non-ASCII characters
    // Also remove garbled characters and invalid Unicode
    return text
      .replace(/[\s\t\n\r\f\v]+/g, ' ') // Replace multiple whitespace characters with single space
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters except tab, newline, carriage return
      .replace(/[\uFFFD]/g, '') // Remove replacement character (�)
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove C0 and C1 control characters
      .trim();
  }

  /**
   * Analyze document content
   * @param {string} content - Extracted text content
   * @param {Object} fileInfo - File information object
   * @returns {Object} - Analysis results
   */
  analyzeContent(content, fileInfo = { type: 'text/plain' }) {
    // Check if content is about unsupported file type
    if (content.startsWith('Unsupported file type:')) {
      // Return basic analysis for unsupported file types
      return {
        contentSummary: content,
        keywords: [fileInfo.type.split('/')[1] || 'unknown'],
        keyPhrases: [content],
        themes: [fileInfo.type.split('/')[1] || 'unknown'],
        style: 'unknown',
        entities: [],
        language: 'unknown',
        wordCount: 1,
        fileType: fileInfo.type,
        documentStructure: {},
        coreIdeas: [],
        logicalFlow: [],
        semanticAnalysis: {}
      };
    }
    
    // Determine if content is primarily Chinese or English
    const hasChinese = /[\u4e00-\u9fa5]/.test(content);
    
    // Detect language
    const language = hasChinese ? 'chinese' : 'english';
    
    // Extract keywords using professional NLP libraries
    let keywords = [];
    try {
      keywords = this.extractKeywords(content, hasChinese);
      logger.info(`Extracted keywords: ${keywords.join(', ')}`);
    } catch (error) {
      logger.warn('Keyword extraction failed:', error.message);
      keywords = [fileInfo.type.split('/')[1] || 'unknown'];
    }
    
    // Extract key phrases based on actual content
    let keyPhrases = [];
    try {
      keyPhrases = this.extractKeyPhrases(content, hasChinese);
      logger.info(`Extracted key phrases: ${keyPhrases.join(', ')}`);
    } catch (error) {
      logger.warn('Key phrase extraction failed:', error.message);
      keyPhrases = [];
    }
    
    // Determine document style
    let style = 'informative';
    try {
      style = this.determineStyle(content, hasChinese);
      logger.info(`Determined style: ${style}`);
    } catch (error) {
      logger.warn('Style determination failed:', error.message);
    }
    
    // Extract themes - for Chinese content, we'll use the top keywords as themes
    let themes = [];
    try {
      themes = this.extractThemes(content, keywords, hasChinese);
      logger.info(`Extracted themes: ${themes.join(', ')}`);
    } catch (error) {
      logger.warn('Theme extraction failed:', error.message);
      themes = keywords.slice(0, 5); // Fallback to top keywords
    }
    
    // Extract entities from content
    let entities = [];
    try {
      entities = this.extractEntities(content, hasChinese);
      logger.info(`Extracted entities: ${entities.join(', ')}`);
    } catch (error) {
      logger.warn('Entity extraction failed:', error.message);
      entities = keywords.slice(0, 5); // Fallback to top keywords
    }
    
    // Analyze document structure
    let documentStructure = {};
    try {
      documentStructure = this.analyzeDocumentStructure(content, hasChinese);
      logger.info('Document structure analysis completed');
    } catch (error) {
      logger.warn('Document structure analysis failed:', error.message);
    }
    
    // Extract core ideas
    let coreIdeas = [];
    try {
      coreIdeas = this.extractCoreIdeas(content, keywords, keyPhrases, hasChinese);
      logger.info(`Extracted core ideas: ${coreIdeas.join(', ')}`);
    } catch (error) {
      logger.warn('Core ideas extraction failed:', error.message);
    }
    
    // Analyze logical flow
    let logicalFlow = [];
    try {
      logicalFlow = this.analyzeLogicalFlow(content, hasChinese);
      logger.info('Logical flow analysis completed');
    } catch (error) {
      logger.warn('Logical flow analysis failed:', error.message);
    }
    
    // Perform semantic depth analysis
    let semanticAnalysis = {};
    try {
      semanticAnalysis = this.performSemanticAnalysis(content, keywords, entities, hasChinese);
      logger.info('Semantic depth analysis completed');
    } catch (error) {
      logger.warn('Semantic analysis failed:', error.message);
    }
    
    return {
      contentSummary: this.generateSummary(content, hasChinese),
      keywords: keywords,
      keyPhrases: keyPhrases,
      themes: themes,
      style: style,
      entities: entities,
      language: language,
      wordCount: content.split(/\s+/).length,
      fileType: fileInfo.type,
      hasChinese: hasChinese,
      documentStructure: documentStructure,
      coreIdeas: coreIdeas,
      logicalFlow: logicalFlow,
      semanticAnalysis: semanticAnalysis
    };
  }
  
  /**
   * Perform semantic depth analysis including relationship extraction and sentiment analysis
   * @param {string} content - Text content
   * @param {Array} keywords - Extracted keywords
   * @param {Array} entities - Extracted entities
   * @param {boolean} hasChinese - Whether the text contains Chinese characters
   * @returns {Object} - Semantic analysis results
   */
  performSemanticAnalysis(content, keywords, entities, hasChinese) {
    const semanticAnalysis = {
      relationships: [],
      sentiment: {
        score: 0,
        label: 'neutral'
      },
      entityRelationships: [],
      semanticRoles: [],
      topicCoherence: 0
    };
    
    // Extract relationships between entities and keywords
    semanticAnalysis.relationships = this.extractRelationships(content, keywords, entities, hasChinese);
    
    // Perform sentiment analysis
    semanticAnalysis.sentiment = this.analyzeSentiment(content, hasChinese);
    
    // Extract entity relationships
    semanticAnalysis.entityRelationships = this.extractEntityRelationships(content, entities, hasChinese);
    
    // Extract semantic roles (subject, predicate, object)
    semanticAnalysis.semanticRoles = this.extractSemanticRoles(content, hasChinese);
    
    // Calculate topic coherence
    semanticAnalysis.topicCoherence = this.calculateTopicCoherence(keywords, content, hasChinese);
    
    return semanticAnalysis;
  }
  
  /**
   * Extract relationships between entities and keywords
   * @param {string} content - Text content
   * @param {Array} keywords - Extracted keywords
   * @param {Array} entities - Extracted entities
   * @param {boolean} hasChinese - Whether the text contains Chinese characters
   * @returns {Array} - Relationships
   */
  extractRelationships(content, keywords, entities, hasChinese) {
    const relationships = [];
    const allTerms = [...keywords, ...entities];
    
    // Split content into sentences
    const sentences = hasChinese ? 
      content.split(/[。！？；]+/).filter(s => s.trim().length > 0) : 
      content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    // Look for relationships between terms in each sentence
    sentences.forEach((sentence, sentenceIndex) => {
      const trimmed = sentence.trim();
      const termsInSentence = allTerms.filter(term => trimmed.toLowerCase().includes(term.toLowerCase()));
      
      // If there are at least two terms in the sentence, look for relationships
      if (termsInSentence.length >= 2) {
        // Generate pairs of terms
        for (let i = 0; i < termsInSentence.length - 1; i++) {
          for (let j = i + 1; j < termsInSentence.length; j++) {
            const term1 = termsInSentence[i];
            const term2 = termsInSentence[j];
            
            // Calculate relationship strength based on proximity and context
            const strength = this.calculateRelationshipStrength(trimmed, term1, term2, hasChinese);
            
            if (strength > 0.3) {
              relationships.push({
                source: term1,
                target: term2,
                strength: strength,
                sentence: trimmed.substring(0, 100) + (trimmed.length > 100 ? '...' : ''),
                sentenceIndex: sentenceIndex
              });
            }
          }
        }
      }
    });
    
    // Sort relationships by strength
    return relationships.sort((a, b) => b.strength - a.strength).slice(0, 20);
  }
  
  /**
   * Calculate relationship strength between two terms
   * @param {string} sentence - Sentence containing the terms
   * @param {string} term1 - First term
   * @param {string} term2 - Second term
   * @param {boolean} hasChinese - Whether the text contains Chinese characters
   * @returns {number} - Relationship strength (0-1)
   */
  calculateRelationshipStrength(sentence, term1, term2, hasChinese) {
    const lowerSentence = sentence.toLowerCase();
    const term1Index = lowerSentence.indexOf(term1.toLowerCase());
    const term2Index = lowerSentence.indexOf(term2.toLowerCase());
    
    if (term1Index === -1 || term2Index === -1) {
      return 0;
    }
    
    // Calculate distance between terms
    const distance = Math.abs(term1Index - term2Index);
    const maxDistance = hasChinese ? 50 : 100; // Different thresholds for Chinese and English
    const distanceScore = Math.max(0, 1 - distance / maxDistance);
    
    // Check for connecting words that indicate relationship
    const connectingWords = hasChinese ? 
      ['是', '有', '在', '为', '与', '和', '或', '但', '而', '因为', '所以'] :
      ['is', 'are', 'have', 'has', 'in', 'for', 'with', 'and', 'or', 'but', 'because', 'so'];
    
    let connectionScore = 0;
    connectingWords.forEach(word => {
      if (lowerSentence.includes(word)) {
        connectionScore = 0.5;
      }
    });
    
    // Calculate final strength
    return distanceScore + connectionScore;
  }
  
  /**
   * Analyze sentiment of the content
   * @param {string} content - Text content
   * @param {boolean} hasChinese - Whether the text contains Chinese characters
   * @returns {Object} - Sentiment analysis result
   */
  analyzeSentiment(content, hasChinese) {
    // Simple sentiment analysis based on sentiment words
    const positiveWords = hasChinese ? 
      ['好', '优秀', '成功', '创新', '进步', '发展', '优势', '机会', '增长', '提高', '改善', '有效', '高效', '重要', '价值'] :
      ['good', 'excellent', 'success', 'innovation', 'progress', 'development', 'advantage', 'opportunity', 'growth', 'improve', 'effective', 'efficient', 'important', 'value', 'benefit'];
    
    const negativeWords = hasChinese ? 
      ['差', '失败', '问题', '挑战', '困难', '缺点', '风险', '下降', '减少', '损失', '无效', '低效', '不足', '限制'] :
      ['bad', 'failure', 'problem', 'challenge', 'difficulty', 'disadvantage', 'risk', 'decline', 'decrease', 'loss', 'ineffective', 'inefficient', 'insufficient', 'limitation'];
    
    let positiveCount = 0;
    let negativeCount = 0;
    
    const lowerContent = content.toLowerCase();
    
    positiveWords.forEach(word => {
      if (lowerContent.includes(word)) {
        positiveCount++;
      }
    });
    
    negativeWords.forEach(word => {
      if (lowerContent.includes(word)) {
        negativeCount++;
      }
    });
    
    // Calculate sentiment score
    const total = positiveCount + negativeCount;
    let score = 0;
    let label = 'neutral';
    
    if (total > 0) {
      score = (positiveCount - negativeCount) / total;
      
      if (score > 0.3) {
        label = 'positive';
      } else if (score < -0.3) {
        label = 'negative';
      }
    }
    
    return {
      score: score,
      label: label,
      positiveCount: positiveCount,
      negativeCount: negativeCount
    };
  }
  
  /**
   * Extract relationships between entities
   * @param {string} content - Text content
   * @param {Array} entities - Extracted entities
   * @param {boolean} hasChinese - Whether the text contains Chinese characters
   * @returns {Array} - Entity relationships
   */
  extractEntityRelationships(content, entities, hasChinese) {
    const relationships = [];
    
    // Split content into sentences
    const sentences = hasChinese ? 
      content.split(/[。！？；]+/).filter(s => s.trim().length > 0) : 
      content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    // Look for entity relationships in each sentence
    sentences.forEach((sentence, sentenceIndex) => {
      const trimmed = sentence.trim();
      const entitiesInSentence = entities.filter(entity => trimmed.toLowerCase().includes(entity.toLowerCase()));
      
      if (entitiesInSentence.length >= 2) {
        // Identify relationship type based on context
        let relationshipType = 'association';
        
        // Check for specific relationship types
        const lowerSentence = trimmed.toLowerCase();
        
        if (hasChinese) {
          if (lowerSentence.includes('是') || lowerSentence.includes('属于')) {
            relationshipType = 'is_a';
          } else if (lowerSentence.includes('有') || lowerSentence.includes('包含')) {
            relationshipType = 'has';
          } else if (lowerSentence.includes('与') || lowerSentence.includes('和')) {
            relationshipType = 'association';
          } else if (lowerSentence.includes('导致') || lowerSentence.includes('影响')) {
            relationshipType = 'causes';
          }
        } else {
          if (lowerSentence.includes('is') || lowerSentence.includes('are') || lowerSentence.includes('belongs')) {
            relationshipType = 'is_a';
          } else if (lowerSentence.includes('has') || lowerSentence.includes('contains')) {
            relationshipType = 'has';
          } else if (lowerSentence.includes('and') || lowerSentence.includes('with')) {
            relationshipType = 'association';
          } else if (lowerSentence.includes('causes') || lowerSentence.includes('affects')) {
            relationshipType = 'causes';
          }
        }
        
        // Generate entity pairs
        for (let i = 0; i < entitiesInSentence.length - 1; i++) {
          for (let j = i + 1; j < entitiesInSentence.length; j++) {
            relationships.push({
              source: entitiesInSentence[i],
              target: entitiesInSentence[j],
              type: relationshipType,
              sentence: trimmed.substring(0, 100) + (trimmed.length > 100 ? '...' : ''),
              sentenceIndex: sentenceIndex
            });
          }
        }
      }
    });
    
    return relationships.slice(0, 15);
  }
  
  /**
   * Extract semantic roles (subject, predicate, object)
   * @param {string} content - Text content
   * @param {boolean} hasChinese - Whether the text contains Chinese characters
   * @returns {Array} - Semantic roles
   */
  extractSemanticRoles(content, hasChinese) {
    const roles = [];
    
    // Split content into sentences
    const sentences = hasChinese ? 
      content.split(/[。！？；]+/).filter(s => s.trim().length > 0) : 
      content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    sentences.forEach((sentence, sentenceIndex) => {
      const trimmed = sentence.trim();
      
      // Simple semantic role extraction based on sentence structure
      let subject = '';
      let predicate = '';
      let object = '';
      
      if (hasChinese) {
        // For Chinese, use simple pattern matching
        // Look for common sentence structures
        const subjectPatterns = [/^([^是有在为与和或但而因为所以]+)(是|有|在|为|与|和|或|但|而|因为|所以)/, /^([^，。！？；]+)，/];
        
        for (const pattern of subjectPatterns) {
          const match = trimmed.match(pattern);
          if (match) {
            subject = match[1].trim();
            break;
          }
        }
        
        // Look for predicate
        if (subject) {
          const remaining = trimmed.substring(subject.length).trim();
          const predicatePatterns = [/^(是|有|在|为|与|和|或|但|而|因为|所以)([^，。！？；]+)/, /^，([^，。！？；]+)/];
          
          for (const pattern of predicatePatterns) {
            const match = remaining.match(pattern);
            if (match) {
              predicate = match[2] ? match[1] + match[2] : match[1];
              predicate = predicate.trim();
              break;
            }
          }
        }
      } else {
        // For English, use simple pattern matching
        const words = trimmed.split(/\s+/);
        
        // Look for subject (typically first noun phrase)
        for (let i = 0; i < words.length; i++) {
          if (/^[A-Z][a-z]+$/.test(words[i]) || /^[a-z]+$/.test(words[i])) {
            subject = words[i];
            // Look for predicate (verb)
            for (let j = i + 1; j < words.length; j++) {
              if (/^[a-z]+s?$/.test(words[j]) && !['the', 'a', 'an', 'and', 'or', 'but'].includes(words[j])) {
                predicate = words[j];
                // Look for object
                for (let k = j + 1; k < words.length; k++) {
                  if (/^[A-Z][a-z]+$/.test(words[k]) || /^[a-z]+$/.test(words[k])) {
                    object = words[k];
                    break;
                  }
                }
                break;
              }
            }
            break;
          }
        }
      }
      
      if (subject || predicate || object) {
        roles.push({
          sentenceIndex: sentenceIndex,
          sentence: trimmed,
          subject: subject,
          predicate: predicate,
          object: object
        });
      }
    });
    
    return roles.slice(0, 10);
  }
  
  /**
   * Calculate topic coherence score
   * @param {Array} keywords - Extracted keywords
   * @param {string} content - Text content
   * @param {boolean} hasChinese - Whether the text contains Chinese characters
   * @returns {number} - Topic coherence score (0-1)
   */
  calculateTopicCoherence(keywords, content, hasChinese) {
    if (keywords.length === 0) {
      return 0;
    }
    
    // Calculate how often keywords co-occur in the same sentences
    const sentences = hasChinese ? 
      content.split(/[。！？；]+/).filter(s => s.trim().length > 0) : 
      content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    let coOccurrenceCount = 0;
    let totalPossiblePairs = 0;
    
    // Calculate total possible keyword pairs
    totalPossiblePairs = (keywords.length * (keywords.length - 1)) / 2;
    
    if (totalPossiblePairs === 0) {
      return 1;
    }
    
    // Count co-occurrences
    sentences.forEach(sentence => {
      const lowerSentence = sentence.toLowerCase();
      const keywordsInSentence = keywords.filter(keyword => lowerSentence.includes(keyword.toLowerCase()));
      
      if (keywordsInSentence.length >= 2) {
        // Calculate number of pairs in this sentence
        const pairsInSentence = (keywordsInSentence.length * (keywordsInSentence.length - 1)) / 2;
        coOccurrenceCount += pairsInSentence;
      }
    });
    
    // Calculate coherence score
    const coherence = coOccurrenceCount / totalPossiblePairs;
    return Math.min(1, coherence);
  }

  /**
   * Extract keywords from text using professional NLP libraries
   * @param {string} text - Text content
   * @param {boolean} hasChinese - Whether the text contains Chinese characters
   * @returns {Array} - Array of keywords
   */
  extractKeywords(text, hasChinese) {
    // Validate input
    if (!text || typeof text !== 'string') {
      return [];
    }
    
    if (hasChinese) {
      try {
        // Chinese content handling using nodejieba for professional keyword extraction
        // Extract keywords with weights
        const keywordPairs = nodejieba.extract(text, 30);
        
        // Get词性标注
        const taggedWords = nodejieba.tag(text);
        
        // Calculate position weights
        const totalWords = taggedWords.length;
        const positionWeights = {};
        taggedWords.forEach((word, index) => {
          // 位置权重：开头和结尾的词更重要
          const positionScore = 1 - Math.abs(index / totalWords - 0.5) * 2;
          positionWeights[word.word] = positionWeights[word.word] || 0;
          positionWeights[word.word] += positionScore;
        });
        
        // 词性权重映射
        const posWeights = {
          'n': 1.5,  // 名词
          'v': 1.2,  // 动词
          'a': 1.3,  // 形容词
          'ad': 1.1, // 副词
          'an': 1.4  // 名形词
        };
        
        // 计算综合得分
        const wordScores = {};
        keywordPairs.forEach(pair => {
          const word = pair.word;
          const freqScore = pair.weight;
          const posScore = posWeights[taggedWords.find(tw => tw.word === word)?.tag] || 1.0;
          const positionScore = positionWeights[word] || 1.0;
          
          wordScores[word] = freqScore * posScore * positionScore;
        });
        
        // 按综合得分排序
        return Object.entries(wordScores)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 20)
          .map(([word, score]) => word);
      } catch (error) {
        logger.warn('Chinese keyword extraction failed:', error.message);
        return [];
      }
    } else {
      // English content handling using natural library
      // Remove punctuation but preserve English characters
      const cleanedText = text.replace(/[\p{P}\p{S}]/gu, ' ');
      
      // Split into tokens
      let tokens = tokenizer.tokenize(cleanedText);
      
      // Calculate position weights
      const totalTokens = tokens.length;
      const positionWeights = {};
      tokens.forEach((token, index) => {
        const positionScore = 1 - Math.abs(index / totalTokens - 0.5) * 2;
        positionWeights[token] = positionWeights[token] || 0;
        positionWeights[token] += positionScore;
      });
      
      // Convert to lowercase
      const lowerTokens = tokens.map(token => token.toLowerCase());
      
      // Filter out common English stopwords
      const filteredTokens = lowerTokens.filter(token => !stopwords.includes(token) && token.length > 2);
      
      // Calculate word frequencies
      const frequencyMap = {};
      filteredTokens.forEach(token => {
        frequencyMap[token] = (frequencyMap[token] || 0) + 1;
      });
      
      // 词性权重映射 (基于自然语言处理的常见词性重要性)
      const posWeights = {
        'NN': 1.5,   // 名词
        'NNS': 1.4,  // 复数名词
        'NNP': 1.6,  // 专有名词
        'NNPS': 1.5, // 复数专有名词
        'VB': 1.2,   // 动词
        'VBD': 1.1,  // 过去式动词
        'VBG': 1.1,  // 动名词
        'VBN': 1.1,  // 过去分词
        'VBP': 1.1,  // 动词原形
        'VBZ': 1.1,  // 第三人称单数动词
        'JJ': 1.3,   // 形容词
        'JJR': 1.2,  // 比较级形容词
        'JJS': 1.2,  // 最高级形容词
        'RB': 1.1,   // 副词
        'RBR': 1.0,  // 比较级副词
        'RBS': 1.0   // 最高级副词
      };
      
      // 计算综合得分
      const wordScores = {};
      Object.entries(frequencyMap).forEach(([word, freq]) => {
        // 位置得分
        const positionScore = positionWeights[word] || 1.0;
        // 词频得分 (归一化)
        const freqScore = freq / filteredTokens.length;
        // 词性得分 (默认1.0)
        const posScore = 1.0;
        
        wordScores[word] = freqScore * positionScore * posScore;
      });
      
      // 按综合得分排序
      return Object.entries(wordScores)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([word, score]) => word);
    }
  }

  /**
   * Extract key phrases from text
   * @param {string} text - Text content
   * @param {boolean} hasChinese - Whether the text contains Chinese characters
   * @returns {Array} - Array of key phrases
   */
  extractKeyPhrases(text, hasChinese) {
    if (hasChinese) {
      try {
        // Chinese key phrase extraction - advanced approach
        // First extract keywords
        const keywords = this.extractKeywords(text, true);
        
        // Extract sentences
        const sentences = text.split(/[。！？；]+/).filter(sentence => sentence.trim().length > 5);
        
        // Extract phrases containing important keywords
        const phrases = new Set();
        const phraseScores = {};
        
        // 1. Extract sentences with multiple keywords (semantic units)
        sentences.forEach(sentence => {
          const trimmedSentence = sentence.trim();
          const sentenceLower = trimmedSentence.toLowerCase();
          const keywordCount = keywords.filter(keyword => sentenceLower.includes(keyword.toLowerCase())).length;
          
          if (keywordCount >= 2 && trimmedSentence.length <= 100) {
            // Calculate phrase score based on keyword count, length, and position
            const score = keywordCount * (1 + 1/trimmedSentence.length) * (sentences.indexOf(sentence) < 3 ? 1.5 : 1);
            phrases.add(trimmedSentence);
            phraseScores[trimmedSentence] = score;
          }
        });
        
        // 2. Use nodejieba's keyword extraction to get multi-word phrases
        const keywordPairs = nodejieba.extract(text, 30);
        keywordPairs.forEach(pair => {
          const word = pair.word;
          if (word.length > 2) { // Only consider phrases with 2+ characters
            phrases.add(word);
            phraseScores[word] = phraseScores[word] || pair.weight * 10;
          }
        });
        
        // 3. Extract noun phrases using dependency parsing-like approach
        const cutWords = nodejieba.cut(text);
        const taggedWords = nodejieba.tag(text);
        
        // Look for noun phrases (名词短语) patterns
        let currentPhrase = [];
        let currentScore = 0;
        
        taggedWords.forEach((word, index) => {
          const { word: w, tag } = word;
          
          // 名词短语模式: 形容词+名词, 名词+名词, 动词+名词等
          if (tag.startsWith('n') || tag.startsWith('a') || tag.startsWith('v')) {
            currentPhrase.push(w);
            // 基于词性和长度计算得分
            let wordScore = 1;
            if (tag.startsWith('n')) wordScore = 1.5;
            if (tag.startsWith('a')) wordScore = 1.2;
            currentScore += wordScore;
          } else if (currentPhrase.length >= 2) {
            const phrase = currentPhrase.join('');
            phrases.add(phrase);
            phraseScores[phrase] = phraseScores[phrase] || currentScore;
            currentPhrase = [];
            currentScore = 0;
          } else {
            currentPhrase = [];
            currentScore = 0;
          }
        });
        
        // Add the last phrase if it's valid
        if (currentPhrase.length >= 2) {
          const phrase = currentPhrase.join('');
          phrases.add(phrase);
          phraseScores[phrase] = phraseScores[phrase] || currentScore;
        }
        
        // 4. Sort phrases by score and return top ones
        return Array.from(phrases)
          .sort((a, b) => (phraseScores[b] || 0) - (phraseScores[a] || 0))
          .slice(0, 15)
          .filter(phrase => phrase.length > 2);
      } catch (error) {
        logger.warn('Chinese key phrase extraction failed:', error.message);
        // Fallback to extracting sentences
        const sentences = text.split(/[。！？；]+/).filter(sentence => sentence.trim().length > 5);
        return sentences.slice(0, 10).map(sentence => sentence.trim());
      }
    } else {
      // English content handling - advanced approach
      try {
        // Extract keywords first
        const keywords = this.extractKeywords(text, false);
        
        // Split text into sentences with more flexible delimiters
        const sentences = text.split(/[.!?\n\r]+/).filter(sentence => {
          const trimmed = sentence.trim();
          return trimmed.length > 8; // Minimum length for a meaningful phrase
        });
        
        // Extract phrases containing important keywords
        const phrases = new Set();
        const phraseScores = {};
        
        // 1. Extract sentences with keywords (semantic units)
        sentences.forEach(sentence => {
          const trimmedSentence = sentence.trim();
          const sentenceLower = trimmedSentence.toLowerCase();
          const keywordCount = keywords.filter(keyword => sentenceLower.includes(keyword.toLowerCase())).length;
          
          // Adjust criteria for English phrases
          if (keywordCount >= 1 && trimmedSentence.length >= 15 && trimmedSentence.length <= 120) {
            // Calculate phrase score based on keyword count, length, and position
            const score = keywordCount * (1 + 1/trimmedSentence.length) * (sentences.indexOf(sentence) < 3 ? 1.5 : 1);
            phrases.add(trimmedSentence);
            phraseScores[trimmedSentence] = score;
          }
        });
        
        // 2. Extract noun phrases and verb phrases
        const tokens = tokenizer.tokenize(text);
        
        // Look for noun phrases (NP) and verb phrases (VP)
        let currentPhrase = [];
        let currentScore = 0;
        
        for (let i = 0; i < tokens.length; i++) {
          const token = tokens[i].toLowerCase();
          
          // Skip stopwords
          if (stopwords.includes(token)) {
            if (currentPhrase.length >= 2) {
              const phrase = currentPhrase.join(' ');
              phrases.add(phrase);
              phraseScores[phrase] = phraseScores[phrase] || currentScore;
            }
            currentPhrase = [];
            currentScore = 0;
            continue;
          }
          
          // Add meaningful words to phrase
          if (token.length > 2) {
            currentPhrase.push(token);
            currentScore += 1;
            
            // Check if this is a common phrase
            if (currentPhrase.length >= 2) {
              const phrase = currentPhrase.join(' ');
              // If this phrase contains keywords, boost its score
              const phraseHasKeyword = keywords.some(keyword => phrase.includes(keyword));
              if (phraseHasKeyword) {
                currentScore += 2;
              }
            }
          } else if (currentPhrase.length >= 2) {
            const phrase = currentPhrase.join(' ');
            phrases.add(phrase);
            phraseScores[phrase] = phraseScores[phrase] || currentScore;
            currentPhrase = [];
            currentScore = 0;
          }
        }
        
        // Add the last phrase if it's valid
        if (currentPhrase.length >= 2) {
          const phrase = currentPhrase.join(' ');
          phrases.add(phrase);
          phraseScores[phrase] = phraseScores[phrase] || currentScore;
        }
        
        // 3. Add technical terms and domain-specific phrases
        if (phrases.size < 5) {
          // Look for common technical terms and phrases
          const technicalTerms = ['decision tree', 'machine learning', 'artificial intelligence', 'deep learning', 'neural network', 'classification', 'regression', 'information gain', 'gini index', 'id3', 'c4.5', 'cart', 'supervised learning', 'unsupervised learning'];
          technicalTerms.forEach(term => {
            if (text.toLowerCase().includes(term)) {
              phrases.add(term);
              phraseScores[term] = phraseScores[term] || 5; // Give technical terms a boost
            }
          });
        }
        
        // 4. Sort phrases by score and return top ones
        return Array.from(phrases)
          .sort((a, b) => (phraseScores[b] || 0) - (phraseScores[a] || 0))
          .slice(0, 15)
          .map(phrase => {
            // Capitalize first letter of each word for better presentation
            return phrase.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
          });
      } catch (error) {
        logger.warn('English key phrase extraction failed:', error.message);
        // Fallback to returning top keywords as phrases
        return this.extractKeywords(text, false).slice(0, 10).map(keyword => keyword.charAt(0).toUpperCase() + keyword.slice(1));
      }
    }
  }

  /**
   * Determine document style based on content
   * @param {string} text - Text content
   * @param {boolean} hasChinese - Whether the text contains Chinese characters
   * @returns {string} - Document style
   */
  determineStyle(text, hasChinese) {
    const lowercaseText = text.toLowerCase();
    
    if (hasChinese) {
      // Chinese style detection
      const technicalTermsChinese = ['算法', '系统', '方法', '实现', '架构', '数据库', '代码', '技术', '开发', '编程'];
      const hasTechnicalTerms = technicalTermsChinese.some(term => text.includes(term));
      
      const formalMarkersChinese = ['然而', '因此', '此外', '由此可见', '进一步说', '不过'];
      const hasFormalMarkers = formalMarkersChinese.some(marker => text.includes(marker));
      
      const creativeMarkersChinese = ['想象', '创造', '设计', '启发', '创新', '独特', '原创'];
      const hasCreativeMarkers = creativeMarkersChinese.some(marker => text.includes(marker));
      
      if (hasTechnicalTerms) {
        return 'technical';
      } else if (hasFormalMarkers) {
        return 'formal';
      } else if (hasCreativeMarkers) {
        return 'creative';
      } else if (text.length < 500) {
        return 'concise';
      } else {
        return 'informative';
      }
    } else {
      // English style detection
      const technicalTerms = ['algorithm', 'system', 'method', 'implementation', 'architecture', 'database', 'code'];
      const hasTechnicalTerms = technicalTerms.some(term => lowercaseText.includes(term));
      
      const formalMarkers = ['however', 'therefore', 'moreover', 'consequently', 'furthermore', 'nevertheless'];
      const hasFormalMarkers = formalMarkers.some(marker => lowercaseText.includes(marker));
      
      const creativeMarkers = ['imagine', 'create', 'design', 'inspire', 'innovative', 'unique', 'original'];
      const hasCreativeMarkers = creativeMarkers.some(marker => lowercaseText.includes(marker));
      
      if (hasTechnicalTerms) {
        return 'technical';
      } else if (hasFormalMarkers) {
        return 'formal';
      } else if (hasCreativeMarkers) {
        return 'creative';
      } else if (text.length < 500) {
        return 'concise';
      } else {
        return 'informative';
      }
    }
  }

  /**
   * Extract themes from text
   * @param {string} text - Text content
   * @param {Array} keywords - Extracted keywords
   * @param {boolean} hasChinese - Whether the text contains Chinese characters
   * @returns {Array} - Array of themes
   */
  extractThemes(text, keywords, hasChinese) {
    // Advanced theme modeling using keyword clustering and semantic similarity
    if (!keywords || keywords.length === 0) {
      return [];
    }
    
    // 1. Group similar keywords into themes
    const themes = this.clusterKeywords(keywords, hasChinese);
    
    // 2. If we don't have enough themes, add some based on key phrases
    if (themes.length < 3) {
      const keyPhrases = this.extractKeyPhrases(text, hasChinese);
      keyPhrases.forEach(phrase => {
        if (themes.length >= 5) return;
        // Add phrases that are not already covered by existing themes
        if (!themes.some(theme => phrase.includes(theme) || theme.includes(phrase))) {
          themes.push(phrase);
        }
      });
    }
    
    // 3. Extract theme labels based on document content
    const themeLabels = this.extractThemeLabels(text, themes, hasChinese);
    
    return themeLabels.slice(0, 5);
  }
  
  /**
   * Cluster similar keywords into themes
   * @param {Array} keywords - Extracted keywords
   * @param {boolean} hasChinese - Whether the text contains Chinese characters
   * @returns {Array} - Clustered themes
   */
  clusterKeywords(keywords, hasChinese) {
    const themes = [];
    const usedKeywords = new Set();
    
    // For Chinese, we'll use character overlap and common prefixes/suffixes
    if (hasChinese) {
      for (let i = 0; i < keywords.length; i++) {
        const keyword = keywords[i];
        if (usedKeywords.has(keyword)) continue;
        
        const theme = [keyword];
        usedKeywords.add(keyword);
        
        // Look for related keywords
        for (let j = i + 1; j < keywords.length; j++) {
          const otherKeyword = keywords[j];
          if (usedKeywords.has(otherKeyword)) continue;
          
          // Check for character overlap
          const overlap = this.calculateCharacterOverlap(keyword, otherKeyword);
          // Check for common prefixes or suffixes
          const hasCommonPrefix = keyword.substring(0, 1) === otherKeyword.substring(0, 1);
          const hasCommonSuffix = keyword.substring(keyword.length - 1) === otherKeyword.substring(otherKeyword.length - 1);
          
          if (overlap > 0.3 || hasCommonPrefix || hasCommonSuffix) {
            theme.push(otherKeyword);
            usedKeywords.add(otherKeyword);
          }
        }
        
        // Create a theme label from the most representative keyword
        if (theme.length > 0) {
          // Use the longest keyword as the theme label (usually more specific)
          theme.sort((a, b) => b.length - a.length);
          themes.push(theme[0]);
        }
      }
    } else {
      // For English, we'll use semantic similarity based on common words and suffixes
      for (let i = 0; i < keywords.length; i++) {
        const keyword = keywords[i];
        if (usedKeywords.has(keyword)) continue;
        
        const theme = [keyword];
        usedKeywords.add(keyword);
        
        // Look for related keywords
        for (let j = i + 1; j < keywords.length; j++) {
          const otherKeyword = keywords[j];
          if (usedKeywords.has(otherKeyword)) continue;
          
          // Check for common prefixes, suffixes, or related terms
          const hasCommonPrefix = keyword.substring(0, 3) === otherKeyword.substring(0, 3);
          const hasCommonSuffix = keyword.substring(keyword.length - 2) === otherKeyword.substring(otherKeyword.length - 2);
          const isPluralRelation = (keyword + 's' === otherKeyword) || (otherKeyword + 's' === keyword);
          
          if (hasCommonPrefix || hasCommonSuffix || isPluralRelation) {
            theme.push(otherKeyword);
            usedKeywords.add(otherKeyword);
          }
        }
        
        // Create a theme label from the most representative keyword
        if (theme.length > 0) {
          // Use the most frequent keyword (assuming keywords are sorted by frequency)
          themes.push(theme[0]);
        }
      }
    }
    
    return themes;
  }
  
  /**
   * Calculate character overlap between two Chinese words
   * @param {string} word1 - First word
   * @param {string} word2 - Second word
   * @returns {number} - Overlap score (0-1)
   */
  calculateCharacterOverlap(word1, word2) {
    const chars1 = new Set(word1.split(''));
    const chars2 = new Set(word2.split(''));
    const intersection = new Set([...chars1].filter(char => chars2.has(char)));
    const union = new Set([...chars1, ...chars2]);
    return intersection.size / union.size;
  }
  
  /**
   * Extract meaningful theme labels from document content
   * @param {string} text - Document text
   * @param {Array} themes - Initial themes
   * @param {boolean} hasChinese - Whether the text contains Chinese characters
   * @returns {Array} - Refined theme labels
   */
  extractThemeLabels(text, themes, hasChinese) {
    const refinedThemes = [];
    
    themes.forEach(theme => {
      // Look for sentences that contain the theme
      const sentences = hasChinese ? 
        text.split(/[。！？；]+/).filter(s => s.trim().length > 0) : 
        text.split(/[.!?]+/).filter(s => s.trim().length > 0);
      
      let bestSentence = null;
      let highestScore = 0;
      
      sentences.forEach(sentence => {
        const trimmed = sentence.trim();
        if (trimmed.includes(theme)) {
          // Score based on length, keyword density, and position
          const lengthScore = Math.min(1, trimmed.length / 100);
          const keywordCount = (trimmed.match(new RegExp(theme, 'gi')) || []).length;
          const keywordScore = keywordCount;
          const positionScore = 1 - Math.abs(sentences.indexOf(sentence) / sentences.length - 0.5) * 2;
          
          const totalScore = lengthScore * keywordScore * positionScore;
          
          if (totalScore > highestScore) {
            highestScore = totalScore;
            bestSentence = trimmed;
          }
        }
      });
      
      if (bestSentence) {
        // Extract a concise phrase from the sentence that includes the theme
        const phrase = this.extractPhraseFromSentence(bestSentence, theme, hasChinese);
        if (phrase) {
          refinedThemes.push(phrase);
        } else {
          refinedThemes.push(theme);
        }
      } else {
        refinedThemes.push(theme);
      }
    });
    
    // Remove duplicates and return
    return [...new Set(refinedThemes)];
  }
  
  /**
   * Extract a concise phrase from a sentence that includes the theme
   * @param {string} sentence - Sentence containing the theme
   * @param {string} theme - Theme word
   * @param {boolean} hasChinese - Whether the text contains Chinese characters
   * @returns {string} - Extracted phrase
   */
  extractPhraseFromSentence(sentence, theme, hasChinese) {
    if (hasChinese) {
      // For Chinese, extract a phrase around the theme (5-15 characters)
      const themeIndex = sentence.indexOf(theme);
      if (themeIndex === -1) return theme;
      
      const start = Math.max(0, themeIndex - 10);
      const end = Math.min(sentence.length, themeIndex + theme.length + 10);
      let phrase = sentence.substring(start, end).trim();
      
      // Clean up the phrase
      phrase = phrase.replace(/^[^\u4e00-\u9fa5a-zA-Z0-9]+/, '');
      phrase = phrase.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]+$/, '');
      
      return phrase.length > theme.length ? phrase : theme;
    } else {
      // For English, extract a phrase around the theme (3-10 words)
      const words = sentence.split(/\s+/);
      const themeWords = theme.split(/\s+/);
      let themeStartIndex = -1;
      
      // Find the theme in the words array
      for (let i = 0; i <= words.length - themeWords.length; i++) {
        if (words.slice(i, i + themeWords.length).join(' ').toLowerCase() === theme.toLowerCase()) {
          themeStartIndex = i;
          break;
        }
      }
      
      if (themeStartIndex === -1) return theme;
      
      const start = Math.max(0, themeStartIndex - 3);
      const end = Math.min(words.length, themeStartIndex + themeWords.length + 3);
      const phrase = words.slice(start, end).join(' ').trim();
      
      return phrase.length > theme.length ? phrase : theme;
    }
  }

  /**
   * Extract entities from text
   * @param {string} text - Text content
   * @param {boolean} hasChinese - Whether the text contains Chinese characters
   * @returns {Array} - Array of entities
   */
  extractEntities(text, hasChinese) {
    if (hasChinese) {
      try {
        // Chinese entity extraction - improved approach
        // Extract technical terms and important nouns
        const keywords = this.extractKeywords(text, true);
        
        // Extract proper nouns and technical terms
        const entities = new Set();
        
        // Look for technical terms (words with 3+ characters)
        const cutWords = nodejieba.cut(text);
        cutWords.forEach(word => {
          if (word.length >= 3 && /^[\u4e00-\u9fa5a-zA-Z]+$/.test(word)) {
            entities.add(word);
          }
        });
        
        // Add important keywords (especially English abbreviations like ID3, C4.5, CART)
        keywords.forEach(keyword => {
          if (/^[A-Z0-9.]+$/.test(keyword)) {
            entities.add(keyword);
          }
        });
        
        return Array.from(entities).slice(0, 10);
      } catch (error) {
        logger.warn('Chinese entity extraction failed:', error.message);
        // Fallback to using top keywords
        return this.extractKeywords(text, true).slice(0, 10);
      }
    } else {
      // English entity extraction
      const tokens = tokenizer.tokenize(text);
      const entities = new Set();
      
      // Look for capitalized words (proper nouns) and acronyms
      tokens.forEach(token => {
        if ((/^[A-Z][a-z]+$/.test(token) || /^[A-Z0-9.]+$/.test(token)) && 
            !stopwords.includes(token.toLowerCase()) && 
            token.length > 1) {
          entities.add(token);
        }
      });
      
      // Return unique entities
      return Array.from(entities).slice(0, 10);
    }
  }

  /**
   * Generate a summary of the text
   * @param {string} text - Text content
   * @param {boolean} hasChinese - Whether the text contains Chinese characters
   * @returns {string} - Generated summary
   */
  generateSummary(text, hasChinese) {
    // Validate input
    if (!text || typeof text !== 'string') {
      return hasChinese ? '文档内容' : 'Document content';
    }
    
    if (hasChinese) {
      // Chinese summary generation - extract first few sentences
      const sentences = text.split(/[。！？；]+/).filter(sentence => sentence.trim().length > 0);
      return sentences.slice(0, 3).join('。') + (sentences.length > 3 ? '。...' : '。');
    } else {
      // English summary generation - extract first few sentences
      const sentences = text.split(/[.!?]+/).filter(sentence => sentence.trim().length > 0);
      return sentences.slice(0, 3).join('. ') + (sentences.length > 3 ? '...' : '.');
    }
  }

  /**
   * Analyze document structure
   * @param {string} text - Text content
   * @param {boolean} hasChinese - Whether the text contains Chinese characters
   * @returns {Object} - Document structure analysis results
   */
  analyzeDocumentStructure(text, hasChinese) {
    const structure = {
      sections: [],
      headings: [],
      paragraphs: 0,
      keySentences: [],
      hierarchy: [],
      sectionContent: [],
      structureComplexity: 'simple',
      sectionDistribution: {},
      keySections: []
    };
    
    // Split text into paragraphs
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    structure.paragraphs = paragraphs.length;
    
    // Identify headings and sections with hierarchy
    let currentSection = null;
    let sectionDepth = 0;
    const sectionStack = [];
    
    paragraphs.forEach((paragraph, index) => {
      const trimmed = paragraph.trim();
      
      // Check if this paragraph looks like a heading
      let isHeading = false;
      let headingLevel = 0;
      let headingType = 'unknown';
      
      // Markdown headings
      if (trimmed.startsWith('#')) {
        headingLevel = trimmed.match(/^#+/)[0].length;
        isHeading = true;
        headingType = 'markdown';
      }
      // Chinese-style headings with more patterns
      else if (hasChinese) {
        // 章节编号模式
        if (/^第[一二三四五六七八九十百]+[章节条项点]/u.test(trimmed)) {
          isHeading = true;
          headingType = 'numbered';
          if (/^第[一二三四五六七八九十百]+章/u.test(trimmed)) {
            headingLevel = 1;
          } else if (/^第[一二三四五六七八九十百]+节/u.test(trimmed)) {
            headingLevel = 2;
          } else if (/^第[一二三四五六七八九十百]+条/u.test(trimmed)) {
            headingLevel = 3;
          } else if (/^第[一二三四五六七八九十百]+项/u.test(trimmed)) {
            headingLevel = 4;
          } else if (/^第[一二三四五六七八九十百]+点/u.test(trimmed)) {
            headingLevel = 5;
          } else {
            headingLevel = 1;
          }
        }
        // 中文标题模式：以冒号结尾
        else if (trimmed.endsWith('：')) {
          isHeading = true;
          headingType = 'colon';
          headingLevel = 1;
        }
        // 中文标题模式："的"结构
        else if (/^[\u4e00-\u9fa5]+[\u7684][\u4e00-\u9fa5]+$/.test(trimmed)) {
          isHeading = true;
          headingType = 'de';
          headingLevel = 1;
        }
        // 中文标题模式：纯中文且长度适中
        else if (/^[\u4e00-\u9fa5]{2,15}$/.test(trimmed)) {
          isHeading = true;
          headingType = 'chinese';
          headingLevel = 1;
        }
        // 中文标题模式：带序号
        else if (/^[一二三四五六七八九十]+[、.]/.test(trimmed)) {
          isHeading = true;
          headingType = 'list';
          headingLevel = 2;
        }
      }
      // English-style headings with more patterns
      else if (!hasChinese) {
        // 全大写标题
        if (trimmed === trimmed.toUpperCase() && trimmed.split(' ').length < 15) {
          isHeading = true;
          headingType = 'uppercase';
          headingLevel = 1;
        }
        // 以冒号结尾的标题
        else if (trimmed.endsWith(':') && trimmed.split(' ').length < 15) {
          isHeading = true;
          headingType = 'colon';
          headingLevel = 1;
        }
        // 首字母大写的标题
        else if (/^[A-Z][a-z]+(\s+[A-Z][a-z]+)*$/.test(trimmed) && trimmed.split(' ').length < 15) {
          isHeading = true;
          headingType = 'titlecase';
          headingLevel = 1;
        }
        // 带数字编号的标题
        else if (/^\d+[.)]/.test(trimmed)) {
          isHeading = true;
          headingType = 'numbered';
          // 根据数字格式判断层级
          const match = trimmed.match(/^(\d+)([.)])/);
          if (match) {
            const depth = match[1].split('.').length;
            headingLevel = depth;
          } else {
            headingLevel = 1;
          }
        }
      }
      
      if (isHeading) {
        const heading = trimmed.replace(/^#+/, '').trim();
        structure.headings.push(heading);
        
        // Manage section hierarchy with more sophisticated logic
        while (sectionStack.length > 0 && sectionStack[sectionStack.length - 1].level >= headingLevel) {
          sectionStack.pop();
        }
        
        const newSection = {
          heading: heading,
          level: headingLevel,
          type: headingType,
          startIndex: index,
          endIndex: -1,
          content: [],
          subsections: [],
          wordCount: 0,
          sentenceCount: 0
        };
        
        if (sectionStack.length > 0) {
          sectionStack[sectionStack.length - 1].subsections.push(newSection);
        } else {
          structure.hierarchy.push(newSection);
        }
        
        // Update previous section's end index
        if (sectionStack.length > 0) {
          sectionStack[sectionStack.length - 1].endIndex = index - 1;
        }
        
        sectionStack.push(newSection);
        currentSection = newSection;
      } else {
        // Add paragraph to current section
        if (currentSection) {
          currentSection.content.push(trimmed);
          // Calculate word count and sentence count
          currentSection.wordCount += trimmed.split(/\s+/).length;
          if (hasChinese) {
            currentSection.sentenceCount += trimmed.split(/[。！？；]+/).filter(s => s.trim().length > 0).length;
          } else {
            currentSection.sentenceCount += trimmed.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
          }
        }
        
        // Identify key sentences with more sophisticated logic
        this.extractKeySentences(paragraph, hasChinese, structure.keySentences);
      }
    });
    
    // Update last section's end index
    if (sectionStack.length > 0) {
      sectionStack[sectionStack.length - 1].endIndex = paragraphs.length - 1;
    }
    
    // Convert hierarchy to flat sections with content
    const flattenHierarchy = (sections, parentPath = '') => {
      sections.forEach(section => {
        const sectionPath = parentPath ? `${parentPath} > ${section.heading}` : section.heading;
        const sectionContent = section.content.join('\n');
        const sectionObj = {
          heading: section.heading,
          level: section.level,
          type: section.type,
          path: sectionPath,
          startIndex: section.startIndex,
          endIndex: section.endIndex,
          content: sectionContent,
          wordCount: section.wordCount,
          sentenceCount: section.sentenceCount,
          subsectionCount: section.subsections.length
        };
        structure.sections.push(sectionObj);
        
        // Update section distribution
        structure.sectionDistribution[section.level] = (structure.sectionDistribution[section.level] || 0) + 1;
        
        // Identify key sections based on size and position
        if (section.wordCount > 100 || section.subsectionCount > 2) {
          structure.keySections.push(sectionObj);
        }
        
        if (section.subsections.length > 0) {
          flattenHierarchy(section.subsections, sectionPath);
        }
      });
    };
    
    flattenHierarchy(structure.hierarchy);
    
    // Analyze structure complexity
    structure.structureComplexity = this.analyzeStructureComplexity(structure);
    
    // Remove duplicate key sentences
    structure.keySentences = [...new Set(structure.keySentences)];
    
    return structure;
  }
  
  /**
   * Extract key sentences from paragraph with more sophisticated logic
   * @param {string} paragraph - Paragraph text
   * @param {boolean} hasChinese - Whether the text contains Chinese characters
   * @param {Array} keySentences - Array to store key sentences
   */
  extractKeySentences(paragraph, hasChinese, keySentences) {
    const sentences = hasChinese ? 
      paragraph.split(/[。！？；]+/).filter(s => s.trim().length > 0) : 
      paragraph.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    if (sentences.length === 0) return;
    
    // Add first sentence (topic sentence)
    keySentences.push(sentences[0].trim());
    
    // Add last sentence (concluding sentence)
    if (sentences.length > 1) {
      keySentences.push(sentences[sentences.length - 1].trim());
    }
    
    // Add sentences with rhetorical markers or important content
    const rhetoricalMarkers = hasChinese ? 
      ['因此', '所以', '总之', '综上所述', '可以看出', '重要的是', '关键在于'] :
      ['therefore', 'thus', 'in conclusion', 'overall', 'importantly', 'key point', 'essential'];
    
    sentences.forEach(sentence => {
      const trimmed = sentence.trim();
      if (trimmed.length > 15) {
        const hasMarker = rhetoricalMarkers.some(marker => 
          trimmed.toLowerCase().includes(marker.toLowerCase())
        );
        if (hasMarker) {
          keySentences.push(trimmed);
        }
      }
    });
  }
  
  /**
   * Analyze structure complexity based on sections and hierarchy
   * @param {Object} structure - Document structure
   * @returns {string} - Complexity level
   */
  analyzeStructureComplexity(structure) {
    const sectionCount = structure.sections.length;
    const maxDepth = this.calculateMaxDepth(structure.hierarchy);
    const keySectionCount = structure.keySections.length;
    
    if (sectionCount === 0) {
      return 'flat';
    } else if (sectionCount < 3 && maxDepth < 2) {
      return 'simple';
    } else if (sectionCount < 10 && maxDepth < 3) {
      return 'medium';
    } else {
      return 'complex';
    }
  }
  
  /**
   * Calculate maximum depth of section hierarchy
   * @param {Array} sections - Section hierarchy
   * @returns {number} - Maximum depth
   */
  calculateMaxDepth(sections) {
    if (!sections || sections.length === 0) {
      return 0;
    }
    
    let maxDepth = 0;
    sections.forEach(section => {
      const currentDepth = 1 + this.calculateMaxDepth(section.subsections);
      if (currentDepth > maxDepth) {
        maxDepth = currentDepth;
      }
    });
    
    return maxDepth;
  }

  /**
   * Extract core ideas from text
   * @param {string} text - Text content
   * @param {Array} keywords - Extracted keywords
   * @param {Array} keyPhrases - Extracted key phrases
   * @param {boolean} hasChinese - Whether the text contains Chinese characters
   * @returns {Array} - Core ideas
   */
  extractCoreIdeas(text, keywords, keyPhrases, hasChinese) {
    const coreIdeas = new Set();
    const sentenceScores = [];
    
    // Split text into sentences
    const sentences = hasChinese ? 
      text.split(/[。！？；]+/).filter(s => s.trim().length > 0) : 
      text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    // Score sentences based on multiple factors including semantic importance and context
    sentences.forEach((sentence, index) => {
      const trimmed = sentence.trim();
      if (trimmed.length < 15) return; // Skip very short sentences
      
      let score = 0;
      
      // 1. Keyword density (weighted by keyword importance)
      const sentenceLower = trimmed.toLowerCase();
      let keywordScore = 0;
      keywords.forEach((keyword, keywordIndex) => {
        if (sentenceLower.includes(keyword.toLowerCase())) {
          // Give higher weight to more important keywords (earlier in the list)
          keywordScore += (keywords.length - keywordIndex) / keywords.length * 3;
        }
      });
      score += keywordScore;
      
      // 2. Position importance (intro and conclusion sentences are more important)
      const positionScore = this.calculatePositionScore(index, sentences.length);
      score += positionScore;
      
      // 3. Sentence length (medium-length sentences often contain core ideas)
      const lengthScore = Math.max(0, 10 - Math.abs(trimmed.length - 50) / 10);
      score += lengthScore;
      
      // 4. Presence of rhetorical markers
      const rhetoricalMarkers = hasChinese ? 
        ['因此', '所以', '总之', '综上所述', '可以看出', '重要的是', '关键在于', '换句话说', '也就是说', '实际上'] :
        ['therefore', 'thus', 'in conclusion', 'overall', 'importantly', 'key point', 'essential', 'in other words', 'that is', 'actually'];
      
      const hasRhetoricalMarker = rhetoricalMarkers.some(marker => 
        trimmed.toLowerCase().includes(marker.toLowerCase())
      );
      if (hasRhetoricalMarker) score += 8;
      
      // 5. Presence of modal verbs indicating importance
      const modalMarkers = hasChinese ? 
        ['必须', '应该', '需要', '重要', '关键', '核心', '主要', '必要', '本质', '根本'] :
        ['must', 'should', 'need', 'important', 'key', 'core', 'main', 'necessary', 'essential', 'fundamental'];
      
      const hasModalMarker = modalMarkers.some(marker => 
        trimmed.toLowerCase().includes(marker.toLowerCase())
      );
      if (hasModalMarker) score += 6;
      
      // 6. Contextual importance (sentences that connect to multiple other sentences)
      const contextScore = this.calculateContextScore(trimmed, sentences, keywords, hasChinese);
      score += contextScore;
      
      // 7. Semantic importance (based on sentence structure and complexity)
      const semanticScore = this.calculateSemanticScore(trimmed, hasChinese);
      score += semanticScore;
      
      sentenceScores.push({ sentence: trimmed, score, index });
    });
    
    // Sort sentences by score and add top ones as core ideas
    sentenceScores.sort((a, b) => b.score - a.score);
    const topSentences = sentenceScores.slice(0, 20);
    
    // Add top sentences, ensuring variety and avoiding duplicates
    topSentences.forEach(item => {
      coreIdeas.add(item.sentence);
    });
    
    // Add key phrases as core ideas
    keyPhrases.forEach(phrase => {
      coreIdeas.add(phrase);
    });
    
    // Add thematic sentences that might have been missed
    const thematicSentences = this.extractThematicSentences(text, keywords, hasChinese);
    thematicSentences.forEach(sentence => {
      coreIdeas.add(sentence);
    });
    
    // Return top core ideas, ensuring they are diverse and representative
    return this.rankCoreIdeas(Array.from(coreIdeas), keywords, hasChinese).slice(0, 15);
  }
  
  /**
   * Calculate position score based on sentence position in document
   * @param {number} index - Sentence index
   * @param {number} totalSentences - Total number of sentences
   * @returns {number} - Position score
   */
  calculatePositionScore(index, totalSentences) {
    if (totalSentences <= 1) return 0;
    
    // Give higher scores to sentences at the beginning and end
    const normalizedPosition = index / (totalSentences - 1);
    // Bell curve-like distribution with peaks at beginning and end
    return 10 * Math.exp(-Math.pow((normalizedPosition - 0.5) * 4, 2));
  }
  
  /**
   * Calculate context score based on how well the sentence connects to other sentences
   * @param {string} sentence - Current sentence
   * @param {Array} sentences - All sentences
   * @param {Array} keywords - Extracted keywords
   * @param {boolean} hasChinese - Whether the text contains Chinese characters
   * @returns {number} - Context score
   */
  calculateContextScore(sentence, sentences, keywords, hasChinese) {
    let contextScore = 0;
    const sentenceLower = sentence.toLowerCase();
    
    // Check how many other sentences share keywords with this sentence
    let connectedSentences = 0;
    sentences.forEach(otherSentence => {
      if (sentence === otherSentence) return;
      
      const otherSentenceLower = otherSentence.toLowerCase();
      let sharedKeywords = 0;
      
      keywords.forEach(keyword => {
        if (sentenceLower.includes(keyword.toLowerCase()) && 
            otherSentenceLower.includes(keyword.toLowerCase())) {
          sharedKeywords++;
        }
      });
      
      if (sharedKeywords >= 1) {
        connectedSentences++;
        contextScore += sharedKeywords;
      }
    });
    
    // Normalize context score
    if (sentences.length > 1) {
      contextScore = contextScore / (sentences.length - 1) * 5;
    }
    
    return contextScore;
  }
  
  /**
   * Calculate semantic score based on sentence structure and complexity
   * @param {string} sentence - Sentence to analyze
   * @param {boolean} hasChinese - Whether the text contains Chinese characters
   * @returns {number} - Semantic score
   */
  calculateSemanticScore(sentence, hasChinese) {
    let score = 0;
    
    // 1. Sentence complexity (number of clauses/phrases)
    const clauseMarkers = hasChinese ? ['，', '、', '；'] : [',', ';', 'and', 'but', 'or'];
    let clauseCount = 1;
    clauseMarkers.forEach(marker => {
      clauseCount += (sentence.match(new RegExp(marker, 'g')) || []).length;
    });
    score += Math.min(clauseCount, 5);
    
    // 2. Presence of technical terms or domain-specific language
    const technicalTerms = hasChinese ? 
      ['算法', '系统', '方法', '实现', '架构', '数据库', '代码', '技术', '开发', '编程'] :
      ['algorithm', 'system', 'method', 'implementation', 'architecture', 'database', 'code', 'technology', 'development', 'programming'];
    
    let technicalTermCount = 0;
    technicalTerms.forEach(term => {
      if (sentence.toLowerCase().includes(term.toLowerCase())) {
        technicalTermCount++;
      }
    });
    score += technicalTermCount * 2;
    
    // 3. Sentence structure (declarative vs interrogative)
    if (!sentence.endsWith('?') && !sentence.endsWith('？')) {
      score += 2; // Prefer declarative sentences for core ideas
    }
    
    return score;
  }
  
  /**
   * Extract thematic sentences that express the main themes of the document
   * @param {string} text - Document text
   * @param {Array} keywords - Extracted keywords
   * @param {boolean} hasChinese - Whether the text contains Chinese characters
   * @returns {Array} - Thematic sentences
   */
  extractThematicSentences(text, keywords, hasChinese) {
    const sentences = hasChinese ? 
      text.split(/[。！？；]+/).filter(s => s.trim().length > 0) : 
      text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    const thematicSentences = [];
    
    sentences.forEach(sentence => {
      const trimmed = sentence.trim();
      if (trimmed.length < 20) return;
      
      // Check for sentences that introduce or summarize themes
      const thematicMarkers = hasChinese ? 
        ['主题', '核心', '重点', '要点', '主要内容', '主要观点', '主要思想', '总结', '概述'] :
        ['theme', 'core', 'focus', 'key point', 'main content', 'main idea', 'summary', 'overview'];
      
      const hasThematicMarker = thematicMarkers.some(marker => 
        trimmed.toLowerCase().includes(marker.toLowerCase())
      );
      
      if (hasThematicMarker) {
        thematicSentences.push(trimmed);
      }
    });
    
    return thematicSentences;
  }
  
  /**
   * Rank core ideas based on their importance and diversity
   * @param {Array} coreIdeas - Initial core ideas
   * @param {Array} keywords - Extracted keywords
   * @param {boolean} hasChinese - Whether the text contains Chinese characters
   * @returns {Array} - Ranked core ideas
   */
  rankCoreIdeas(coreIdeas, keywords, hasChinese) {
    const rankedIdeas = coreIdeas.map(idea => {
      let score = 0;
      const ideaLower = idea.toLowerCase();
      
      // 1. Keyword coverage
      keywords.forEach((keyword, index) => {
        if (ideaLower.includes(keyword.toLowerCase())) {
          score += (keywords.length - index) / keywords.length * 3;
        }
      });
      
      // 2. Length (prefer medium-length ideas)
      const lengthScore = Math.max(0, 5 - Math.abs(idea.length - 60) / 20);
      score += lengthScore;
      
      // 3. Clarity (prefer ideas with clear structure)
      const clarityScore = this.calculateClarityScore(idea, hasChinese);
      score += clarityScore;
      
      return { idea, score };
    });
    
    // Sort by score
    rankedIdeas.sort((a, b) => b.score - a.score);
    
    // Return just the ideas
    return rankedIdeas.map(item => item.idea);
  }
  
  /**
   * Calculate clarity score for a core idea
   * @param {string} idea - Core idea text
   * @param {boolean} hasChinese - Whether the text contains Chinese characters
   * @returns {number} - Clarity score
   */
  calculateClarityScore(idea, hasChinese) {
    let score = 0;
    
    // 1. Presence of punctuation (indicates clear structure)
    const punctuationMarks = hasChinese ? ['，', '。', '；', '：'] : [',', '.', ';', ':'];
    let punctuationCount = 0;
    punctuationMarks.forEach(mark => {
      punctuationCount += (idea.match(new RegExp(mark, 'g')) || []).length;
    });
    score += Math.min(punctuationCount, 3);
    
    // 2. Avoid overly complex sentences
    if (idea.length < 150) {
      score += 2;
    }
    
    // 3. Presence of concrete terms (vs abstract terms)
    const concreteTerms = hasChinese ? 
      ['方法', '技术', '系统', '实现', '数据', '结果', '分析', '设计', '流程', '步骤'] :
      ['method', 'technology', 'system', 'implementation', 'data', 'result', 'analysis', 'design', 'process', 'step'];
    
    let concreteTermCount = 0;
    concreteTerms.forEach(term => {
      if (idea.toLowerCase().includes(term.toLowerCase())) {
        concreteTermCount++;
      }
    });
    score += concreteTermCount;
    
    return score;
  }

  /**
   * Analyze logical flow of the document
   * @param {string} text - Text content
   * @param {boolean} hasChinese - Whether the text contains Chinese characters
   * @returns {Array} - Logical flow analysis
   */
  analyzeLogicalFlow(text, hasChinese) {
    const flow = [];
    const logicalSteps = [];
    
    // Enhanced logical connectors with categories and subcategories
    const chineseConnectors = {
      sequence: {
        markers: ['首先', '其次', '然后', '接着', '最后', '最终', '第一步', '第二步', '第三步', '首先是', '其次是', '最后是'],
        weight: 1.0
      },
      causeEffect: {
        markers: ['因此', '所以', '从而', '导致', '结果', '使得', '由于', '因为', '原因是', '基于', '鉴于'],
        weight: 1.2
      },
      contrast: {
        markers: ['然而', '但是', '不过', '相反', '另一方面', '反之', '虽然', '尽管', '即使', '即便'],
        weight: 1.1
      },
      addition: {
        markers: ['此外', '另外', '还有', '同时', '而且', '并且', '加之', '再者', '除了', '不仅'],
        weight: 0.9
      },
      emphasis: {
        markers: ['重要的是', '关键在于', '特别', '尤其', '值得注意的是', '必须指出', '需要强调', '核心是', '本质是'],
        weight: 1.3
      },
      conclusion: {
        markers: ['综上所述', '总之', '总结', '概括地说', '简而言之', '一言以蔽之', '总的来说', '最终', '结果是'],
        weight: 1.4
      },
      condition: {
        markers: ['如果', '假如', '假设', '倘若', '要是', '只要', '只有', '除非', '如果说'],
        weight: 1.0
      },
      comparison: {
        markers: ['相比之下', '与...相比', '比较而言', '类似于', '相当于', '等同于', '正如', '就像'],
        weight: 0.9
      },
      illustration: {
        markers: ['例如', '比如', '举例来说', '比如', '像', '诸如', '譬如', '比方说'],
        weight: 0.8
      },
      concession: {
        markers: ['虽然', '尽管', '即使', '即便', '就算', '纵然', '虽然如此', '尽管如此'],
        weight: 1.0
      }
    };
    
    const englishConnectors = {
      sequence: {
        markers: ['first', 'second', 'then', 'next', 'finally', 'eventually', 'firstly', 'secondly', 'thirdly', 'to begin with', 'next', 'after that', 'lastly'],
        weight: 1.0
      },
      causeEffect: {
        markers: ['therefore', 'thus', 'so', 'consequently', 'as a result', 'leading to', 'because', 'since', 'due to', 'as', 'given that'],
        weight: 1.2
      },
      contrast: {
        markers: ['however', 'but', 'nevertheless', 'on the contrary', 'on the other hand', 'in contrast', 'while', 'whereas', 'although', 'even though'],
        weight: 1.1
      },
      addition: {
        markers: ['in addition', 'additionally', 'furthermore', 'moreover', 'also', 'besides', 'further', 'plus', 'whats more'],
        weight: 0.9
      },
      emphasis: {
        markers: ['importantly', 'key point', 'notably', 'especially', 'significantly', 'critically', 'crucially', 'essentially', 'fundamentally'],
        weight: 1.3
      },
      conclusion: {
        markers: ['in conclusion', 'to sum up', 'overall', 'in summary', 'briefly', 'in short', 'all in all', 'finally', 'ultimately'],
        weight: 1.4
      },
      condition: {
        markers: ['if', 'unless', 'provided that', 'assuming that', 'in case', 'as long as', 'only if', 'if only'],
        weight: 1.0
      },
      comparison: {
        markers: ['compared to', 'in comparison', 'like', 'similarly', 'analogous to', 'equivalent to', 'just as', 'as if'],
        weight: 0.9
      },
      illustration: {
        markers: ['for example', 'for instance', 'such as', 'like', 'including', 'e.g.', 'namely', 'specifically'],
        weight: 0.8
      },
      concession: {
        markers: ['although', 'though', 'even though', 'despite', 'in spite of', 'regardless of', 'notwithstanding'],
        weight: 1.0
      }
    };
    
    const connectors = hasChinese ? chineseConnectors : englishConnectors;
    
    // Split text into sentences
    const sentences = hasChinese ? 
      text.split(/[。！？；]+/).filter(s => s.trim().length > 0) :
      text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    // Identify sentences with connectors and their logical role
    sentences.forEach((sentence, index) => {
      const trimmed = sentence.trim();
      const lowerTrimmed = trimmed.toLowerCase();
      
      let foundConnector = false;
      let connectorType = '';
      let connector = '';
      let connectorWeight = 1.0;
      
      // Check each connector category
      Object.entries(connectors).forEach(([type, connectorInfo]) => {
        if (foundConnector) return;
        
        const found = connectorInfo.markers.find(conn => {
          return hasChinese ? trimmed.includes(conn) : lowerTrimmed.includes(conn);
        });
        
        if (found) {
          foundConnector = true;
          connectorType = type;
          connector = found;
          connectorWeight = connectorInfo.weight;
        }
      });
      
      if (foundConnector) {
        const flowItem = {
          position: index,
          connector: connector,
          connectorType: connectorType,
          weight: connectorWeight,
          content: trimmed,
          sentenceIndex: index
        };
        flow.push(flowItem);
        logicalSteps.push(flowItem);
      }
    });
    
    // If no connectors found, use paragraph structure to infer logical flow
    if (flow.length === 0) {
      const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
      paragraphs.forEach((paragraph, index) => {
        if (hasChinese) {
          const paraSentences = paragraph.split(/[。！？；]+/).filter(s => s.trim().length > 0);
          if (paraSentences.length > 0) {
            const connector = index === 0 ? '开始' : 
                           index === paragraphs.length - 1 ? '总结' : '然后';
            const connectorType = index === 0 ? 'sequence' : 
                                 index === paragraphs.length - 1 ? 'conclusion' : 'sequence';
            
            const flowItem = {
              position: index,
              connector: connector,
              connectorType: connectorType,
              weight: index === 0 || index === paragraphs.length - 1 ? 1.2 : 1.0,
              content: paraSentences[0].trim(),
              paragraphIndex: index
            };
            flow.push(flowItem);
            logicalSteps.push(flowItem);
          }
        } else {
          const paraSentences = paragraph.split(/[.!?]+/).filter(s => s.trim().length > 0);
          if (paraSentences.length > 0) {
            const connector = index === 0 ? 'Beginning' : 
                           index === paragraphs.length - 1 ? 'Conclusion' : 'Then';
            const connectorType = index === 0 ? 'sequence' : 
                                 index === paragraphs.length - 1 ? 'conclusion' : 'sequence';
            
            const flowItem = {
              position: index,
              connector: connector,
              connectorType: connectorType,
              weight: index === 0 || index === paragraphs.length - 1 ? 1.2 : 1.0,
              content: paraSentences[0].trim(),
              paragraphIndex: index
            };
            flow.push(flowItem);
            logicalSteps.push(flowItem);
          }
        }
      });
    }
    
    // Add logical structure analysis
    const logicalStructure = this.analyzeLogicalStructure(logicalSteps, hasChinese);
    
    // Add logical flow patterns and relationships
    const flowPatterns = this.identifyFlowPatterns(logicalSteps, hasChinese);
    const logicalRelationships = this.extractLogicalRelationships(sentences, logicalSteps, hasChinese);
    
    return {
      flow: flow,
      logicalSteps: logicalSteps,
      structure: logicalStructure,
      patterns: flowPatterns,
      relationships: logicalRelationships
    };
  }
  
  /**
   * Analyze logical structure based on flow steps
   * @param {Array} logicalSteps - Logical flow steps
   * @param {boolean} hasChinese - Whether the text contains Chinese characters
   * @returns {Object} - Logical structure analysis
   */
  analyzeLogicalStructure(logicalSteps, hasChinese) {
    const structure = {
      mainSections: [],
      transitionTypes: {},
      flowPattern: '',
      weightedTransitionTypes: {}
    };
    
    // Count transition types with weights
    logicalSteps.forEach(step => {
      if (step.connectorType) {
        structure.transitionTypes[step.connectorType] = (structure.transitionTypes[step.connectorType] || 0) + 1;
        structure.weightedTransitionTypes[step.connectorType] = (structure.weightedTransitionTypes[step.connectorType] || 0) + (step.weight || 1.0);
      }
    });
    
    // Identify main sections based on connector types
    let currentSection = null;
    logicalSteps.forEach(step => {
      if (step.connectorType === 'sequence' || step.connectorType === 'conclusion' || step.connectorType === 'emphasis') {
        if (currentSection) {
          structure.mainSections.push(currentSection);
        }
        currentSection = {
          type: step.connectorType,
          connector: step.connector,
          content: [step.content],
          startPosition: step.position,
          weight: step.weight || 1.0
        };
      } else if (currentSection) {
        currentSection.content.push(step.content);
      }
    });
    
    if (currentSection) {
      structure.mainSections.push(currentSection);
    }
    
    // Determine flow pattern based on weighted transition types
    const sortedTransitions = Object.entries(structure.weightedTransitionTypes)
      .sort((a, b) => b[1] - a[1]);
    
    if (sortedTransitions.length > 0) {
      const primaryTransition = sortedTransitions[0][0];
      
      if (primaryTransition === 'sequence') {
        structure.flowPattern = hasChinese ? '顺序式' : 'Sequential';
      } else if (primaryTransition === 'causeEffect') {
        structure.flowPattern = hasChinese ? '因果式' : 'Cause-Effect';
      } else if (primaryTransition === 'contrast') {
        structure.flowPattern = hasChinese ? '对比式' : 'Comparative';
      } else if (primaryTransition === 'condition') {
        structure.flowPattern = hasChinese ? '条件式' : 'Conditional';
      } else if (primaryTransition === 'comparison') {
        structure.flowPattern = hasChinese ? '比较式' : 'Comparative';
      } else if (primaryTransition === 'conclusion') {
        structure.flowPattern = hasChinese ? '总结式' : 'Conclusive';
      } else {
        structure.flowPattern = hasChinese ? '混合式' : 'Mixed';
      }
    } else {
      structure.flowPattern = hasChinese ? '混合式' : 'Mixed';
    }
    
    return structure;
  }
  
  /**
   * Identify flow patterns from logical steps
   * @param {Array} logicalSteps - Logical flow steps
   * @param {boolean} hasChinese - Whether the text contains Chinese characters
   * @returns {Object} - Flow patterns
   */
  identifyFlowPatterns(logicalSteps, hasChinese) {
    const patterns = {
      dominantPattern: hasChinese ? '混合式' : 'Mixed',
      secondaryPatterns: [],
      patternSequence: [],
      patternDistribution: {}
    };
    
    // Calculate pattern distribution
    logicalSteps.forEach(step => {
      if (step.connectorType) {
        patterns.patternDistribution[step.connectorType] = (patterns.patternDistribution[step.connectorType] || 0) + 1;
      }
    });
    
    // Determine dominant pattern
    const sortedPatterns = Object.entries(patterns.patternDistribution)
      .sort((a, b) => b[1] - a[1]);
    
    if (sortedPatterns.length > 0) {
      const dominantType = sortedPatterns[0][0];
      patterns.dominantPattern = this.getPatternName(dominantType, hasChinese);
      
      // Add secondary patterns
      if (sortedPatterns.length > 1) {
        patterns.secondaryPatterns = sortedPatterns.slice(1, 3).map(([type, count]) => this.getPatternName(type, hasChinese));
      }
    }
    
    // Identify pattern sequence
    let currentPattern = null;
    let patternCount = 0;
    
    logicalSteps.forEach(step => {
      if (step.connectorType && step.connectorType !== currentPattern) {
        if (currentPattern) {
          patterns.patternSequence.push({
            pattern: this.getPatternName(currentPattern, hasChinese),
            count: patternCount
          });
        }
        currentPattern = step.connectorType;
        patternCount = 1;
      } else if (step.connectorType === currentPattern) {
        patternCount++;
      }
    });
    
    if (currentPattern) {
      patterns.patternSequence.push({
        pattern: this.getPatternName(currentPattern, hasChinese),
        count: patternCount
      });
    }
    
    return patterns;
  }
  
  /**
   * Get human-readable pattern name
   * @param {string} patternType - Pattern type
   * @param {boolean} hasChinese - Whether the text contains Chinese characters
   * @returns {string} - Human-readable pattern name
   */
  getPatternName(patternType, hasChinese) {
    const chineseNames = {
      sequence: '顺序式',
      causeEffect: '因果式',
      contrast: '对比式',
      addition: '递进式',
      emphasis: '强调式',
      conclusion: '总结式',
      condition: '条件式',
      comparison: '比较式',
      illustration: '举例式',
      concession: '让步式'
    };
    
    const englishNames = {
      sequence: 'Sequential',
      causeEffect: 'Cause-Effect',
      contrast: 'Contrastive',
      addition: 'Additive',
      emphasis: 'Emphatic',
      conclusion: 'Conclusive',
      condition: 'Conditional',
      comparison: 'Comparative',
      illustration: 'Illustrative',
      concession: 'Concessive'
    };
    
    return hasChinese ? chineseNames[patternType] || patternType : englishNames[patternType] || patternType;
  }
  
  /**
   * Extract logical relationships between sentences
   * @param {Array} sentences - All sentences
   * @param {Array} logicalSteps - Logical flow steps
   * @param {boolean} hasChinese - Whether the text contains Chinese characters
   * @returns {Array} - Logical relationships
   */
  extractLogicalRelationships(sentences, logicalSteps, hasChinese) {
    const relationships = [];
    
    // Create a map of sentence indices to logical steps
    const stepMap = {};
    logicalSteps.forEach(step => {
      if (step.sentenceIndex !== undefined) {
        stepMap[step.sentenceIndex] = step;
      }
    });
    
    // Analyze relationships between consecutive sentences
    for (let i = 0; i < sentences.length - 1; i++) {
      const currentSentence = sentences[i].trim();
      const nextSentence = sentences[i + 1].trim();
      
      let relationshipType = 'unknown';
      let strength = 0.0;
      
      // Check if either sentence has a logical connector
      const currentStep = stepMap[i];
      const nextStep = stepMap[i + 1];
      
      if (currentStep) {
        relationshipType = this.getRelationshipType(currentStep.connectorType);
        strength = currentStep.weight || 1.0;
      } else if (nextStep) {
        relationshipType = this.getRelationshipType(nextStep.connectorType);
        strength = nextStep.weight || 1.0;
      } else {
        // Infer relationship based on content similarity
        const similarity = this.calculateContentSimilarity(currentSentence, nextSentence, hasChinese);
        if (similarity > 0.3) {
          relationshipType = 'continuation';
          strength = similarity;
        } else {
          relationshipType = 'transition';
          strength = 0.5;
        }
      }
      
      relationships.push({
        fromIndex: i,
        toIndex: i + 1,
        relationshipType: relationshipType,
        strength: strength,
        fromContent: currentSentence.substring(0, 50) + (currentSentence.length > 50 ? '...' : ''),
        toContent: nextSentence.substring(0, 50) + (nextSentence.length > 50 ? '...' : '')
      });
    }
    
    return relationships;
  }
  
  /**
   * Get relationship type from connector type
   * @param {string} connectorType - Connector type
   * @returns {string} - Relationship type
   */
  getRelationshipType(connectorType) {
    const relationshipMap = {
      sequence: 'sequence',
      causeEffect: 'cause_effect',
      contrast: 'contrast',
      addition: 'addition',
      emphasis: 'emphasis',
      conclusion: 'conclusion',
      condition: 'condition',
      comparison: 'comparison',
      illustration: 'illustration',
      concession: 'concession'
    };
    
    return relationshipMap[connectorType] || 'unknown';
  }
  
  /**
   * Calculate content similarity between two sentences
   * @param {string} sentence1 - First sentence
   * @param {string} sentence2 - Second sentence
   * @param {boolean} hasChinese - Whether the text contains Chinese characters
   * @returns {number} - Similarity score (0-1)
   */
  calculateContentSimilarity(sentence1, sentence2, hasChinese) {
    if (hasChinese) {
      // For Chinese, use character-based similarity
      const chars1 = new Set(sentence1.split(''));
      const chars2 = new Set(sentence2.split(''));
      const intersection = new Set([...chars1].filter(char => chars2.has(char)));
      const union = new Set([...chars1, ...chars2]);
      return intersection.size / union.size;
    } else {
      // For English, use word-based similarity
      const words1 = new Set(sentence1.toLowerCase().split(/\s+/));
      const words2 = new Set(sentence2.toLowerCase().split(/\s+/));
      const intersection = new Set([...words1].filter(word => words2.has(word)));
      const union = new Set([...words1, ...words2]);
      return intersection.size / union.size;
    }
  }
  
  /**
   * Generate enhanced content description based on analysis results
   * @param {Object} analysis - Analysis results
   * @param {boolean} hasChinese - Whether the text contains Chinese characters
   * @param {string} contentCategory - Content category (copywriting, image, video, audio)
   * @returns {string} - Enhanced content description
   */
  generateEnhancedDescription(analysis, hasChinese, contentCategory = 'copywriting') {
    // Validate input
    if (!analysis || typeof analysis !== 'object') {
      return hasChinese ? '文档内容的详细描述' : 'Detailed description of document content';
    }
    
    // Extract enhanced analysis results
    const coreTopic = this.extractCoreTopic(analysis.contentSummary || '', analysis.keywords || [], hasChinese);
    const keyElements = (analysis.keyPhrases || []).slice(0, 5).join(hasChinese ? '、' : ', ');
    const style = analysis.style || 'informative';
    const themes = (analysis.themes || []).slice(0, 3).join(hasChinese ? '、' : ', ');
    const coreIdeas = (analysis.coreIdeas || []).slice(0, 2).join(hasChinese ? '；' : '. ');
    const logicalFlowPattern = analysis.logicalFlow?.structure?.flowPattern || (hasChinese ? '混合式' : 'Mixed');
    const documentStructure = analysis.documentStructure || {};
    const sectionsCount = documentStructure.sections?.length || documentStructure.paragraphs || 0;
    
    // Process English content to remove Chinese characters
    let englishCoreTopic = coreTopic;
    let englishKeyElements = keyElements;
    let englishStyle = style;
    let englishThemes = themes;
    let englishCoreIdeas = coreIdeas;
    let englishLogicalFlowPattern = logicalFlowPattern;
    
    if (!hasChinese) {
      englishCoreTopic = this.removeChineseCharacters(coreTopic);
      englishKeyElements = this.removeChineseCharacters(keyElements);
      englishStyle = this.removeChineseCharacters(style);
      englishThemes = this.removeChineseCharacters(themes);
      englishCoreIdeas = this.removeChineseCharacters(coreIdeas);
      englishLogicalFlowPattern = this.removeChineseCharacters(logicalFlowPattern);
    }
    
    // 针对不同内容类别的专业提示词模板，整合更多分析结果
    const categoryTemplates = {
      copywriting: {
        chinese: `关于${coreTopic}的专业文案，涵盖${keyElements}等关键元素，围绕${themes}等主题展开，采用${style}风格，结构${sectionsCount > 3 ? '清晰' : '简洁'}，逻辑${logicalFlowPattern}，核心思想包括${coreIdeas}，包含目标受众、核心信息、语气风格和预期效果，适合AI生成高质量文案内容。`,
        english: `Professional copywriting about ${englishCoreTopic}, covering key elements such as ${englishKeyElements}, focusing on themes like ${englishThemes}, using ${englishStyle} style, with ${sectionsCount > 3 ? 'clear' : 'concise'} structure and ${englishLogicalFlowPattern} logical flow, core ideas including ${englishCoreIdeas}, including target audience, core message, tone, and desired outcome, suitable for AI-generated high-quality copywriting content.`
      },
      image: {
        chinese: `关于${coreTopic}的详细图像描述，涵盖${keyElements}等关键元素，体现${themes}等主题，采用${style}风格，结构${sectionsCount > 3 ? '丰富' : '简洁'}，逻辑${logicalFlowPattern}，核心思想包括${coreIdeas}，包含主体、风格、构图、光线、色彩、细节和氛围，适合AI生成高质量图像内容。`,
        english: `Detailed image description about ${englishCoreTopic}, covering key elements such as ${englishKeyElements}, reflecting themes like ${englishThemes}, using ${englishStyle} style, with ${sectionsCount > 3 ? 'rich' : 'concise'} structure and ${englishLogicalFlowPattern} logical flow, core ideas including ${englishCoreIdeas}, including subject, style, composition, lighting, colors, details, and atmosphere, suitable for AI-generated high-quality image content.`
      },
      video: {
        chinese: `关于${coreTopic}的详细视频描述，涵盖${keyElements}等关键元素，围绕${themes}等主题展开，采用${style}风格，结构${sectionsCount > 3 ? '完整' : '紧凑'}，逻辑${logicalFlowPattern}，核心思想包括${coreIdeas}，包含主题、风格、镜头运用、节奏、音乐和视觉效果，适合AI生成高质量视频内容。`,
        english: `Detailed video description about ${englishCoreTopic}, covering key elements such as ${englishKeyElements}, focusing on themes like ${englishThemes}, using ${englishStyle} style, with ${sectionsCount > 3 ? 'complete' : 'compact'} structure and ${englishLogicalFlowPattern} logical flow, core ideas including ${englishCoreIdeas}, including theme, style, camera work, pacing, music, and visual effects, suitable for AI-generated high-quality video content.`
      },
      audio: {
        chinese: `关于${coreTopic}的详细音频描述，涵盖${keyElements}等关键元素，体现${themes}等主题，采用${style}风格，结构${sectionsCount > 3 ? '层次丰富' : '简洁明快'}，逻辑${logicalFlowPattern}，核心思想包括${coreIdeas}，包含风格、情绪、节奏、乐器和音效，适合AI生成高质量音频内容。`,
        english: `Detailed audio description about ${englishCoreTopic}, covering key elements such as ${englishKeyElements}, reflecting themes like ${englishThemes}, using ${englishStyle} style, with ${sectionsCount > 3 ? 'richly layered' : 'concise and lively'} structure and ${englishLogicalFlowPattern} logical flow, core ideas including ${englishCoreIdeas}, including style, mood, rhythm, instruments, and sound effects, suitable for AI-generated high-quality audio content.`
      }
    };
    
    // 获取对应类别的模板，如果没有则使用文案模板作为默认
    const template = categoryTemplates[contentCategory] || categoryTemplates.copywriting;
    
    return hasChinese ? template.chinese : template.english;
  }
  
  /**
   * Generate comprehensive prompt based on document analysis
   * @param {Object} analysis - Document analysis results
   * @param {boolean} hasChinese - Whether the text contains Chinese characters
   * @param {string} contentCategory - Content category
   * @returns {string} - Comprehensive prompt
   */
  generateComprehensivePrompt(analysis, hasChinese, contentCategory = 'copywriting') {
    if (!analysis || typeof analysis !== 'object') {
      return hasChinese ? '基于文档内容生成提示词' : 'Generate prompt based on document content';
    }
    
    // Extract all relevant analysis results
    const coreTopic = this.extractCoreTopic(analysis.contentSummary || '', analysis.keywords || [], hasChinese);
    const keywords = (analysis.keywords || []).slice(0, 10).join(hasChinese ? '、' : ', ');
    const keyPhrases = (analysis.keyPhrases || []).slice(0, 5).join(hasChinese ? '；' : '. ');
    const themes = (analysis.themes || []).slice(0, 3).join(hasChinese ? '、' : ', ');
    const coreIdeas = (analysis.coreIdeas || []).slice(0, 3).join(hasChinese ? '；' : '. ');
    const style = analysis.style || 'informative';
    const logicalFlowPattern = analysis.logicalFlow?.structure?.flowPattern || (hasChinese ? '混合式' : 'Mixed');
    const documentStructure = analysis.documentStructure || {};
    const sectionsCount = documentStructure.sections?.length || documentStructure.paragraphs || 0;
    const entities = (analysis.entities || []).slice(0, 5).join(hasChinese ? '、' : ', ');
    
    // Generate comprehensive prompt that reflects the document's core content, structure, and logical relationships
    if (hasChinese) {
      return `基于文档分析，生成关于${coreTopic}的${contentCategory === 'copywriting' ? '文案' : contentCategory === 'image' ? '图像' : contentCategory === 'video' ? '视频' : '音频'}内容。

核心主题：${coreTopic}
关键元素：${keyPhrases}
核心关键词：${keywords}
主要主题：${themes}
核心思想：${coreIdeas}
文档风格：${style}
逻辑结构：${logicalFlowPattern}
文档结构：${sectionsCount}个段落/章节
重要实体：${entities}

要求：
1. 准确反映文档的核心内容和主题
2. 体现文档的结构和逻辑关系
3. 使用专业、准确的表达
4. 包含足够的细节以指导高质量内容生成
5. 适合${contentCategory === 'copywriting' ? '文案' : contentCategory === 'image' ? '图像' : contentCategory === 'video' ? '视频' : '音频'}生成系统使用`;
    } else {
      // Ensure English prompt doesn't contain Chinese characters
      const englishCoreTopic = this.removeChineseCharacters(coreTopic);
      const englishKeyPhrases = this.removeChineseCharacters(keyPhrases);
      const englishKeywords = this.removeChineseCharacters(keywords);
      const englishThemes = this.removeChineseCharacters(themes);
      const englishCoreIdeas = this.removeChineseCharacters(coreIdeas);
      const englishStyle = this.removeChineseCharacters(style);
      const englishLogicalFlowPattern = this.removeChineseCharacters(logicalFlowPattern);
      const englishEntities = this.removeChineseCharacters(entities);
      
      return `Based on document analysis, generate ${contentCategory === 'copywriting' ? 'copywriting' : contentCategory === 'image' ? 'image' : contentCategory === 'video' ? 'video' : 'audio'} content about ${englishCoreTopic}.

Core topic: ${englishCoreTopic}
Key elements: ${englishKeyPhrases}
Core keywords: ${englishKeywords}
Main themes: ${englishThemes}
Core ideas: ${englishCoreIdeas}
Document style: ${englishStyle}
Logical structure: ${englishLogicalFlowPattern}
Document structure: ${sectionsCount} paragraphs/sections
Important entities: ${englishEntities}

Requirements:
1. Accurately reflect the document's core content and themes
2. Reflect the document's structure and logical relationships
3. Use professional and accurate expressions
4. Include sufficient details to guide high-quality content generation
5. Suitable for ${contentCategory === 'copywriting' ? 'copywriting' : contentCategory === 'image' ? 'image' : contentCategory === 'video' ? 'video' : 'audio'} generation systems`;
    }
  }

  /**
   * Remove Chinese characters from text
   * @param {string} text - Text to process
   * @returns {string} - Text without Chinese characters
   */
  removeChineseCharacters(text) {
    if (!text || typeof text !== 'string') return '';
    // Remove Chinese characters AND Chinese punctuation
    return text.replace(/[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/g, '').replace(/\s+/g, ' ').trim();
  }

  /**
   * Call OpenAI API to generate reverse prompt
   * @param {string} content - Extracted text content
   * @param {boolean} hasChinese - Whether the text contains Chinese characters
   * @param {string} contentCategory - Content category (copywriting, image, video, audio)
   * @returns {Promise<Object>} - Generated reverse prompt and structured details from OpenAI
   */
  // Preprocess content to filter out useless information
  preprocessContent(content) {
    if (!content) return '';
    
    // Filter out detailed dates (e.g., 2024-01-01, January 1, 2024, etc.)
    let processedContent = content.replace(/\b\d{4}[-/]\d{1,2}[-/]\d{1,2}\b/g, '');
    processedContent = processedContent.replace(/\b(January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, \d{4}\b/g, '');
    
    // Filter out advertisements
    processedContent = processedContent.replace(/(广告|advertisement|sponsored|promoted)/gi, '');
    
    // Filter out indexes (e.g., 1., 2., A., B., etc.)
    processedContent = processedContent.replace(/\b(\d+|A|B|C|D|E|F|G|H|I|J|K|L|M|N|O|P|Q|R|S|T|U|V|W|X|Y|Z)\.\s+/g, '');
    
    // Filter out other useless information
    processedContent = processedContent.replace(/\b(索引|index|目录|table of contents|TOC)\b/gi, '');
    
    // Remove extra whitespace
    processedContent = processedContent.replace(/\s+/g, ' ').trim();
    
    return processedContent;
  }

  async callGeminiForReversePrompt(content, hasChinese, contentCategory = 'copywriting') {
    const geminiApiKey = config.aiModel.gemini.apiKey;
    
    if (!geminiApiKey) {
      throw new Error('Gemini API key not configured');
    }
    
    // Preprocess content to filter out useless information
    const preprocessedContent = this.preprocessContent(content);
    
    // Limit content length to avoid token limits - increased for better context understanding
    const maxContentLength = 10000; // 大幅增加内容长度限制，提高对复杂内容的处理能力
    const truncatedContent = preprocessedContent.length > maxContentLength ? preprocessedContent.substring(0, maxContentLength) + '... [Content truncated]' : preprocessedContent;
    
    const contentCategoryChinese = {
      copywriting: '文案',
      image: '图片',
      video: '视频',
      audio: '音频'
    };
    
    const contentCategoryEnglish = {
      copywriting: 'copywriting',
      image: 'image generation',
      video: 'video generation',
      audio: 'audio generation'
    };
    
    // 针对不同内容类别的专业提示词指南
    const categorySpecificGuidelines = hasChinese ? {
      copywriting: "文案提示词应包含目标受众、核心信息、语气风格、长度要求和预期效果",
      image: "图片提示词应包含主体、风格、构图、光线、色彩、细节和氛围",
      video: "视频提示词应包含主题、风格、镜头运用、节奏、音乐和视觉效果",
      audio: "音频提示词应包含风格、情绪、节奏、乐器和音效"
    } : {
      copywriting: "Copywriting prompts should include target audience, core message, tone, length requirements, and desired outcome",
      image: "Image prompts should include subject, style, composition, lighting, colors, details, and atmosphere",
      video: "Video prompts should include theme, style, camera work, pacing, music, and visual effects",
      audio: "Audio prompts should include style, mood, rhythm, instruments, and sound effects"
    };
    
    const systemPrompt = hasChinese ? 
      `你是一个专业的AI提示词生成专家，精通${contentCategoryChinese[contentCategory] || '文案'}等AI内容生成系统的提示词工程。你的任务是基于提供的文档内容，生成一个高质量、结构化的反向提示词，用于描述生成该文档的原始提示词。

请按照以下结构生成结果，以JSON格式输出：
{
  "reversePrompt": "直接生成的反向提示词，采用行业标准的提示词格式，包含主体、风格、细节等要素，中、英文对照显示",
  "structuredDetails": {
    "coreTheme": "文档的中心思想和主要内容",
    "styleDefinition": "文档的写作风格、语气和形式",
    "keyElements": "文档中最重要的概念、技术或知识点",
    "positivePrompts": "生成该文档应包含的正向元素，采用CLIP模型优化的关键词",
    "negativePrompts": "生成该文档应避免的负向元素，遵循对比学习原理",
    "technicalDetails": "文档中涉及的关键技术、算法或方法",
    "applicationScenarios": "文档内容的适用场景和应用领域",
    "futureTrends": "对文档内容未来发展趋势的预测",
    "audience": "文档的目标受众",
    "purpose": "文档的创作目的"
  }
}

**${contentCategoryChinese[contentCategory] || '文案'}专业提示词指南：**
${categorySpecificGuidelines[contentCategory] || categorySpecificGuidelines.copywriting}

**重要要求：**
1. 仔细阅读并理解提供的文档内容，确保生成的反向提示词与文档内容高度相关
2. **绝对不要套用固定句式，如"一个关于XX的详细描述，包含......"等千篇一律的表达**
3. **删除固定的词组"包含"**
4. **除了原文数据以外，不要复制原文的内容，要用完全不同的文字转述原文的各要素**
5. **过滤掉原文中的详细日期、广告、索引等无用的数据信息，只保留核心内容**
6. **生成的反向提示词必须用中、英文对照显示，格式为：中文提示词\n英文提示词**
7. **中文提示词中除了引用原文数据外，不要出现英文**
8. **英文提示词中要包含与中文提示词对应的完整内容**
9. **深度分析文档的核心主题、关键概念和结构，确保这些元素在反向提示词中得到充分体现**
10. **分析文档的风格、语气和形式，确保反向提示词能够准确反映这些特点**
11. **识别文档中的关键技术、算法或方法（如果有），并在反向提示词中详细包含这些要素**
12. **考虑文档的适用场景和应用领域，确保反向提示词能够指导生成适合这些场景的内容**
13. **深入分析文档的主旨、特征和描述意义**
14. **基于文档内容，预测文档内容的未来发展趋势**
15. **生成的反向提示词应具有独特性和创新性，避免千篇一律的表达**
16. **英文提示词必须是完整的句子，与中文提示词内容完全对应，不要只翻译部分内容**
17. **根据文档的长度、复杂度和专业程度，调整提示词的详细程度和专业水平**
18. **使用专业的行业术语和表达，提高提示词的专业性和准确性**
19. **确保提示词结构清晰，逻辑连贯，便于AI系统理解和执行**
20. 生成的反向提示词应符合${contentCategoryChinese[contentCategory] || '文案'}生成系统的最佳实践，包含足够的细节来指导高质量的内容生成
21. 确保生成的JSON格式正确，没有语法错误` :
      `You are a professional AI prompt generation expert, proficient in prompt engineering for ${contentCategoryEnglish[contentCategory] || 'copywriting'} systems. Your task is to generate a high-quality, structured reverse prompt based on the provided document content, which describes the original prompt used to generate that document.

Please generate results according to the following structure, output as JSON:
{
  "reversePrompt": "Directly generated reverse prompt in industry-standard format, including subject, style, details, etc., displayed in both Chinese and English",
  "structuredDetails": {
    "coreTheme": "The central idea and main content of the document",
    "styleDefinition": "The writing style, tone, and form of the document",
    "keyElements": "The most important concepts, technologies, or knowledge points in the document",
    "positivePrompts": "Positive elements that should be included in generating this document, using CLIP-optimized keywords",
    "negativePrompts": "Negative elements that should be avoided in generating this document, following contrastive learning principles",
    "technicalDetails": "Key technologies, algorithms, or methods involved in the document",
    "applicationScenarios": "The applicable scenarios and application areas of the document content",
    "futureTrends": "Prediction of future development trends of the document content",
    "audience": "The target audience of the document",
    "purpose": "The purpose of creating the document"
  }
}

**${contentCategoryEnglish[contentCategory] || 'Copywriting'} Professional Prompt Guidelines:**
${categorySpecificGuidelines[contentCategory] || categorySpecificGuidelines.copywriting}

**Important Requirements:**
1. Carefully read and understand the provided document content, ensuring that the generated reverse prompt is highly relevant to the document content
2. **Absolutely do not use fixed sentence patterns, such as 'a detailed description of XX, including...' or other repetitive expressions**
3. **Remove the fixed phrase 'including'**
4. **Do not copy the original content except for data. Use completely different words to paraphrase all elements of the original text**
5. **Filter out useless data information in the original text, such as detailed dates, advertisements, indexes, etc., and only retain the core content**
6. **The generated reverse prompt must be displayed in both Chinese and English, format: Chinese prompt\nEnglish prompt**
7. **Deeply analyze the core theme, key concepts, and structure of the document, ensuring these elements are fully reflected in the reverse prompt**
8. **Analyze the style, tone, and form of the document, ensuring the reverse prompt can accurately reflect these characteristics**
9. **Identify key technologies, algorithms, or methods in the document (if any), and include these elements in detail in the reverse prompt**
10. **Consider the applicable scenarios and application areas of the document, ensuring the reverse prompt can guide the generation of content suitable for these scenarios**
11. **Deeply analyze the main idea, characteristics, and significance of the document**
12. **Based on the document content, predict the future development trends of the document content**
13. **The generated reverse prompt should be unique and innovative, avoiding repetitive expressions**
14. **The English prompt must be a complete sentence, fully corresponding to the content of the Chinese prompt, not just translating part of the content**
15. **Adjust the level of detail and professionalism in the prompt based on the document's length, complexity, and technical nature**
16. **Use professional industry terminology and expressions to enhance the prompt's professionalism and accuracy**
17. **Ensure the prompt has a clear structure and logical flow for better understanding by AI systems**
18. The generated reverse prompt should follow best practices for ${contentCategoryEnglish[contentCategory] || 'copywriting'} systems and contain sufficient details to guide high-quality content generation
19. Ensure the generated JSON format is correct with no syntax errors`;
    
    const userPrompt = hasChinese ? 
      `请基于以下文档内容生成反向提示词：

${truncatedContent}

**分析要求：**
1. 首先深入分析文档的核心主题和主要内容，理解文档的整体结构和逻辑
2. 识别文档的风格、语气和形式，确保生成的提示词能够准确反映这些特点
3. 提取文档中的关键概念、技术或知识点，确保这些元素在提示词中得到充分体现
4. 分析文档的目标受众和创作目的，确保提示词能够指导生成适合这些目标的内容
5. 考虑文档的适用场景和应用领域，确保提示词能够指导生成适合这些场景的内容
6. 基于以上分析，生成一个高质量、结构化的反向提示词，包含详细的中文提示词和完整的英文对照
7. 确保提示词专业、准确、具体，能够直接用于AI内容生成系统` : 
      `Please generate a reverse prompt based on the following document content:

${truncatedContent}

**Analysis Requirements:**
1. First deeply analyze the core theme and main content of the document, understanding the overall structure and logic of the document
2. Identify the style, tone, and form of the document, ensuring that the generated prompt can accurately reflect these characteristics
3. Extract key concepts, technologies, or knowledge points in the document, ensuring these elements are fully reflected in the prompt
4. Analyze the document's target audience and purpose, ensuring the prompt can guide the generation of content suitable for these targets
5. Consider the applicable scenarios and application areas of the document, ensuring the prompt can guide the generation of content suitable for these scenarios
6. Based on the above analysis, generate a high-quality, structured reverse prompt, including detailed Chinese prompt and complete English translation
7. Ensure the prompt is professional, accurate, and specific, ready for direct use in AI content generation systems`;
    
    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro-latest:generateContent?key=${geminiApiKey}`,
        {
          contents: [
            {
              parts: [
                { text: systemPrompt }
              ]
            },
            {
              parts: [
                { text: userPrompt }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.4, // 优化温度参数，提高生成质量和一致性
            maxOutputTokens: 4000, // 大幅增加最大输出 tokens，确保生成完整的提示词
            responseMimeType: 'application/json',
            topP: 0.8, // 优化 topP 参数，平衡多样性和准确性
            frequencyPenalty: 0.15, // 增加频率惩罚，减少重复内容
            presencePenalty: 0.1 // 添加存在惩罚，鼓励新内容
          }
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      // 检查响应结构
      if (!response.data || !response.data.candidates || response.data.candidates.length === 0) {
        throw new Error('Gemini API returned empty response');
      }
      
      const candidate = response.data.candidates[0];
      if (!candidate || !candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
        throw new Error('Gemini API returned invalid response structure');
      }
      
      return candidate.content.parts[0].text;
    } catch (error) {
      logger.error('Error calling Gemini API:', error.response?.data || error.message);
      throw new Error('Failed to generate reverse prompt using Gemini API');
    }
  }

  async callGeminiForReversePromptWithRetry(content, hasChinese, contentCategory = 'copywriting', maxRetries = 2) {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.callGeminiForReversePrompt(content, hasChinese, contentCategory);
      } catch (error) {
        lastError = error;
        logger.warn(`Gemini API attempt ${attempt + 1} failed:`, error.message);
        
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          logger.info(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError || new Error('Gemini API failed after retries');
  }

  async callOpenAIForReversePrompt(content, hasChinese, contentCategory = 'copywriting') {
    const openaiApiKey = config.aiModel.openai.apiKey;
    
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }
    
    // Preprocess content to filter out useless information
    const preprocessedContent = this.preprocessContent(content);
    
    // Limit content length to avoid token limits - increased for better context understanding
    const maxContentLength = 12000; // 大幅增加内容长度限制，提高对复杂内容的处理能力
    const truncatedContent = preprocessedContent.length > maxContentLength ? preprocessedContent.substring(0, maxContentLength) + '... [Content truncated]' : preprocessedContent;
    
    const contentCategoryChinese = {
      copywriting: '文案',
      image: '图片',
      video: '视频',
      audio: '音频'
    };
    
    const contentCategoryEnglish = {
      copywriting: 'copywriting',
      image: 'image generation',
      video: 'video generation',
      audio: 'audio generation'
    };
    
    // 针对不同内容类别的专业提示词指南
    const categorySpecificGuidelines = hasChinese ? {
      copywriting: "文案提示词应包含目标受众、核心信息、语气风格、长度要求和预期效果",
      image: "图片提示词应包含主体、风格、构图、光线、色彩、细节和氛围",
      video: "视频提示词应包含主题、风格、镜头运用、节奏、音乐和视觉效果",
      audio: "音频提示词应包含风格、情绪、节奏、乐器和音效"
    } : {
      copywriting: "Copywriting prompts should include target audience, core message, tone, length requirements, and desired outcome",
      image: "Image prompts should include subject, style, composition, lighting, colors, details, and atmosphere",
      video: "Video prompts should include theme, style, camera work, pacing, music, and visual effects",
      audio: "Audio prompts should include style, mood, rhythm, instruments, and sound effects"
    };
    
    const systemPrompt = hasChinese ? 
      `你是一个专业的AI提示词生成专家，精通${contentCategoryChinese[contentCategory] || '文案'}等AI内容生成系统的提示词工程。你的任务是基于提供的文档内容，生成一个高质量、结构化的反向提示词，用于描述生成该文档的原始提示词。

请按照以下结构生成结果，以JSON格式输出：
{
  "reversePrompt": "直接生成的反向提示词，采用行业标准的提示词格式，包含主体、风格、细节等要素，中、英文对照显示",
  "structuredDetails": {
    "coreTheme": "文档的中心思想和主要内容",
    "styleDefinition": "文档的写作风格、语气和形式",
    "keyElements": "文档中最重要的概念、技术或知识点",
    "positivePrompts": "生成该文档应包含的正向元素，采用CLIP模型优化的关键词",
    "negativePrompts": "生成该文档应避免的负向元素，遵循对比学习原理",
    "technicalDetails": "文档中涉及的关键技术、算法或方法",
    "applicationScenarios": "文档内容的适用场景和应用领域",
    "futureTrends": "对文档内容未来发展趋势的预测",
    "audience": "文档的目标受众",
    "purpose": "文档的创作目的"
  }
}

**${contentCategoryChinese[contentCategory] || '文案'}专业提示词指南：**
${categorySpecificGuidelines[contentCategory] || categorySpecificGuidelines.copywriting}

**重要要求：**
1. 仔细阅读并理解提供的文档内容，确保生成的反向提示词与文档内容高度相关
2. **绝对不要套用固定句式，如"一个关于XX的详细描述，包含......"等千篇一律的表达**
3. **删除固定的词组"包含"**
4. **除了原文数据以外，不要复制原文的内容，要用完全不同的文字转述原文的各要素**
5. **过滤掉原文中的详细日期、广告、索引等无用的数据信息，只保留核心内容**
6. **生成的反向提示词必须用中、英文对照显示，格式为：中文提示词\n英文提示词**
7. **中文提示词中除了引用原文数据外，不要出现英文**
8. **英文提示词中要包含与中文提示词对应的完整内容**
9. **深度分析文档的核心主题、关键概念和结构，确保这些元素在反向提示词中得到充分体现**
10. **分析文档的风格、语气和形式，确保反向提示词能够准确反映这些特点**
11. **识别文档中的关键技术、算法或方法（如果有），并在反向提示词中详细包含这些要素**
12. **考虑文档的适用场景和应用领域，确保反向提示词能够指导生成适合这些场景的内容**
13. **深入分析文档的主旨、特征和描述意义**
14. **基于文档内容，预测文档内容的未来发展趋势**
15. **生成的反向提示词应具有独特性和创新性，避免千篇一律的表达**
16. **英文提示词必须是完整的句子，与中文提示词内容完全对应，不要只翻译部分内容**
17. **根据文档的长度、复杂度和专业程度，调整提示词的详细程度和专业水平**
18. **使用专业的行业术语和表达，提高提示词的专业性和准确性**
19. **确保提示词结构清晰，逻辑连贯，便于AI系统理解和执行**
20. 生成的反向提示词应符合${contentCategoryChinese[contentCategory] || '文案'}生成系统的最佳实践，包含足够的细节来指导高质量的内容生成
21. 确保生成的JSON格式正确，没有语法错误` :
      `You are a professional AI prompt generation expert, proficient in prompt engineering for ${contentCategoryEnglish[contentCategory] || 'copywriting'} systems. Your task is to generate a high-quality, structured reverse prompt based on the provided document content, which describes the original prompt used to generate that document.

Please generate results according to the following structure, output as JSON:
{
  "reversePrompt": "Directly generated reverse prompt in industry-standard format, including subject, style, details, etc., displayed in both Chinese and English",
  "structuredDetails": {
    "coreTheme": "The central idea and main content of the document",
    "styleDefinition": "The writing style, tone, and form of the document",
    "keyElements": "The most important concepts, technologies, or knowledge points in the document",
    "positivePrompts": "Positive elements that should be included in generating this document, using CLIP-optimized keywords",
    "negativePrompts": "Negative elements that should be avoided in generating this document, following contrastive learning principles",
    "technicalDetails": "Key technologies, algorithms, or methods involved in the document",
    "applicationScenarios": "The applicable scenarios and application areas of the document content",
    "futureTrends": "Prediction of future development trends of the document content",
    "audience": "The target audience of the document",
    "purpose": "The purpose of creating the document"
  }
}

**${contentCategoryEnglish[contentCategory] || 'Copywriting'} Professional Prompt Guidelines:**
${categorySpecificGuidelines[contentCategory] || categorySpecificGuidelines.copywriting}

**Important Requirements:**
1. Carefully read and understand the provided document content, ensuring that the generated reverse prompt is highly relevant to the document content
2. **Absolutely do not use fixed sentence patterns, such as 'a detailed description of XX, including...' or other repetitive expressions**
3. **Remove the fixed phrase 'including'**
4. **Do not copy the original content except for data. Use completely different words to paraphrase all elements of the original text**
5. **Filter out useless data information in the original text, such as detailed dates, advertisements, indexes, etc., and only retain the core content**
6. **The generated reverse prompt must be displayed in both Chinese and English, format: Chinese prompt\nEnglish prompt**
7. **Deeply analyze the core theme, key concepts, and structure of the document, ensuring these elements are fully reflected in the reverse prompt**
8. **Analyze the style, tone, and form of the document, ensuring the reverse prompt can accurately reflect these characteristics**
9. **Identify key technologies, algorithms, or methods in the document (if any), and include these elements in detail in the reverse prompt**
10. **Consider the applicable scenarios and application areas of the document, ensuring the reverse prompt can guide the generation of content suitable for these scenarios**
11. **Deeply analyze the main idea, characteristics, and significance of the document**
12. **Based on the document content, predict the future development trends of the document content**
13. **The generated reverse prompt should be unique and innovative, avoiding repetitive expressions**
14. **The English prompt must be a complete sentence, fully corresponding to the content of the Chinese prompt, not just translating part of the content**
15. **Adjust the level of detail and professionalism in the prompt based on the document's length, complexity, and technical nature**
16. **Use professional industry terminology and expressions to enhance the prompt's professionalism and accuracy**
17. **Ensure the prompt has a clear structure and logical flow for better understanding by AI systems**
18. The generated reverse prompt should follow best practices for ${contentCategoryEnglish[contentCategory] || 'copywriting'} systems and contain sufficient details to guide high-quality content generation
19. Ensure the generated JSON format is correct with no syntax errors`;
    
    const userPrompt = hasChinese ? 
      `请基于以下文档内容生成反向提示词：

${truncatedContent}

**分析要求：**
1. 首先深入分析文档的核心主题和主要内容，理解文档的整体结构和逻辑
2. 识别文档的风格、语气和形式，确保生成的提示词能够准确反映这些特点
3. 提取文档中的关键概念、技术或知识点，确保这些元素在提示词中得到充分体现
4. 分析文档的目标受众和创作目的，确保提示词能够指导生成适合这些目标的内容
5. 考虑文档的适用场景和应用领域，确保提示词能够指导生成适合这些场景的内容
6. 基于以上分析，生成一个高质量、结构化的反向提示词，包含详细的中文提示词和完整的英文对照
7. 确保提示词专业、准确、具体，能够直接用于AI内容生成系统` : 
      `Please generate a reverse prompt based on the following document content:

${truncatedContent}

**Analysis Requirements:**
1. First deeply analyze the core theme and main content of the document, understanding the overall structure and logic of the document
2. Identify the style, tone, and form of the document, ensuring that the generated prompt can accurately reflect these characteristics
3. Extract key concepts, technologies, or knowledge points in the document, ensuring these elements are fully reflected in the prompt
4. Analyze the document's target audience and purpose, ensuring the prompt can guide the generation of content suitable for these targets
5. Consider the applicable scenarios and application areas of the document, ensuring the prompt can guide the generation of content suitable for these scenarios
6. Based on the above analysis, generate a high-quality, structured reverse prompt, including detailed Chinese prompt and complete English translation
7. Ensure the prompt is professional, accurate, and specific, ready for direct use in AI content generation systems`;
    
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o-2024-08-06', // 使用最新的GPT-4o模型版本
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.4, // 优化温度参数，提高生成质量和一致性
          max_tokens: 4000, // 大幅增加最大 tokens，确保生成完整的提示词
          top_p: 0.8, // 优化 top_p 参数，平衡多样性和准确性
          frequency_penalty: 0.15, // 增加频率惩罚，减少重复内容
          presence_penalty: 0.15, // 增加存在惩罚，鼓励新内容
          response_format: { type: 'json_object' }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiApiKey}`
          }
        }
      );
      
      return response.data.choices[0].message.content;
    } catch (error) {
      logger.error('Error calling OpenAI API:', error.response?.data || error.message);
      throw new Error('Failed to generate reverse prompt using OpenAI API');
    }
  }

  /**
   * Generate reverse prompt based on analysis results using OpenAI API with local fallback
   * @param {Object} analysis - Analysis results
   * @param {string} content - Extracted content
   * @param {string} contentCategory - Content category (copywriting, image, video, audio)
   * @returns {Promise<Object>} - Generated reverse prompt and structured details
   */
  /**
   * Clean the final reverse prompt to remove garbled characters and non-text information
   * @param {string} prompt - Reverse prompt to clean
   * @returns {string} - Cleaned reverse prompt
   */
  cleanReversePrompt(prompt) {
    if (!prompt || typeof prompt !== 'string') {
      return '';
    }
    
    return prompt
      // Remove replacement character (�) only
      .replace(/\uFFFD/g, '')
      // Remove C0 control characters only (0x00-0x1F, 0x7F)
      .replace(/[\x00-\x1F\x7F]/g, '')
      // Remove specific problematic control sequences but preserve Unicode
      .replace(/[\u200B-\u200F\u2028-\u202F]/g, '')
      // Remove extra punctuation
      .replace(/([.,;:!])\1+/g, '$1')
      // Remove spaces around punctuation
      .replace(/\s+([.,;:!])/g, '$1')
      .replace(/([.,;:!])\s+/g, '$1 ')
      // Replace multiple whitespace with single space
      .replace(/\s+/g, ' ')
      // Trim whitespace
      .trim();
  }

  async generateReversePrompt(analysis, content, contentCategory = 'copywriting') {
    // Validate input
    if (!content || typeof content !== 'string') {
      throw new Error('Content is required and must be a string');
    }
    
    // Improved Chinese detection - includes Chinese characters and punctuation
    const hasChinese = /[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/.test(content);
    
    try {
      // Try to use Gemini API first with retry mechanism
      const geminiResultJson = await this.callGeminiForReversePromptWithRetry(content, hasChinese, contentCategory);
      const geminiResult = JSON.parse(geminiResultJson);
      
      logger.info('Successfully generated reverse prompt using Gemini API');
      
      // Clean the reverse prompt before returning
      const cleanedReversePrompt = this.cleanReversePrompt(geminiResult.reversePrompt);
      
      // Ensure structured details are in English
      const englishStructuredDetails = this.convertStructuredDetailsToEnglish(geminiResult.structuredDetails);
      
      // Return the result from Gemini
      return {
        reversePrompt: cleanedReversePrompt,
        structuredDetails: englishStructuredDetails,
        analysis: analysis,
        confidence: 'high (95%)',
        generatedBy: 'gemini',
        contentCategory: contentCategory
      };
    } catch (geminiError) {
      logger.warn('Gemini API failed, trying OpenAI API:', geminiError.message);
      
      try {
        // Try OpenAI API as fallback
        const openaiResultJson = await this.callOpenAIForReversePrompt(content, hasChinese, contentCategory);
        const openaiResult = JSON.parse(openaiResultJson);
        
        logger.info('Successfully generated reverse prompt using OpenAI API');
        
        // Clean the reverse prompt before returning
        const cleanedReversePrompt = this.cleanReversePrompt(openaiResult.reversePrompt);
        
        // Ensure structured details are in English
        const englishStructuredDetails = this.convertStructuredDetailsToEnglish(openaiResult.structuredDetails);
        
        // Return the result from OpenAI
        return {
          reversePrompt: cleanedReversePrompt,
          structuredDetails: englishStructuredDetails,
          analysis: analysis,
          confidence: 'high (95%)',
          generatedBy: 'openai',
          contentCategory: contentCategory
        };
      } catch (openaiError) {
        logger.warn('OpenAI API failed, falling back to local generation:', openaiError.message);
        
        // Local fallback generation - generate in the same language as input
        const structuredDetails = this.generateLocalStructuredDetails(analysis, hasChinese, contentCategory);
        const reversePrompt = hasChinese ? 
          this.generateMainPromptChinese(structuredDetails, contentCategory) : 
          this.generateMainPrompt(structuredDetails, contentCategory);
        
        // Clean the reverse prompt before evaluation
        const cleanedReversePrompt = this.cleanReversePrompt(reversePrompt);
        
        // Evaluate prompt quality
        const qualityEvaluation = this.evaluatePromptQuality(cleanedReversePrompt, structuredDetails, hasChinese);
        
        logger.info(`Successfully generated reverse prompt using local fallback with quality score: ${qualityEvaluation.score}`);
        
        // Return the locally generated result with quality evaluation
        let englishPrompt = hasChinese ? this.translateToEnglish(cleanedReversePrompt) : cleanedReversePrompt;
        let chinesePrompt = hasChinese ? cleanedReversePrompt : this.translateToChinese(cleanedReversePrompt);
        
        const sourceLanguage = hasChinese ? 'chinese' : 'english';
        const processed = qualityService.processPrompts(englishPrompt, chinesePrompt, sourceLanguage);
        
        englishPrompt = processed.englishPrompt;
        chinesePrompt = processed.chinesePrompt;
        
        if (processed.englishIssues.length > 0) {
          logger.warn('English prompt quality issues:', processed.englishIssues);
        }
        if (processed.chineseIssues.length > 0) {
          logger.warn('Chinese prompt quality issues:', processed.chineseIssues);
        }
        
        const qualityReport = qualityService.generateQualityReport(englishPrompt, chinesePrompt);
        
        return {
          reversePrompt: cleanedReversePrompt,
          englishPrompt: englishPrompt,
          chinesePrompt: chinesePrompt,
          structuredDetails: structuredDetails,
          analysis: analysis,
          confidence: `medium (${Math.round(qualityEvaluation.score)}%)`,
          generatedBy: 'local',
          contentCategory: contentCategory,
          qualityEvaluation: qualityEvaluation,
          qualityReport: qualityReport,
          sourceLanguage: sourceLanguage
        };
      }
    }
  }
  
  /**
   * Convert structured details to English
   * @param {Object} structuredDetails - Structured details object
   * @returns {Object} - English structured details
   */
  convertStructuredDetailsToEnglish(structuredDetails) {
    if (!structuredDetails) {
      return {};
    }
    
    const englishDetails = {};
    
    // Process each field and ensure it's in English
    for (const [key, value] of Object.entries(structuredDetails)) {
      if (typeof value === 'string') {
        // Remove Chinese characters and clean the string
        englishDetails[key] = this.removeChineseCharacters(value).trim() || 'Not specified';
      } else if (Array.isArray(value)) {
        // Process arrays
        englishDetails[key] = value.map(item => 
          typeof item === 'string' ? this.removeChineseCharacters(item).trim() : item
        ).filter(item => item);
      } else if (typeof value === 'object') {
        // Recursively process objects
        englishDetails[key] = this.convertStructuredDetailsToEnglish(value);
      } else {
        // Keep other types as is
        englishDetails[key] = value;
      }
    }
    
    return englishDetails;
  }
  
  /**
   * Remove Chinese characters from text
   * @param {string} text - Text to process
   * @returns {string} - Text without Chinese characters
   */
  removeChineseCharacters(text) {
    if (!text) {
      return '';
    }
    // Remove all Chinese characters AND Chinese punctuation
    return text.replace(/[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/g, '').replace(/\s+/g, ' ').trim();
  }
  
  /**
   * Check if content is meaningful (not just numbers, symbols, or dates)
   * @param {string} content - Content to check
   * @returns {boolean} - Whether the content is meaningful
   */
  isMeaningfulContent(content) {
    if (!content || typeof content !== 'string') {
      return false;
    }
    
    const trimmedContent = content.trim();
    
    // Check if content is empty after trimming
    if (trimmedContent.length === 0) {
      return false;
    }
    
    // Check if content is just numbers
    if (/^\d+$/.test(trimmedContent)) {
      return false;
    }
    
    // Check if content is just symbols
    if (/^[\s\p{P}\p{S}]+$/u.test(trimmedContent)) {
      return false;
    }
    
    // Check if content is a date (YYYY-MM-DD, YYYYMM, etc.)
    if (/^\d{4}[-/]?\d{1,2}[-/]?\d{1,2}$/.test(trimmedContent)) {
      return false;
    }
    
    // Check if content is a time (HH:MM, HH:MM:SS)
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(trimmedContent)) {
      return false;
    }
    
    // Check if content is too short (less than 2 characters)
    if (trimmedContent.length < 2) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Generate structured details locally as fallback
   * @param {Object} analysis - Analysis results
   * @param {boolean} hasChinese - Whether the text contains Chinese characters
   * @param {string} contentCategory - Content category (copywriting, image, video, audio)
   * @returns {Object} - Structured details
   */
  generateLocalStructuredDetails(analysis, hasChinese, contentCategory = 'copywriting') {
    try {
      // Validate input
      if (!analysis) {
        throw new Error('Analysis object is required');
      }
      
      // Extract unique keywords and phrases with fallbacks
      const keywords = analysis.keywords || [];
      const keyPhrases = analysis.keyPhrases || [];
      const uniqueKeywords = [...new Set(keywords.slice(0, 15))];
      const uniquePhrases = [...new Set(keyPhrases.slice(0, 10))];
      
      // Use core ideas if available, with fallback
      const coreIdeas = analysis.coreIdeas && analysis.coreIdeas.length > 0 ? analysis.coreIdeas : uniquePhrases.length > 0 ? uniquePhrases : [hasChinese ? '文档内容' : 'document content'];
      
      // Process keywords and phrases - preserve Chinese if input is Chinese
      let processedKeywords = uniqueKeywords
        .map(keyword => hasChinese ? keyword : this.removeChineseCharacters(keyword))
        .filter(keyword => this.isMeaningfulContent(keyword));
      
      let processedPhrases = uniquePhrases
        .map(phrase => hasChinese ? phrase : this.removeChineseCharacters(phrase))
        .filter(phrase => this.isMeaningfulContent(phrase));
      
      let processedCoreIdeas = coreIdeas
        .map(idea => hasChinese ? idea : this.removeChineseCharacters(idea))
        .filter(idea => this.isMeaningfulContent(idea));
      
      // Generate basic structure with error handling
      let enhancedDescription;
      try {
        // Generate enhanced description in the same language as input
        enhancedDescription = this.generateEnhancedDescription(analysis, hasChinese, contentCategory);
      } catch (error) {
        logger.warn('Error generating enhanced description:', error.message);
        enhancedDescription = hasChinese ? '文档内容的详细描述' : 'Detailed description of document content';
      }
      
      const basicStructure = {
        singleWords: processedKeywords.length > 0 ? processedKeywords.slice(0, 8).join(hasChinese ? '、' : ', ') : (hasChinese ? '文档' : 'document'),
        phrasePrompts: processedCoreIdeas.length > 0 ? processedCoreIdeas.slice(0, 4).join(hasChinese ? '、' : ', ') : (hasChinese ? '文档内容' : 'document content'),
        completeSentences: enhancedDescription
      };
      
      // Generate application structure with fallback for style
      const style = analysis.style || 'informative';
      const applicationStructure = {
        copywritingStyle: hasChinese ? this.getChineseCopywritingStyle(style) : this.getEnglishCopywritingStyle(style)
      };
      
      // Generate functional elements with fallbacks
      const themes = analysis.themes || processedKeywords;
      let processedThemes = themes.map(theme => hasChinese ? theme : this.removeChineseCharacters(theme));
      
      const functionalElements = {
        subject: processedThemes.length > 0 ? processedThemes.slice(0, 3).join(hasChinese ? '、' : ', ') : (hasChinese ? '文档主题' : 'document topic'),
        style: this.getStyleDescription(style, hasChinese),
        sceneAction: hasChinese ? '详细描述' : 'detailed description',
        details: hasChinese ? this.getChinesePositivePrompts(style) : this.getPositivePrompts(style)
      };
      
      // Generate positive and negative prompts
      const positiveNegative = {
        positive: hasChinese ? this.getChinesePositivePrompts(style) : this.getPositivePrompts(style),
        negative: hasChinese ? this.getChineseNegativePrompts() : this.getNegativePrompts()
      };
      
      // Deep analysis: Extract key technologies and technical terms
      const keyTechnologies = this.extractKeyTechnologies(processedKeywords, hasChinese);
      
      // Deep analysis: Analyze document structure in detail
      const detailedStructureAnalysis = this.analyzeDocumentStructureInDetail(analysis.documentStructure, hasChinese);
      
      // Deep analysis: Analyze logical flow patterns
      const logicalFlowAnalysis = this.analyzeLogicalFlowPatterns(analysis.logicalFlow, hasChinese);
      
      // Deep analysis: Determine target audience
      const targetAudience = this.determineTargetAudience(analysis, hasChinese);
      
      // Deep analysis: Predict future trends
      const futureTrends = this.predictFutureTrends(analysis, hasChinese);
      
      // Deep analysis: Extract application scenarios
      const applicationScenarios = this.extractApplicationScenarios(analysis, hasChinese);
      
      // Generate aggregated prompt that combines all structured details logically
      let aggregatedPrompt;
      try {
        aggregatedPrompt = this.generateAggregatedPrompt(basicStructure, applicationStructure, functionalElements, positiveNegative, hasChinese, contentCategory);
      } catch (error) {
        logger.warn('Error generating aggregated prompt:', error.message);
        aggregatedPrompt = hasChinese ? 
          `关于${functionalElements.subject}的详细描述，采用${functionalElements.style}风格` : 
          `Detailed description of ${functionalElements.subject} with ${functionalElements.style} style`;
      }
      
      // Add document structure and logical flow if available
      const documentStructure = analysis.documentStructure || {};
      const logicalFlow = analysis.logicalFlow || {};
      
      return {
        basicStructure,
        applicationStructure,
        functionalElements,
        positiveNegative,
        aggregatedPrompt, // Add aggregated prompt to the structured details
        documentStructure,
        logicalFlow,
        coreIdeas: processedCoreIdeas,
        // Deep analysis additions
        keyTechnologies,
        detailedStructureAnalysis,
        logicalFlowAnalysis,
        targetAudience,
        futureTrends,
        applicationScenarios
      };
    } catch (error) {
      logger.error('Error in local structured details generation:', error.message);
      // Return a fallback structure if everything fails
      return {
        basicStructure: {
          singleWords: 'document',
          phrasePrompts: 'document content',
          completeSentences: 'Detailed description of document content'
        },
        applicationStructure: {
          copywritingStyle: 'professional, detailed, clear'
        },
        functionalElements: {
          subject: 'document topic',
          style: 'professional',
          sceneAction: 'detailed description',
          details: 'high-quality, well-structured, detailed'
        },
        positiveNegative: {
          positive: 'high-quality, well-structured, detailed',
          negative: 'low quality, poorly structured'
        },
        aggregatedPrompt: 'Detailed description of document topic with professional style',
        documentStructure: {},
        logicalFlow: {},
        coreIdeas: ['document content'],
        // Deep analysis fallbacks
        keyTechnologies: [],
        detailedStructureAnalysis: {},
        logicalFlowAnalysis: {},
        targetAudience: 'professionals',
        futureTrends: 'future trends',
        applicationScenarios: 'relevant application scenarios'
      };
    }
  }
  
  /**
   * Generate aggregated prompt that combines all structured details logically
   * @param {Object} basicStructure - Basic structure details
   * @param {Object} applicationStructure - Application structure details
   * @param {Object} functionalElements - Functional elements details
   * @param {Object} positiveNegative - Positive and negative prompts
   * @param {boolean} hasChinese - Whether the text contains Chinese characters
   * @param {string} contentCategory - Content category (copywriting, image, video, audio)
   * @returns {string} - Aggregated prompt
   */
  generateAggregatedPrompt(basicStructure, applicationStructure, functionalElements, positiveNegative, hasChinese, contentCategory = 'copywriting') {
    // 增加多样性的表达模板
    const chineseTemplates = [
      `${basicStructure.completeSentences}，采用${functionalElements.style}风格，${applicationStructure.copywritingStyle}，详细描述${functionalElements.subject}，${functionalElements.sceneAction}，包含以下关键词：${basicStructure.singleWords}，以及以下短语：${basicStructure.phrasePrompts}，突出${functionalElements.details}，避免${positiveNegative.negative}`,
      `${functionalElements.subject}的专业描述，采用${functionalElements.style}风格，${applicationStructure.copywritingStyle}，${functionalElements.sceneAction}，涵盖${basicStructure.singleWords}等关键词和${basicStructure.phrasePrompts}等短语，强调${functionalElements.details}，避免${positiveNegative.negative}，${basicStructure.completeSentences}`,
      `以${functionalElements.style}风格详细描述${functionalElements.subject}，${applicationStructure.copywritingStyle}，${functionalElements.sceneAction}，包含${basicStructure.singleWords}等核心关键词和${basicStructure.phrasePrompts}等重要短语，突出${functionalElements.details}，避免${positiveNegative.negative}，${basicStructure.completeSentences}`
    ];
    
    const englishTemplates = [
      `${basicStructure.completeSentences}, featuring a ${functionalElements.style} style with ${applicationStructure.copywritingStyle} writing approach. This detailed description of ${functionalElements.subject} provides ${functionalElements.sceneAction}, including keywords such as ${basicStructure.singleWords}, and phrases like ${basicStructure.phrasePrompts}. It emphasizes ${functionalElements.details} while avoiding ${positiveNegative.negative}.`,
      `Professional description of ${functionalElements.subject} with ${functionalElements.style} style and ${applicationStructure.copywritingStyle} approach. This ${functionalElements.sceneAction} includes keywords like ${basicStructure.singleWords} and phrases such as ${basicStructure.phrasePrompts}, emphasizing ${functionalElements.details} and avoiding ${positiveNegative.negative}. ${basicStructure.completeSentences}`,
      `Detailed description of ${functionalElements.subject} in ${functionalElements.style} style, using ${applicationStructure.copywritingStyle} approach. This ${functionalElements.sceneAction} incorporates core keywords including ${basicStructure.singleWords} and important phrases such as ${basicStructure.phrasePrompts}, highlighting ${functionalElements.details} while avoiding ${positiveNegative.negative}. ${basicStructure.completeSentences}`
    ];
    
    // 随机选择一个模板以增加多样性
    const templates = hasChinese ? chineseTemplates : englishTemplates;
    const randomIndex = Math.floor(Math.random() * templates.length);
    
    return templates[randomIndex];
  }

  /**
   * Extract core topic from content
   * @param {string} content - Text content
   * @param {Array} keywords - Extracted keywords
   * @param {boolean} hasChinese - Whether the text contains Chinese characters
   * @returns {string} - Core topic
   */
  extractCoreTopic(content, keywords, hasChinese) {
    // Validate input parameters
    const contentStr = typeof content === 'string' && content ? content : '';
    
    // Look for title-like patterns at the beginning
    const firstLines = contentStr.split(/[\n\r]+/).slice(0, 5);
    
    for (const line of firstLines) {
      const trimmedLine = line.trim();
      if (trimmedLine.length > 10 && trimmedLine.length < 100) {
        // Check if it looks like a title
        if (trimmedLine.startsWith('#') || /[\u4e00-\u9fa5]+[\u7684][\u4e00-\u9fa5]+/.test(trimmedLine)) {
          // Remove markdown title symbols
          let title = trimmedLine.replace(/^#+\s*/, '');
          // Remove Chinese characters for English prompts
          if (!hasChinese) {
            title = this.removeChineseCharacters(title);
          }
          return title;
        }
      }
    }
    
    // Fallback to using the top themes
    if (Array.isArray(keywords) && keywords.length > 0 && typeof keywords[0] === 'string') {
      let keyword = keywords[0];
      // Remove Chinese characters for English prompts
      if (!hasChinese) {
        keyword = this.removeChineseCharacters(keyword);
      }
      return keyword;
    } else {
      return hasChinese ? '文档主题' : 'Document topic';
    }
  }

  /**
   * Generate contextual reverse prompt
   * @param {Object} structuredDetails - Structured details
   * @param {boolean} hasChinese - Whether the text contains Chinese characters
   * @param {Array} keyTechnologies - Key technologies/algorithms
   * @returns {string} - Contextual reverse prompt
   */
  generateContextualPrompt(structuredDetails, hasChinese, keyTechnologies) {
    const { basicStructure, functionalElements } = structuredDetails;
    
    if (hasChinese) {
      // Chinese prompt generation
      if (keyTechnologies.length > 0) {
        return `${basicStructure.completeSentences}，采用${functionalElements.style}风格，${functionalElements.sceneAction}，详细介绍${keyTechnologies.join('、')}等算法的原理、优缺点和应用场景`;
      } else {
        return `${basicStructure.completeSentences}，采用${functionalElements.style}风格，${functionalElements.sceneAction}`;
      }
    } else {
      // English prompt generation - simplified and improved structure
      const parts = [basicStructure.completeSentences];
      
      // Add style
      if (functionalElements.style) {
        parts.push(`with ${functionalElements.style} style`);
      }
      
      // Add scene/action (excluding duplicate content)
      if (functionalElements.sceneAction) {
        parts.push(functionalElements.sceneAction);
      }
      
      // Add algorithm details if we have key technologies
      if (keyTechnologies.length > 0) {
        parts.push(`including detailed explanation of algorithms like ${keyTechnologies.join(', ')} covering principles, advantages, and applications`);
      }
      
      // Join all parts into a coherent sentence
      return parts.join(', ');
    }
  }

  /**
   * Get copywriting style description based on style type
   * @param {string} style - Style type
   * @returns {string} - Copywriting style description
   */
  getCopywritingStyle(style) {
    const styleMap = {
      technical: '专业、详细、准确、技术性强',
      formal: '正式、严谨、条理清晰、逻辑性强',
      creative: '创意、生动、富有想象力、独特',
      concise: '简洁、明了、重点突出、言简意赅',
      informative: '信息丰富、内容全面、详细、有教育意义'
    };
    return styleMap[style] || '专业、详细、清晰';
  }

  /**
   * Get style description
   * @param {string} style - Style type
   * @param {boolean} hasChinese - Whether the text contains Chinese characters
   * @returns {string} - Style description
   */
  getStyleDescription(style, hasChinese) {
    if (hasChinese) {
      const styleMap = {
        technical: '技术性、专业性',
        formal: '正式、严谨',
        creative: '创意、生动',
        concise: '简洁、明了',
        informative: '信息丰富、教育性'
      };
      return styleMap[style] || '专业、详细';
    } else {
      const styleMap = {
        technical: 'technical',
        formal: 'formal',
        creative: 'creative',
        concise: 'concise',
        informative: 'informative'
      };
      return styleMap[style] || 'professional';
    }
  }

  /**
   * Get English copywriting style description based on style type
   * @param {string} style - Style type
   * @returns {string} - English copywriting style description
   */
  getEnglishCopywritingStyle(style) {
    const styleMap = {
      technical: 'professional, detailed, accurate, technically precise',
      formal: 'formal, rigorous, clear, logical',
      creative: 'creative, vivid, imaginative, unique',
      concise: 'concise, clear, focused, efficient',
      informative: 'informative, comprehensive, detailed, educational'
    };
    return styleMap[style] || 'professional, detailed, clear';
  }

  /**
   * Get Chinese copywriting style description
   * @param {string} style - Style type
   * @returns {string} - Chinese copywriting style
   */
  getChineseCopywritingStyle(style) {
    const styleMap = {
      technical: '专业、详细、准确、技术精确',
      formal: '正式、严谨、清晰、逻辑',
      creative: '创意、生动、富有想象力、独特',
      concise: '简洁、清晰、重点突出、高效',
      informative: '信息丰富、全面、详细、有教育意义'
    };
    return styleMap[style] || '专业、详细、清晰';
  }

  /**
   * Get positive prompts based on style
   * @param {string} style - Style type
   * @returns {string} - Positive prompts
   */
  getPositivePrompts(style) {
    const basePrompts = 'high-quality, well-structured, detailed, clear, professional';
    const stylePrompts = {
      technical: 'accurate, technically precise, well-researched',
      formal: 'formal, logical, coherent, well-organized',
      creative: 'creative, original, imaginative, engaging',
      concise: 'concise, focused, to the point, efficient',
      informative: 'informative, educational, comprehensive, detailed'
    };
    return `${basePrompts}, ${stylePrompts[style] || 'well-written'}`;
  }

  /**
   * Get Chinese positive prompts based on style
   * @param {string} style - Style type
   * @returns {string} - Chinese positive prompts
   */
  getChinesePositivePrompts(style) {
    const basePrompts = '高质量、结构清晰、内容详细、表达明确、专业规范';
    const stylePrompts = {
      technical: '准确无误、技术精确、研究深入',
      formal: '正式严谨、逻辑连贯、组织有序',
      creative: '创意独特、生动形象、富有想象力、引人入胜',
      concise: '简洁明了、重点突出、直击主题、高效表达',
      informative: '信息丰富、有教育意义、内容全面、详细具体'
    };
    return `${basePrompts}、${stylePrompts[style] || '表达流畅'}`;
  }

  /**
   * Get negative prompts
   * @returns {string} - Negative prompts
   */
  getNegativePrompts() {
    return 'low quality, poorly structured, unclear, unprofessional, inaccurate, incomplete, confusing, disorganized';
  }

  /**
   * Get Chinese negative prompts
   * @returns {string} - Chinese negative prompts
   */
  getChineseNegativePrompts() {
    return '低质量、结构混乱、表达不清、不专业、不准确、不完整、混乱、无组织';
  }
  
  /**
   * Get Chinese positive prompts based on style
   * @param {string} style - Style type
   * @returns {string} - Chinese positive prompts
   */
  getPositivePromptsChinese(style) {
    const basePrompts = '高质量，结构清晰，内容详细，表达明确，专业规范';
    const stylePrompts = {
      technical: '准确无误，技术精确，研究深入，数据可靠',
      formal: '正式严谨，条理清晰，逻辑连贯，组织有序',
      creative: '创意独特，生动形象，富有想象力，引人入胜',
      concise: '简洁明了，重点突出，直击主题，高效表达',
      informative: '信息丰富，内容全面，详细具体，有教育意义'
    };
    return `${basePrompts}，${stylePrompts[style] || '表达流畅'}`;
  }
  
  /**
   * Get Chinese negative prompts
   * @returns {string} - Chinese negative prompts
   */
  getNegativePromptsChinese() {
    return '低质量，结构混乱，内容模糊，表达不专业，不准确，不完整，令人困惑，杂乱无章';
  }
  
  /**
   * Generate Chinese main reverse prompt
   * @param {Object} structuredDetails - Structured details
   * @returns {string} - Chinese main reverse prompt
   */
  generateMainPromptChinese(structuredDetails, contentCategory = 'copywriting') {
    const { functionalElements, applicationStructure, basicStructure, keyTechnologies, targetAudience, applicationScenarios, futureTrends, aggregatedPrompt, coreIdeas } = structuredDetails;
    
    // 优先使用 aggregatedPrompt 作为提示词的基础
    if (aggregatedPrompt) {
      // 检查 aggregatedPrompt 是否已经包含中英文对照
      if (aggregatedPrompt.includes('\n')) {
        return aggregatedPrompt;
      }
      // 如果只有中文，生成对应的英文
      const chinesePrompt = aggregatedPrompt;
      
      // 生成英文提示词
      const englishSubject = functionalElements.subject.replace(/、/g, ', ');
      const englishStyle = functionalElements.style.replace(/、/g, ', ');
      const englishCopywritingStyle = this.translateToEnglish(applicationStructure.copywritingStyle);
      const englishSceneAction = this.translateToEnglish(functionalElements.sceneAction);
      const englishDetails = this.translateToEnglish(functionalElements.details);
      const englishKeyTechnologies = keyTechnologies && keyTechnologies.length > 0 ? keyTechnologies.join(', ') : '';
      const englishTargetAudience = this.translateToEnglish(targetAudience);
      const englishApplicationScenarios = this.translateToEnglish(applicationScenarios);
      const englishFutureTrends = this.translateToEnglish(futureTrends);
      
      // 构建英文提示词组件，确保生成完整的英文句子
      let englishPromptComponents = [];
      
      // 确保subject不为空
      const safeEnglishSubject = englishSubject || 'document content';
      englishPromptComponents.push(`Professional description of ${safeEnglishSubject}`);
      
      // 确保style不为空
      const safeEnglishStyle = englishStyle || 'professional';
      englishPromptComponents.push(`featuring a ${safeEnglishStyle} style`);
      
      // 确保copywritingStyle不为空
      const safeEnglishCopywritingStyle = englishCopywritingStyle || 'professional';
      englishPromptComponents.push(`with ${safeEnglishCopywritingStyle} writing approach`);
      
      // 确保sceneAction不为空
      const safeEnglishSceneAction = englishSceneAction || 'detailed description';
      englishPromptComponents.push(`providing ${safeEnglishSceneAction}`);
      
      if (englishKeyTechnologies) {
        englishPromptComponents.push(`including professional terms such as ${englishKeyTechnologies}`);
      }
      
      if (englishTargetAudience) {
        englishPromptComponents.push(`targeted at ${englishTargetAudience}`);
      }
      
      if (englishApplicationScenarios) {
        englishPromptComponents.push(`suitable for ${englishApplicationScenarios}`);
      }
      
      if (englishFutureTrends) {
        englishPromptComponents.push(`focusing on ${englishFutureTrends}`);
      }
      
      // 确保details不为空
      const safeEnglishDetails = englishDetails || 'high-quality content';
      englishPromptComponents.push(`emphasizing ${safeEnglishDetails}`);
      
      // 生成更自然的英文表达
      const englishPrompt = englishPromptComponents.join(', ') + '.';
      
      return `${chinesePrompt}\n${englishPrompt}`;
    }
    
    // 如果没有 aggregatedPrompt，使用传统方式生成
    // 构建提示词组件，确保逻辑连贯
    let promptComponents = [];
    
    // 核心主题
    const safeSubject = functionalElements.subject || '文档内容';
    promptComponents.push(`关于${safeSubject}的专业描述`);
    
    // 风格和写作方式
    const safeStyle = functionalElements.style || '专业';
    promptComponents.push(`采用${safeStyle}风格`);
    
    const safeCopywritingStyle = applicationStructure.copywritingStyle || '专业、详细、清晰';
    // 翻译英文copywritingStyle为中文
    const chineseCopywritingStyle = this.translateToChinese(safeCopywritingStyle);
    promptComponents.push(`${chineseCopywritingStyle}`);
    
    // 详细描述要求
    const safeSceneAction = functionalElements.sceneAction || '详细描述';
    // 翻译英文sceneAction为中文
    const chineseSceneAction = this.translateToChinese(safeSceneAction);
    promptComponents.push(`${chineseSceneAction}`);
    
    // 专业术语和关键技术
    if (keyTechnologies && keyTechnologies.length > 0) {
      promptComponents.push(`包含${keyTechnologies.join('、')}等专业术语`);
    }
    
    // 目标受众
    const safeTargetAudience = targetAudience || 'professionals';
    // 翻译英文targetAudience为中文
    const chineseTargetAudience = this.translateToChinese(safeTargetAudience);
    promptComponents.push(`面向${chineseTargetAudience}`);
    
    // 应用场景
    const safeApplicationScenarios = applicationScenarios || 'relevant application scenarios';
    // 翻译英文applicationScenarios为中文
    const chineseApplicationScenarios = this.translateToChinese(safeApplicationScenarios);
    promptComponents.push(`适用于${chineseApplicationScenarios}`);
    
    // 未来趋势
    const safeFutureTrends = futureTrends || 'future trends';
    // 翻译英文futureTrends为中文
    const chineseFutureTrends = this.translateToChinese(safeFutureTrends);
    if (chineseFutureTrends && chineseFutureTrends !== '未来趋势') {
      promptComponents.push(`关注${chineseFutureTrends}`);
    }
    
    // 核心思想
    if (coreIdeas && coreIdeas.length > 0) {
      // 翻译英文coreIdeas为中文
      const chineseCoreIdeas = coreIdeas.slice(0, 2).map(idea => this.translateToChinese(idea)).join('；');
      promptComponents.push(`核心思想包括${chineseCoreIdeas}`);
    }
    
    // 质量要求
    const safeDetails = functionalElements.details || 'high-quality, well-structured, detailed';
    // 翻译英文details为中文
    const chineseDetails = this.translateToChinese(safeDetails);
    promptComponents.push(`突出${chineseDetails}`);
    
    // 确保中文提示词中不包含英文，并且逻辑完整
    const chinesePrompt = promptComponents.join('，');
    
    // 生成对应的英文提示词
    // 确保英文提示词与中文提示词内容完整对应
    const englishSubject = safeSubject.replace(/、/g, ', ');
    const englishStyle = safeStyle.replace(/、/g, ', ');
    const englishCopywritingStyle = this.translateToEnglish(chineseCopywritingStyle);
    const englishSceneAction = this.translateToEnglish(chineseSceneAction);
    const englishDetails = this.translateToEnglish(chineseDetails);
    const englishKeyTechnologies = keyTechnologies && keyTechnologies.length > 0 ? keyTechnologies.join(', ') : '';
    const englishTargetAudience = this.translateToEnglish(chineseTargetAudience);
    const englishApplicationScenarios = this.translateToEnglish(chineseApplicationScenarios);
    const englishFutureTrends = this.translateToEnglish(chineseFutureTrends);
    
    // 构建英文提示词组件，确保生成完整的英文句子
    let englishPromptComponents = [];
    englishPromptComponents.push(`Professional description of ${englishSubject}`);
    englishPromptComponents.push(`featuring a ${englishStyle} style`);
    englishPromptComponents.push(`with ${englishCopywritingStyle} writing approach`);
    englishPromptComponents.push(`providing ${englishSceneAction}`);
    
    if (englishKeyTechnologies) {
      englishPromptComponents.push(`including professional terms such as ${englishKeyTechnologies}`);
    }
    
    if (englishTargetAudience) {
      englishPromptComponents.push(`targeted at ${englishTargetAudience}`);
    }
    
    if (englishApplicationScenarios) {
      englishPromptComponents.push(`suitable for ${englishApplicationScenarios}`);
    }
    
    if (englishFutureTrends && englishFutureTrends !== 'future trends') {
      englishPromptComponents.push(`focusing on ${englishFutureTrends}`);
    }
    
    // 核心思想的英文翻译
    if (coreIdeas && coreIdeas.length > 0) {
      const englishCoreIdeas = coreIdeas.slice(0, 2).map(idea => this.translateToEnglish(idea)).join('. ');
      if (englishCoreIdeas) {
        englishPromptComponents.push(`with core ideas including ${englishCoreIdeas}`);
      }
    }
    
    englishPromptComponents.push(`emphasizing ${englishDetails}`);
    
    // 生成更自然的英文表达
    const englishPrompt = englishPromptComponents.join(', ') + '.';
    
    return `${chinesePrompt}\n${englishPrompt}`;
  }

  /**
   * Generate main reverse prompt
   * @param {Object} structuredDetails - Structured details
   * @returns {string} - Main reverse prompt
   */
  generateMainPrompt(structuredDetails, contentCategory = 'copywriting') {
    const { applicationStructure, functionalElements, keyTechnologies, targetAudience, applicationScenarios, futureTrends, coreIdeas } = structuredDetails;
    
    const safeSubject = functionalElements.subject || 'document content';
    const safeStyle = functionalElements.style || 'professional';
    const safeCopywritingStyle = applicationStructure.copywritingStyle || 'professional, detailed, clear';
    const safeSceneAction = functionalElements.sceneAction || 'detailed description';
    const safeDetails = functionalElements.details || 'high-quality, well-structured, detailed';
    const safeTargetAudience = targetAudience || 'professionals';
    const safeApplicationScenarios = applicationScenarios || 'relevant application scenarios';
    const safeFutureTrends = futureTrends || 'future trends';
    
    const categoryMap = {
      copywriting: 'copywriting',
      image: 'image',
      video: 'video',
      audio: 'audio'
    };
    const englishCategory = categoryMap[contentCategory] || 'content';
    
    let englishPromptParts = [];
    
    englishPromptParts.push(`Create a ${safeStyle} ${englishCategory} about ${safeSubject}`);
    englishPromptParts.push(`using ${safeCopywritingStyle}`);
    englishPromptParts.push(`that provides ${safeSceneAction}`);
    
    if (keyTechnologies && keyTechnologies.length > 0) {
      const techTerms = keyTechnologies.slice(0, 3).join(', ');
      englishPromptParts.push(`including professional terms: ${techTerms}`);
    }
    
    englishPromptParts.push(`for ${safeTargetAudience}`);
    englishPromptParts.push(`suitable for ${safeApplicationScenarios}`);
    
    if (safeFutureTrends && safeFutureTrends !== 'future trends') {
      englishPromptParts.push(`focusing on ${safeFutureTrends}`);
    }
    
    if (coreIdeas && coreIdeas.length > 0) {
      const coreTerms = coreIdeas.slice(0, 2).join(', ');
      englishPromptParts.push(`highlighting key concepts: ${coreTerms}`);
    }
    
    englishPromptParts.push(`with emphasis on ${safeDetails}`);
    
    let englishPrompt = englishPromptParts.join('. ');
    if (!englishPrompt.endsWith('.')) {
      englishPrompt += '.';
    }
    
    const chineseCategoryMap = {
      copywriting: '文案',
      image: '图片',
      video: '视频',
      audio: '音频'
    };
    const chineseCategory = chineseCategoryMap[contentCategory] || '内容';
    
    const chineseSubject = this.translateToChinese(safeSubject);
    const chineseStyle = this.translateToChinese(safeStyle);
    const chineseCopywritingStyle = this.translateToChinese(safeCopywritingStyle);
    const chineseSceneAction = this.translateToChinese(safeSceneAction);
    const chineseDetails = this.translateToChinese(safeDetails);
    const chineseKeyTechnologies = keyTechnologies && keyTechnologies.length > 0 ? 
      keyTechnologies.slice(0, 3).map(t => this.translateToChinese(t)).join('、') : '';
    const chineseTargetAudience = this.translateToChinese(safeTargetAudience);
    const chineseApplicationScenarios = this.translateToChinese(safeApplicationScenarios);
    const chineseFutureTrends = this.translateToChinese(safeFutureTrends);
    
    let chinesePromptParts = [];
    
    chinesePromptParts.push(`创建关于${chineseSubject}的${chineseStyle}风格${chineseCategory}`);
    chinesePromptParts.push(`采用${chineseCopywritingStyle}的写作方式`);
    chinesePromptParts.push(`提供${chineseSceneAction}`);
    
    if (chineseKeyTechnologies) {
      chinesePromptParts.push(`包含专业术语：${chineseKeyTechnologies}`);
    }
    
    chinesePromptParts.push(`面向${chineseTargetAudience}`);
    chinesePromptParts.push(`适用于${chineseApplicationScenarios}`);
    
    if (chineseFutureTrends && chineseFutureTrends !== '未来趋势') {
      chinesePromptParts.push(`关注${chineseFutureTrends}`);
    }
    
    if (coreIdeas && coreIdeas.length > 0) {
      const chineseCoreTerms = coreIdeas.slice(0, 2).map(t => this.translateToChinese(t)).join('、');
      chinesePromptParts.push(`突出核心概念：${chineseCoreTerms}`);
    }
    
    chinesePromptParts.push(`强调${chineseDetails}`);
    
    let chinesePrompt = chinesePromptParts.join('。');
    if (!chinesePrompt.endsWith('。')) {
      chinesePrompt += '。';
    }
    
    return `${chinesePrompt}\n${englishPrompt}`;
  }

  /**
   * Translate Chinese text to English
   * @param {string} text - Chinese text
   * @returns {string} - English translation
   */
  translateToEnglish(text) {
    if (!text) return 'professional content';
    
    let translated = text;
    
    // Check if text contains Chinese characters OR Chinese punctuation
    const hasChinese = /[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/.test(translated);
    
    if (!hasChinese) {
      // If no Chinese, return as is but clean up
      // First, replace Chinese punctuation with English equivalents
      const cleaned = translated
        .replace(/，/g, ', ')
        .replace(/。/g, '. ')
        .replace(/、/g, ', ')
        .replace(/；/g, '; ')
        .replace(/：/g, ': ')
        .replace(/"/g, '" ')
        .replace(/"/g, '" ')
        .replace(/'/g, "' ")
        .replace(/'/g, "' ")
        .replace(/（/g, ' (')
        .replace(/）/g, ') ')
        .replace(/\s+/g, ' ')
        .trim();
      
      // Ensure the result is not just numbers, symbols and punctuation
      if (/^[0-9\s\p{P}\p{S}]+$/u.test(cleaned) || !cleaned) {
        return 'professional content';
      }
      
      // Clean up any remaining issues
      return cleaned.replace(/^[\s\p{P}\p{S}]+|[\s\p{P}\p{S}]+$/gu, '').trim() || 'professional content';
    }
    
    // Enhanced translation map for common terms and professional jargon
    // Sort by length (longest first) to avoid partial replacements
    const translationMap = [
      ['高质量', 'high quality'],
      ['结构清晰', 'well-structured'],
      ['内容详细', 'detailed content'],
      ['表达明确', 'clear expression'],
      ['专业规范', 'professional and standardized'],
      ['准确无误', 'accurate'],
      ['技术精确', 'technically precise'],
      ['研究深入', 'in-depth research'],
      ['数据可靠', 'reliable data'],
      ['正式严谨', 'formal and rigorous'],
      ['条理清晰', 'clear and logical'],
      ['逻辑连贯', 'coherent logic'],
      ['组织有序', 'well-organized'],
      ['创意独特', 'unique creativity'],
      ['生动形象', 'vivid and descriptive'],
      ['富有想象力', 'imaginative'],
      ['引人入胜', 'engaging'],
      ['简洁明了', 'concise and clear'],
      ['重点突出', 'highlighted key points'],
      ['直击主题', 'straight to the point'],
      ['高效表达', 'efficient expression'],
      ['信息丰富', 'informative'],
      ['内容全面', 'comprehensive'],
      ['详细具体', 'detailed and specific'],
      ['有教育意义', 'educational'],
      ['详细描述', 'detailed description'],
      ['技术性、专业性', 'technical, professional'],
      ['正式、严谨', 'formal, rigorous'],
      ['创意、生动', 'creative, vivid'],
      ['简洁、明了', 'concise, clear'],
      ['信息丰富、教育性', 'informative, educational'],
      ['专业、详细、准确、技术性强', 'professional, detailed, accurate, technically precise'],
      ['正式、严谨、条理清晰、逻辑性强', 'formal, rigorous, clear, logical'],
      ['创意、生动、富有想象力、独特', 'creative, vivid, imaginative, unique'],
      ['简洁、明了、重点突出、言简意赅', 'concise, clear, focused, concise'],
      ['信息丰富、内容全面、详细、有教育意义', 'informative, comprehensive, detailed, educational'],
      ['技术专业人士', 'technical professionals'],
      ['学术或商业人士', 'academic or business professionals'],
      ['创意人士', 'creative professionals'],
      ['专业人士', 'professionals'],
      ['人工智能和相关技术的持续发展与应用', 'Continued development and application of AI and related technologies'],
      ['数字化转型与商业模式创新', 'Digital transformation and business model innovation'],
      ['相关领域的持续发展与创新', 'Continued development and innovation in related fields'],
      ['技术开发、系统设计、研究应用', 'Technical development, system design, research applications'],
      ['学术研究、商业决策、专业报告', 'Academic research, business decision-making, professional reports'],
      ['创意设计、内容创作、营销传播', 'Creative design, content creation, marketing communication'],
      ['实际应用、业务实践、技术实施', 'Practical applications, business practices, technical implementation'],
      ['相关领域的应用场景', 'Application scenarios in related fields'],
      ['层次清晰', 'well-structured'],
      ['无结构', 'unstructured'],
      ['中等', 'medium'],
      ['复杂', 'complex'],
      ['线性', 'linear'],
      ['简单', 'simple'],
      ['文档内容', 'document content'],
      ['文档主题', 'document topic'],
      ['详细描述', 'detailed description'],
      ['专业', 'professional'],
      ['高质量内容', 'high-quality content'],
      ['未来发展趋势', 'future trends'],
      ['相关应用场景', 'relevant application scenarios']
    ];
    
    // Apply translations using string split/join to avoid regex issues
    for (const [chinese, english] of translationMap) {
      translated = translated.split(chinese).join(english);
    }
    
    // Handle Chinese punctuation
    translated = translated.replace(/，/g, ', ');
    translated = translated.replace(/。/g, '. ');
    
    // Check if translation was successful - if still has Chinese characters, 
    // try to extract meaningful parts
    if (/[\u4e00-\u9fa5]/.test(translated)) {
      // Extract parts without Chinese and combine with translations
      const parts = translated.split(/[\u4e00-\u9fa5]+/).filter(p => p.trim());
      if (parts.length > 0) {
        translated = parts.join(' ').replace(/\s+/g, ' ').trim();
      } else {
        // If no meaningful parts found, return default
        return 'professional content';
      }
    }
    
    // Clean up extra whitespace
    translated = translated.replace(/\s+/g, ' ').trim();
    
    // Ensure the translation is not just numbers and symbols
    if (/^[0-9\s\p{P}\p{S}]+$/u.test(translated) || !translated) {
      return 'professional content';
    }
    
    // Ensure the translation is a complete sentence
    if (!/[.!?]$/.test(translated)) {
      translated += '.';
    }
    
    return translated;
  }

  /**
   * Translate English text to Chinese
   * @param {string} text - English text
   * @returns {string} - Chinese translation
   */
  translateToChinese(text) {
    if (!text) return '';
    
    // Enhanced translation map for common terms and professional jargon
    const translationMap = {
      'high quality': '高质量',
      'well-structured': '结构清晰',
      'detailed': '内容详细',
      'clear expression': '表达明确',
      'professional and standardized': '专业规范',
      'accurate': '准确无误',
      'technically precise': '技术精确',
      'in-depth research': '研究深入',
      'reliable data': '数据可靠',
      'formal and rigorous': '正式严谨',
      'clear and logical': '条理清晰',
      'coherent logic': '逻辑连贯',
      'well-organized': '组织有序',
      'unique creativity': '创意独特',
      'vivid and descriptive': '生动形象',
      'imaginative': '富有想象力',
      'engaging': '引人入胜',
      'concise and clear': '简洁明了',
      'highlighted key points': '重点突出',
      'straight to the point': '直击主题',
      'efficient expression': '高效表达',
      'informative': '信息丰富',
      'comprehensive': '内容全面',
      'detailed and specific': '详细具体',
      'educational': '有教育意义',
      'detailed description': '详细描述',
      'technical professionals': '技术专业人士',
      'academic or business professionals': '学术或商业人士',
      'creative professionals': '创意人士',
      'professionals': '专业人士',
      'Continued development and application of AI and related technologies': '人工智能和相关技术的持续发展与应用',
      'Digital transformation and business model innovation': '数字化转型与商业模式创新',
      'Continued development and innovation in related fields': '相关领域的持续发展与创新',
      'Technical development, system design, research applications': '技术开发、系统设计、研究应用',
      'Academic research, business decision-making, professional reports': '学术研究、商业决策、专业报告',
      'Creative design, content creation, marketing communication': '创意设计、内容创作、营销传播',
      'Practical applications, business practices, technical implementation': '实际应用、业务实践、技术实施',
      'Application scenarios in related fields': '相关领域的应用场景',
      'unstructured': '无结构',
      'medium': '中等',
      'complex': '复杂',
      'linear': '线性',
      'simple': '简单',
      'professional content': '专业内容',
      'document content': '文档内容',
      'detailed description': '详细描述',
      'professional': '专业',
      'high-quality content': '高质量内容'
    };
    
    let translated = text;
    for (const [english, chinese] of Object.entries(translationMap)) {
      translated = translated.replace(new RegExp(english, 'gi'), chinese);
    }
    
    // Handle English punctuation
    translated = translated.replace(/, /g, '，');
    translated = translated.replace(/\. /g, '。');
    
    // Ensure the translation is not just numbers and symbols
    if (/^[0-9\s\p{P}\p{S}]+$/u.test(translated)) {
      return '专业内容';
    }
    
    // Ensure the translation is not empty
    if (!translated) {
      return '专业内容';
    }
    
    return translated;
  }
  
  /**
   * Extract key technologies and technical terms from keywords
   * @param {Array} keywords - Extracted keywords
   * @param {boolean} hasChinese - Whether the text contains Chinese characters
   * @returns {Array} - Key technologies and technical terms
   */
  extractKeyTechnologies(keywords, hasChinese) {
    if (!keywords || !Array.isArray(keywords)) {
      return [];
    }
    
    // Technical terms patterns
    const technicalPatterns = hasChinese ? 
      /[技术算法系统架构数据库网络人工智能机器学习深度学习自然语言处理]/u : 
      /algorithm|system|architecture|database|network|AI|artificial intelligence|machine learning|deep learning|NLP|natural language processing/i;
    
    // Extract technical terms
    return keywords.filter(keyword => {
      return technicalPatterns.test(keyword) || 
             // Include acronyms and technical abbreviations
             (/^[A-Z0-9.]+$/.test(keyword) && keyword.length > 1);
    }).slice(0, 8);
  }
  
  /**
   * Analyze document structure in detail
   * @param {Object} documentStructure - Document structure object
   * @param {boolean} hasChinese - Whether the text contains Chinese characters
   * @returns {Object} - Detailed structure analysis
   */
  analyzeDocumentStructureInDetail(documentStructure, hasChinese) {
    if (!documentStructure) {
      return {
        type: hasChinese ? '未知结构' : 'unknown structure',
        complexity: hasChinese ? '简单' : 'simple',
        sections: 0
      };
    }
    
    const sections = documentStructure.sections || [];
    const headings = documentStructure.headings || [];
    const paragraphs = documentStructure.paragraphs || 0;
    
    let structureType = hasChinese ? '层次清晰' : 'well-structured';
    let complexity = hasChinese ? '中等' : 'medium';
    
    if (sections.length === 0 && headings.length === 0) {
      structureType = hasChinese ? '无结构' : 'unstructured';
      complexity = hasChinese ? '简单' : 'simple';
    } else if (sections.length > 10) {
      complexity = hasChinese ? '复杂' : 'complex';
    }
    
    return {
      type: structureType,
      complexity: complexity,
      sections: sections.length,
      headings: headings.length,
      paragraphs: paragraphs
    };
  }
  
  /**
   * Analyze logical flow patterns
   * @param {Object} logicalFlow - Logical flow object
   * @param {boolean} hasChinese - Whether the text contains Chinese characters
   * @returns {Object} - Logical flow analysis
   */
  analyzeLogicalFlowPatterns(logicalFlow, hasChinese) {
    if (!logicalFlow) {
      return {
        pattern: hasChinese ? '线性' : 'linear',
        complexity: hasChinese ? '简单' : 'simple',
        transitions: 0
      };
    }
    
    const flow = logicalFlow.flow || [];
    const logicalSteps = logicalFlow.logicalSteps || [];
    const structure = logicalFlow.structure || {};
    
    let pattern = hasChinese ? '线性' : 'linear';
    let complexity = hasChinese ? '简单' : 'simple';
    
    if (flow.length > 10) {
      complexity = hasChinese ? '复杂' : 'complex';
    }
    
    if (structure.flowPattern) {
      pattern = structure.flowPattern;
    }
    
    return {
      pattern: pattern,
      complexity: complexity,
      transitions: flow.length,
      steps: logicalSteps.length
    };
  }
  
  /**
   * Determine target audience based on analysis
   * @param {Object} analysis - Analysis results
   * @param {boolean} hasChinese - Whether the text contains Chinese characters
   * @returns {string} - Target audience description
   */
  determineTargetAudience(analysis, hasChinese) {
    if (!analysis) {
      return hasChinese ? '专业人士' : 'professionals';
    }
    
    const style = analysis.style || 'informative';
    const keywords = analysis.keywords || [];
    
    // Technical content suggests professional audience
    if (style === 'technical') {
      return hasChinese ? '技术专业人士' : 'technical professionals';
    }
    
    // Formal content suggests academic or business audience
    if (style === 'formal') {
      return hasChinese ? '学术或商业人士' : 'academic or business professionals';
    }
    
    // Creative content suggests general or creative audience
    if (style === 'creative') {
      return hasChinese ? '创意人士' : 'creative professionals';
    }
    
    // Check for technical keywords
    const technicalKeywords = keywords.filter(keyword => 
      /技术|算法|系统|架构|数据库|网络|AI|人工智能|机器学习|深度学习|自然语言处理|algorithm|system|architecture|database|network|AI|artificial intelligence|machine learning|deep learning|NLP|natural language processing/i.test(keyword)
    );
    
    if (technicalKeywords.length > 3) {
      return hasChinese ? '技术专业人士' : 'technical professionals';
    }
    
    return hasChinese ? '专业人士' : 'professionals';
  }
  
  /**
   * Predict future trends based on analysis
   * @param {Object} analysis - Analysis results
   * @param {boolean} hasChinese - Whether the text contains Chinese characters
   * @returns {string} - Future trends description
   */
  predictFutureTrends(analysis, hasChinese) {
    if (!analysis) {
      return hasChinese ? '未来发展趋势' : 'future trends';
    }
    
    const keywords = analysis.keywords || [];
    const keyPhrases = analysis.keyPhrases || [];
    
    // Check for emerging technology keywords
    const emergingTechKeywords = [
      '人工智能', 'AI', '机器学习', '深度学习', '自然语言处理', 'NLP', '大数据', '云计算', '区块链', '元宇宙',
      'artificial intelligence', 'AI', 'machine learning', 'deep learning', 'natural language processing', 'NLP', 'big data', 'cloud computing', 'blockchain', 'metaverse'
    ];
    
    const hasEmergingTech = keywords.some(keyword => 
      emergingTechKeywords.includes(keyword.toLowerCase())
    ) || keyPhrases.some(phrase => 
      emergingTechKeywords.some(tech => phrase.toLowerCase().includes(tech))
    );
    
    if (hasEmergingTech) {
      return hasChinese ? '人工智能和相关技术的持续发展与应用' : 'Continued development and application of AI and related technologies';
    }
    
    // Check for business-related keywords
    const businessKeywords = [
      '市场', '营销', '商业', '管理', '策略', '销售',
      'market', 'marketing', 'business', 'management', 'strategy', 'sales'
    ];
    
    const hasBusinessFocus = keywords.some(keyword => 
      businessKeywords.includes(keyword.toLowerCase())
    );
    
    if (hasBusinessFocus) {
      return hasChinese ? '数字化转型与商业模式创新' : 'Digital transformation and business model innovation';
    }
    
    return hasChinese ? '相关领域的持续发展与创新' : 'Continued development and innovation in related fields';
  }
  
  /**
   * Extract application scenarios from analysis
   * @param {Object} analysis - Analysis results
   * @param {boolean} hasChinese - Whether the text contains Chinese characters
   * @returns {string} - Application scenarios description
   */
  extractApplicationScenarios(analysis, hasChinese) {
    if (!analysis) {
      return hasChinese ? '相关应用场景' : 'relevant application scenarios';
    }
    
    const style = analysis.style || 'informative';
    const keywords = analysis.keywords || [];
    
    // Technical content suggests technical applications
    if (style === 'technical') {
      return hasChinese ? '技术开发、系统设计、研究应用' : 'Technical development, system design, research applications';
    }
    
    // Formal content suggests academic or business applications
    if (style === 'formal') {
      return hasChinese ? '学术研究、商业决策、专业报告' : 'Academic research, business decision-making, professional reports';
    }
    
    // Creative content suggests creative applications
    if (style === 'creative') {
      return hasChinese ? '创意设计、内容创作、营销传播' : 'Creative design, content creation, marketing communication';
    }
    
    // Check for specific application keywords
    const applicationKeywords = [
      '应用', '使用', '实践', '实施', '部署',
      'application', 'use', 'practice', 'implementation', 'deployment'
    ];
    
    const hasApplicationFocus = keywords.some(keyword => 
      applicationKeywords.includes(keyword.toLowerCase())
    );
    
    if (hasApplicationFocus) {
      return hasChinese ? '实际应用、业务实践、技术实施' : 'Practical applications, business practices, technical implementation';
    }
    
    return hasChinese ? '相关领域的应用场景' : 'Application scenarios in related fields';
  }
  
  /**
   * Evaluate the quality of a generated prompt
   * @param {string} prompt - Generated prompt
   * @param {Object} structuredDetails - Structured details used to generate the prompt
   * @param {boolean} hasChinese - Whether the text contains Chinese characters
   * @returns {Object} - Quality evaluation result
   */
  evaluatePromptQuality(prompt, structuredDetails, hasChinese) {
    if (!prompt) {
      return {
        score: 0,
        quality: 'poor',
        feedback: hasChinese ? '提示词为空' : 'Prompt is empty',
        metrics: {}
      };
    }
    
    // Split prompt into Chinese and English parts
    const promptParts = prompt.split('\n');
    const chinesePart = hasChinese ? promptParts[0] : '';
    const englishPart = hasChinese ? promptParts[1] : promptParts[0];
    const relevantPart = hasChinese ? chinesePart : englishPart;
    
    // Metrics to evaluate
    const metrics = {
      length: relevantPart.length,
      wordCount: relevantPart.split(/\s+/).filter(word => word.length > 0).length,
      hasKeywords: false,
      hasProfessionalTerms: false,
      hasTargetAudience: false,
      hasApplicationScenarios: false,
      hasFutureTrends: false,
      structureScore: 0
    };
    
    // Check for keywords
    if (structuredDetails.basicStructure && structuredDetails.basicStructure.singleWords) {
      const keywords = structuredDetails.basicStructure.singleWords.split(hasChinese ? '、' : ', ');
      metrics.hasKeywords = keywords.some(keyword => relevantPart.includes(keyword));
    }
    
    // Check for professional terms
    if (structuredDetails.keyTechnologies && structuredDetails.keyTechnologies.length > 0) {
      metrics.hasProfessionalTerms = structuredDetails.keyTechnologies.some(term => relevantPart.includes(term));
    }
    
    // Check for target audience
    if (structuredDetails.targetAudience) {
      metrics.hasTargetAudience = relevantPart.includes(structuredDetails.targetAudience);
    }
    
    // Check for application scenarios
    if (structuredDetails.applicationScenarios) {
      metrics.hasApplicationScenarios = relevantPart.includes(structuredDetails.applicationScenarios);
    }
    
    // Check for future trends
    if (structuredDetails.futureTrends) {
      metrics.hasFutureTrends = relevantPart.includes(structuredDetails.futureTrends);
    }
    
    // Evaluate structure score
    let structureScore = 0;
    if (metrics.hasKeywords) structureScore += 20;
    if (metrics.hasProfessionalTerms) structureScore += 20;
    if (metrics.hasTargetAudience) structureScore += 15;
    if (metrics.hasApplicationScenarios) structureScore += 15;
    if (metrics.hasFutureTrends) structureScore += 15;
    if (metrics.length > 50) structureScore += 15;
    metrics.structureScore = structureScore;
    
    // Calculate overall score
    let score = structureScore;
    
    // Length bonus
    if (metrics.length > 100) score += 10;
    else if (metrics.length < 30) score -= 10;
    
    // Word count bonus
    if (metrics.wordCount > 15) score += 5;
    else if (metrics.wordCount < 5) score -= 5;
    
    // Ensure score is within 0-100 range
    score = Math.max(0, Math.min(100, score));
    
    // Determine quality level
    let quality = 'poor';
    let feedback = '';
    
    if (score >= 90) {
      quality = 'excellent';
      feedback = hasChinese ? '提示词质量优秀，包含了所有必要的元素' : 'Excellent prompt quality, includes all necessary elements';
    } else if (score >= 75) {
      quality = 'good';
      feedback = hasChinese ? '提示词质量良好，包含了大部分必要的元素' : 'Good prompt quality, includes most necessary elements';
    } else if (score >= 60) {
      quality = 'fair';
      feedback = hasChinese ? '提示词质量一般，缺少一些必要的元素' : 'Fair prompt quality, missing some necessary elements';
    } else {
      quality = 'poor';
      feedback = hasChinese ? '提示词质量较差，缺少多个必要的元素' : 'Poor prompt quality, missing multiple necessary elements';
    }
    
    return {
      score: Math.round(score),
      quality: quality,
      feedback: feedback,
      metrics: metrics
    };
  }
}

module.exports = new DocumentAnalysisService();
