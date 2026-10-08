const documentAnalysisService = require('./server/services/documentAnalysisService');

// 测试内容
const testContents = [
  {
    name: '技术文档',
    content: '人工智能（AI）是研究、开发用于模拟、延伸和扩展人的智能的理论、方法、技术及应用系统的一门新的技术科学。人工智能的发展历史可以分为几个阶段：1. 早期发展（1950-1970）：图灵测试、逻辑推理系统；2. 知识工程时期（1970-1990）：专家系统、知识表示；3. 机器学习时代（1990-2010）：统计学习、支持向量机；4. 深度学习革命（2010至今）：深度神经网络、大数据训练。人工智能的应用领域包括：计算机视觉、自然语言处理、智能推荐、自动驾驶等。未来发展趋势包括：更强大的模型、多模态融合、边缘计算部署、伦理规范等。',
    category: 'copywriting'
  },
  {
    name: '产品描述',
    content: '全新的智能手机X Pro采用6.7英寸AMOLED屏幕，分辨率3200x1440，支持120Hz刷新率。搭载最新的骁龙8 Gen 3处理器，16GB内存和512GB存储空间。相机系统包括5000万像素主摄、4800万像素超广角和1200万像素长焦镜头，支持8K视频录制。电池容量5000mAh，支持65W有线快充和15W无线充电。系统运行基于Android 14的MIUI 15，支持AI辅助功能和隐私保护。价格为6999元，将于10月15日正式发售。',
    category: 'copywriting'
  },
  {
    name: '市场分析',
    content: '2024年全球电子商务市场规模预计达到6.3万亿美元，年增长率为8.5%。亚太地区是最大的电商市场，占全球份额的53%，其次是北美（23%）和欧洲（18%）。移动购物成为主流，占电商交易的67%。消费者行为趋势包括：社交电商兴起、个性化推荐重要性增加、可持续消费意识提高、即时配送需求增长。主要挑战包括：物流成本上升、数据安全隐患、竞争加剧、监管合规要求提高。未来发展方向：元宇宙购物体验、AI驱动的个性化服务、区块链技术应用、跨境电商增长。',
    category: 'copywriting'
  }
];

// 测试函数
async function testReversePrompt() {
  console.log('=== 测试反向提示词生成功能 ===\n');
  
  for (const testCase of testContents) {
    console.log(`测试案例: ${testCase.name}`);
    console.log(`内容类别: ${testCase.category}`);
    console.log('=' .repeat(60));
    
    try {
      console.log('1. 开始分析内容...');
      // 首先分析内容
      const analysis = await documentAnalysisService.analyzeContent(testCase.content);
      console.log('内容分析完成');
      
      console.log('2. 开始生成反向提示词...');
      // 生成反向提示词
      const result = await documentAnalysisService.generateReversePrompt(
        analysis,
        testCase.content,
        testCase.category
      );
      
      console.log('生成结果:');
      console.log('反向提示词:');
      console.log(result.reversePrompt);
      console.log('\n结构化详情:');
      console.log(JSON.stringify(result.structuredDetails, null, 2));
      console.log('\n置信度:', result.confidence);
      console.log('生成方式:', result.generatedBy);
      
      if (result.qualityEvaluation) {
        console.log('质量评估:', JSON.stringify(result.qualityEvaluation, null, 2));
      }
      
    } catch (error) {
      console.error('测试失败:', error.message);
      console.error('错误堆栈:', error.stack);
    }
    
    console.log('\n' + '-' .repeat(60) + '\n');
  }
  
  console.log('=== 测试完成 ===');
}

// 运行测试
testReversePrompt().catch(console.error);
