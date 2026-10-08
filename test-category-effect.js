const axios = require('axios');

// 测试配置
const API_URL = 'http://localhost:3001/api/v1/screenshot-finder';

// 测试用例：相同关键词，不同类别
const testCases = [
  {
    name: '设计 + 技术类别',
    keywords: 'design',
    category: 'technology',
    resolution: '1080p',
    imageStyle: 'photorealistic',
    imageModel: 'default'
  },
  {
    name: '设计 + 艺术类别',
    keywords: 'design',
    category: 'art',
    resolution: '1080p',
    imageStyle: 'photorealistic',
    imageModel: 'default'
  },
  {
    name: '设计 + 商业类别',
    keywords: 'design',
    category: 'business',
    resolution: '1080p',
    imageStyle: 'photorealistic',
    imageModel: 'default'
  }
];

// 运行测试
async function runTests() {
  console.log('测试类别对结果的影响...');
  console.log('======================================');
  
  for (const testCase of testCases) {
    console.log(`\n测试: ${testCase.name}`);
    console.log(`关键词: ${testCase.keywords}`);
    console.log(`类别: ${testCase.category}`);
    
    try {
      const response = await axios.post(API_URL, testCase);
      
      console.log(`状态码: ${response.status}`);
      console.log(`返回截图数量: ${response.data.data.screenshots.length}`);
      console.log(`返回类别: ${response.data.data.category}`);
      
      // 输出前3个截图的URL，看看是否不同
      console.log('前3个截图URL:');
      response.data.data.screenshots.slice(0, 3).forEach((screenshot, index) => {
        console.log(`${index + 1}. ${screenshot.url}`);
      });
      
      console.log('✓ 测试通过');
      
    } catch (error) {
      console.error('✗ 测试失败:', error.message);
      if (error.response) {
        console.error('响应数据:', error.response.data);
      }
    }
  }
  
  console.log('\n======================================');
  console.log('测试完成');
  console.log('======================================');
}

// 运行测试
runTests();
