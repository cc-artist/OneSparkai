const documentAnalysisService = require('./server/services/documentAnalysisService');

// Test the document analysis service directly with Chinese content
async function testDocumentAnalysis() {
  try {
    // Test content in Chinese
    const chineseContent = '人工智能（AI）是当今科技领域最热门的话题之一。它涉及机器学习、深度学习、自然语言处理等多个领域，正在改变我们的生活方式和工作方式。';
    
    console.log('Testing document analysis service with Chinese content...');
    console.log('Test Content:', chineseContent);
    
    // Mock file info
    const fileInfo = {
      name: 'test-chinese.txt',
      type: 'text/plain',
      size: chineseContent.length
    };
    
    // Test content cleaning
    console.log('\nTesting cleanText function...');
    const cleanedText = documentAnalysisService.cleanText(chineseContent);
    console.log('Cleaned Text:', cleanedText);
    
    // Test keyword extraction
    console.log('\nTesting extractKeywords function...');
    const keywords = documentAnalysisService.extractKeywords(chineseContent);
    console.log('Extracted Keywords:', keywords);
    
    // Test content analysis
    console.log('\nTesting analyzeContent function...');
    const analysisResult = documentAnalysisService.analyzeContent(chineseContent, fileInfo);
    console.log('Analysis Result:', JSON.stringify(analysisResult, null, 2));
    
    // Test reverse prompt generation
    console.log('\nTesting generateReversePrompt function...');
    const reversePromptResult = documentAnalysisService.generateReversePrompt(analysisResult, chineseContent);
    console.log('Reverse Prompt Result:', JSON.stringify(reversePromptResult, null, 2));
    
  } catch (error) {
    console.error('Error during test:', error);
  }
}

testDocumentAnalysis();