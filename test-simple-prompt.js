const IdeaToPromptService = require('./server/services/ideaToPromptService');

async function testSimplePrompt() {
  const service = new IdeaToPromptService();
  
  // 测试英文内容
  const englishContent = 'This is an article about artificial intelligence development, discussing AI applications in various fields including healthcare, education, and finance. The article emphasizes the importance of AI technology and future development trends.';
  
  console.log('测试英文内容提示词生成');
  try {
    const result = await service.generatePrompt(englishContent, 'copywriting');
    console.log('完整英文提示词:', result.englishPrompt);
    console.log('完整中文提示词:', result.chinesePrompt);
  } catch (error) {
    console.error('测试失败:', error.message);
  }
}

testSimplePrompt();
