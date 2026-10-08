const IdeaToPromptService = require('./server/services/ideaToPromptService');

async function testTranslation() {
  console.log('开始测试翻译功能...');

  const service = new IdeaToPromptService();

  // 测试翻译功能
  const testText = 'Create professional copywriting content. about: general topic. Style: professional, detailed, technically precise. Tone: friendly, approachable, warm. Target audience: general public. Key elements: contains data, list format, comparative analysis, with details: friendly, baidu, single paragraph, covering keywords: baidu. Ensure logical clarity, complete structure, and fluent language.';

  console.log('原始英文文本:');
  console.log(testText);

  // 调用翻译方法
  try {
    const translated = service.translateToChinese(testText);

    console.log('\n翻译后的中文:');
    console.log(translated);

    // 找出所有英文字符
    const allEnglishChars = translated.match(/[a-zA-Z]+/g);
    console.log('\n所有英文字符:', allEnglishChars);

    // 检查是否包含英文字符
    const hasEnglish = /[a-zA-Z]/.test(translated);
    console.log('是否包含英文字符:', hasEnglish);

    if (hasEnglish) {
      console.log('\n❌ 中文提示词中仍包含英文');
    } else {
      console.log('\n✅ 中文提示词中不包含英文');
    }
  } catch (error) {
    console.error('翻译失败:', error);
  }
}

testTranslation();
