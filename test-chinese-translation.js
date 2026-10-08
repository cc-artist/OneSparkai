const IdeaToPromptService = require('./server/services/ideaToPromptService');

async function testChineseTranslation() {
  const service = new IdeaToPromptService();
  
  // 测试用例1：英文内容
  const englishContent = 'This is an article about artificial intelligence development, discussing AI applications in various fields including healthcare, education, and finance. The article emphasizes the importance of AI technology and future development trends.';
  
  console.log('测试用例：英文内容');
  try {
    const result = await service.generatePrompt(englishContent, 'copywriting');
    
    console.log('=== 英文提示词 ===');
    console.log(result.englishPrompt);
    console.log('\n=== 中文提示词 ===');
    console.log(result.chinesePrompt);
    console.log('\n=== 检查中文提示词是否包含英文 ===');
    
    // 检查中文提示词是否包含英文单词
    const hasEnglishWords = /[a-zA-Z]+/.test(result.chinesePrompt);
    if (hasEnglishWords) {
      console.log('❌ 中文提示词中仍包含英文：', result.chinesePrompt);
    } else {
      console.log('✅ 中文提示词中不包含英文');
    }
    
    console.log('\n测试完成！');
  } catch (error) {
    console.error('测试失败:', error.message);
    console.error(error.stack);
  }
  
  // 测试用例2：中文内容
  const chineseContent = '这是一篇关于人工智能发展的文章，讨论了AI在各个领域的应用，包括医疗、教育、金融等。文章强调了AI技术的重要性和未来发展趋势。';
  
  console.log('\n\n测试用例：中文内容');
  try {
    const result = await service.generatePrompt(chineseContent, 'copywriting');
    
    console.log('=== 英文提示词 ===');
    console.log(result.englishPrompt);
    console.log('\n=== 中文提示词 ===');
    console.log(result.chinesePrompt);
    console.log('\n=== 检查中文提示词是否包含英文 ===');
    
    // 检查中文提示词是否包含英文单词
    const hasEnglishWords = /[a-zA-Z]+/.test(result.chinesePrompt);
    if (hasEnglishWords) {
      console.log('❌ 中文提示词中仍包含英文：', result.chinesePrompt);
    } else {
      console.log('✅ 中文提示词中不包含英文');
    }
    
    console.log('\n测试完成！');
  } catch (error) {
    console.error('测试失败:', error.message);
    console.error(error.stack);
  }
}

testChineseTranslation();
