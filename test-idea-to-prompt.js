const IdeaToPromptService = require('./server/services/ideaToPromptService');

const ideaToPromptService = new IdeaToPromptService();

const testCases = [
  {
    name: '中文测试',
    content: '人工智能技术正在快速发展，它包括机器学习、深度学习和自然语言处理等多个领域。这些技术已经广泛应用于图像识别、语音识别、智能推荐等场景。未来，人工智能将继续改变我们的生活和工作方式。',
    category: 'copywriting'
  },
  {
    name: '英文测试',
    content: 'Artificial intelligence technology is rapidly evolving, including machine learning, deep learning, and natural language processing. These technologies have been widely applied in image recognition, speech recognition, and intelligent recommendation systems. In the future, AI will continue to transform our lives and work.',
    category: 'copywriting'
  },
  {
    name: '创意内容测试',
    content: '创建一个关于健康饮食的短视频脚本，强调蔬菜水果的重要性，用轻松活泼的风格面向年轻观众。',
    category: 'video'
  }
];

async function runTests() {
  console.log('开始测试IDEA TO PROMPT新算法...\n');

  for (const testCase of testCases) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`测试用例: ${testCase.name}`);
    console.log(`${'='.repeat(60)}`);
    console.log(`输入内容: ${testCase.content.substring(0, 50)}...`);
    console.log(`内容类别: ${testCase.category}\n`);

    try {
      const result = await ideaToPromptService.generatePrompt(testCase.content, testCase.category);

      console.log('生成结果:');
      console.log(`\n置信度: ${result.confidence}`);
      console.log(`生成方式: ${result.generatedBy}`);
      console.log(`\n中文提示词:\n${result.chinesePrompt}`);
      console.log(`\n英文提示词:\n${result.englishPrompt}`);
      console.log(`\n完整提示词:\n${result.reversePrompt}`);
      console.log(`\n结构化详情:`);
      console.log(`- 主题: ${result.structuredDetails.topic}`);
      console.log(`- 风格: ${result.structuredDetails.style}`);
      console.log(`- 语气: ${result.structuredDetails.tone}`);
      console.log(`- 目标受众: ${result.structuredDetails.targetAudience}`);
      console.log(`- 关键要素: ${result.structuredDetails.keyElements.join(', ')}`);
      console.log(`\n质量验证:`);
      console.log(`- 评分: ${result.validation.score}%`);
      console.log(`- 通过: ${result.validation.passed ? '是' : '否'}`);
      console.log(`- 检查项:`);
      for (const check of result.validation.checks) {
        console.log(`  - ${check.item}: ${check.passed ? '✓' : '✗'} - ${check.message}`);
      }

      console.log('\n');
    } catch (error) {
      console.error(`测试失败: ${error.message}`);
      console.error(error.stack);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('测试完成');
  console.log(`${'='.repeat(60)}`);
}

runTests().catch(console.error);
