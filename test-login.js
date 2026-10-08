const axios = require('axios');

// 测试登录API
async function testLogin() {
  try {
    const response = await axios.post('http://localhost:3001/api/v1/admin/auth/login', {
      username: 'admin',
      password: 'admin123'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('登录成功:', response.data);
  } catch (error) {
    console.error('登录失败:', error.response?.data || error.message);
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('响应头:', error.response.headers);
    }
  }
}

// 测试注册API（可选）
async function testRegister() {
  try {
    const response = await axios.post('http://localhost:3001/api/v1/admin/auth/register', {
      username: 'test',
      password: 'test123'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('注册成功:', response.data);
  } catch (error) {
    console.error('注册失败:', error.response?.data || error.message);
  }
}

// 运行测试
testLogin();
// testRegister(); // 取消注释以测试注册