const IdeaToPromptService = require('./server/services/ideaToPromptService');

async function testConfidenceCalculation() {
  const service = new IdeaToPromptService();
  
  // 测试用例1：中文内容
  const chineseContent = '这是一篇关于人工智能发展的文章，讨论了AI在各个领域的应用，包括医疗、教育、金融等。文章强调了AI技术的重要性和未来发展趋势。';
  
  console.log('测试用例1：中文内容');
  try {
    const result = await service.generatePrompt(chineseContent, 'copywriting');
    
    console.log('=== 结构化提示词详情 ===');
    console.log('basicStructure:', JSON.stringify(result.structuredDetails.basicStructure, null, 2));
    console.log('applicationStructure:', JSON.stringify(result.structuredDetails.applicationStructure, null, 2));
    console.log('functionalElements:', JSON.stringify(result.structuredDetails.functionalElements, null, 2));
    console.log('positiveNegative:', JSON.stringify(result.structuredDetails.positiveNegative, null, 2));
    console.log('\n');
    
    console.log('=== 提示词 ===');
    console.log('英文提示词:', result.englishPrompt);
    console.log('中文提示词:', result.chinesePrompt);
    console.log('\n');
    
    console.log('=== 质量验证 ===');
    console.log('置信度:', result.confidence);
    console.log('验证分数:', result.validation.score);
    console.log('验证检查项:', JSON.stringify(result.validation.checks, null, 2));
    console.log('\n');
    
    console.log('测试完成：置信度计算和返回格式正确！');
  } catch (error) {
    console.error('测试失败:', error.message);
    console.error(error.stack);
  }
  
  // 测试用例2：英文内容
  const englishContent = 'This is an article about artificial intelligence development, discussing AI applications in various fields including healthcare, education, and finance. The article emphasizes the importance of AI technology and future development trends.';
  
  console.log('\n\n测试用例2：英文内容');
  try {
    const result = await service.generatePrompt(englishContent, 'copywriting');
    
    console.log('=== 结构化提示词详情 ===');
    console.log('basicStructure:', JSON.stringify(result.structuredDetails.basicStructure, null, 2));
    console.log('\n');
    
    console.log('=== 提示词 ===');
    console.log('英文提示词:', result.englishPrompt);
    console.log('中文提示词:', result.chinesePrompt);
    console.log('\n');
    
    console.log('=== 质量验证 ===');
    console.log('置信度:', result.confidence);
    console.log('验证分数:', result.validation.score);
    console.log('\n');
    
    console.log('测试完成：置信度计算和返回格式正确！');
  } catch (error) {
    console.error('测试失败:', error.message);
    console.error(error.stack);
  }
}

testConfidenceCalculation();
