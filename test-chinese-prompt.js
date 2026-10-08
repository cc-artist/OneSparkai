const axios = require('axios');

// 测试反推提示词生成API
async function testReversePrompt() {
  try {
    const response = await axios.post('http://localhost:3001/api/v1/multi-modal-reverse-prompt', {
      textInput: '这是一篇关于人工智能的技术文档，主要介绍了机器学习的基本原理和应用场景。文档详细说明了监督学习、无监督学习和强化学习的概念，以及它们在图像识别、自然语言处理等领域的应用。',
      contentCategory: 'copywriting'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('测试成功！');
    console.log('生成的反推提示词:');
    console.log(response.data.reversePrompt);
    
    // 检查是否包含中文
    const hasChinese = /[\u4e00-\u9fa5]/.test(response.data.reversePrompt);
    console.log('\n是否包含中文:', hasChinese);
    
    // 检查是否包含英文
    const hasEnglish = /[a-zA-Z]/.test(response.data.reversePrompt);
    console.log('是否包含英文:', hasEnglish);
    
  } catch (error) {
    console.error('测试失败:', error.response?.data || error.message);
    if (error.response) {
      console.error('状态码:', error.response.status);
    }
  }
}

// 运行测试
testReversePrompt();