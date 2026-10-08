const IdeaToPromptService = require('./server/services/ideaToPromptService');

async function testPromptGeneration() {
  console.log('开始测试提示词生成功能...\n');

  const service = new IdeaToPromptService();

  // 测试用例：百度文章内容
  const baiduContent = `百度首页登录科学研究表明：女性天生比男性更擅长多任务处理，可以和闺蜜做到"无缝续联"。研究表明：女性的大脑每秒钟可以完成多次任务切换，效果比男性高出约77%，延缓和预防老年痴呆症效果明显比散步跑步好。

  这不是玄学，是被4600万人验证的健康秘诀。女性天生是"聊天型"动物，和闺蜜聚会聊天、吐槽、逛街，看着是"无效社交"，实际上是大脑的"社交有氧运动"。每次高质量闺蜜会闺蜜，寿命或可延长3-5年。

  美国一项12年跟6.8万人的研究、哈佛75年研究及国内多项调查一致显示：社交圈好的女性比长期孤独的女性寿命平均长3-5年，早死风险降低7%。尤其是中年女性，每周3次高质量闺蜜会，血压更稳定、心率更健康、睡眠质量更高。

  这不是玄学，这是被数据实证的健康秘诀。这项研究发表在权威期刊上，数据真实可靠。`;

  console.log('=== 测试内容 ===');
  console.log(baiduContent.substring(0, 200) + '...\n');

  try {
    const result = await service.generatePrompt(baiduContent, 'copywriting');

    console.log('=== 结构化分析 ===');
    console.log('主题:', result.analysis.topic);
    console.log('风格:', result.analysis.style);
    console.log('语气:', result.analysis.tone);
    console.log('目标受众:', result.analysis.targetAudience);
    console.log('关键词:', result.analysis.keywords);
    console.log('关键要素:', result.analysis.keyElements);
    console.log('结构:', result.analysis.structure);

    console.log('\n=== 生成的提示词 ===');
    console.log('英文提示词:');
    console.log(result.englishPrompt);
    console.log('\n中文提示词:');
    console.log(result.chinesePrompt);

    console.log('\n=== 置信度 ===');
    console.log(result.confidence);

    // 检查中文提示词是否包含英文
    const hasEnglish = /[a-zA-Z]/.test(result.chinesePrompt);
    console.log('\n=== 中文提示词质量检查 ===');
    console.log('是否包含英文字符:', hasEnglish ? '是 ❌' : '否 ✅');

  } catch (error) {
    console.error('测试失败:', error);
  }
}

testPromptGeneration();
