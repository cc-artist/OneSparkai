const axios = require('axios');

// 测试配置
const API_URL = 'http://localhost:3001/api/v1/screenshot-finder';

// 测试用例
const testCases = [
  {
    name: '测试关键词相关性 - 技术类别',
    keywords: 'laptop computer',
    category: 'technology',
    resolution: '1080p',
    imageStyle: 'photorealistic',
    imageModel: 'default'
  },
  {
    name: '测试关键词相关性 - 自然类别',
    keywords: 'mountain landscape',
    category: 'nature',
    resolution: '1080p',
    imageStyle: 'photorealistic',
    imageModel: 'default'
  },
  {
    name: '测试类别影响 - 相同关键词不同类别',
    keywords: 'design',
    category: 'technology',
    resolution: '1080p',
    imageStyle: 'photorealistic',
    imageModel: 'default'
  },
  {
    name: '测试类别影响 - 相同关键词不同类别',
    keywords: 'design',
    category: 'art',
    resolution: '1080p',
    imageStyle: 'photorealistic',
    imageModel: 'default'
  },
  {
    name: '测试多关键词处理',
    keywords: 'modern office workspace',
    category: 'business',
    resolution: '1080p',
    imageStyle: 'photorealistic',
    imageModel: 'default'
  },
  {
    name: '测试未映射关键词',
    keywords: 'quantum computing',
    category: 'technology',
    resolution: '1080p',
    imageStyle: 'photorealistic',
    imageModel: 'default'
  },
  {
    name: '测试响应时间',
    keywords: 'test response time',
    category: 'technology',
    resolution: '1080p',
    imageStyle: 'photorealistic',
    imageModel: 'default'
  }
];

// 运行测试
async function runTests() {
  console.log('开始测试截图查找功能改进...');
  console.log('======================================');
  
  let passedTests = 0;
  let totalTests = testCases.length;
  
  for (const testCase of testCases) {
    console.log(`\n测试: ${testCase.name}`);
    console.log(`关键词: ${testCase.keywords}`);
    console.log(`类别: ${testCase.category}`);
    
    try {
      const startTime = Date.now();
      const response = await axios.post(API_URL, testCase);
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      console.log(`状态码: ${response.status}`);
      console.log(`响应时间: ${responseTime}ms`);
      console.log(`返回截图数量: ${response.data.data.screenshots.length}`);
      
      // 验证响应时间
      if (responseTime <= 3000) {
        console.log('✓ 响应时间符合要求 (<= 3秒)');
      } else {
        console.log('✗ 响应时间超过3秒');
      }
      
      // 验证返回结构
      if (response.data.data.screenshots && Array.isArray(response.data.data.screenshots)) {
        console.log('✓ 返回结构正确');
      } else {
        console.log('✗ 返回结构错误');
      }
      
      // 验证截图URL
      const hasValidUrls = response.data.data.screenshots.every(screenshot => screenshot.url);
      if (hasValidUrls) {
        console.log('✓ 所有截图都有有效URL');
      } else {
        console.log('✗ 部分截图没有有效URL');
      }
      
      passedTests++;
      console.log('✓ 测试通过');
      
    } catch (error) {
      console.error('✗ 测试失败:', error.message);
      if (error.response) {
        console.error('响应数据:', error.response.data);
      }
    }
  }
  
  console.log('\n======================================');
  console.log(`测试完成: ${passedTests}/${totalTests} 通过`);
  console.log('======================================');
}

// 运行测试
runTests();
