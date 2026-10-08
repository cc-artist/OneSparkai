const axios = require('axios');
const fs = require('fs');

// 测试配置
const API_URL = 'http://localhost:3001/api/v1/screenshot-finder';

// 测试用例
const testCases = [
  {
    name: '技术类别',
    keywords: 'laptop',
    category: 'technology',
    resolution: '1080p',
    imageStyle: 'photorealistic',
    imageModel: 'default'
  }
];

// 运行测试
async function runTests() {
  console.log('测试图片URL有效性...');
  console.log('======================================');
  
  for (const testCase of testCases) {
    console.log(`\n测试: ${testCase.name}`);
    console.log(`关键词: ${testCase.keywords}`);
    console.log(`类别: ${testCase.category}`);
    
    try {
      // 调用API获取截图
      const response = await axios.post(API_URL, testCase);
      
      console.log(`状态码: ${response.status}`);
      console.log(`返回截图数量: ${response.data.data.screenshots.length}`);
      
      // 测试每个图片URL
      for (let i = 0; i < response.data.data.screenshots.length; i++) {
        const screenshot = response.data.data.screenshots[i];
        console.log(`\n截图 ${i + 1}:`);
        console.log(`标题: ${screenshot.title}`);
        console.log(`URL: ${screenshot.url}`);
        
        // 测试URL是否可访问
        try {
          const imageResponse = await axios.get(screenshot.url, { responseType: 'arraybuffer' });
          console.log(`✓ 图片URL有效，状态码: ${imageResponse.status}`);
          console.log(`✓ 图片大小: ${imageResponse.data.length} 字节`);
        } catch (imageError) {
          console.error(`✗ 图片URL无效: ${imageError.message}`);
        }
      }
      
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
