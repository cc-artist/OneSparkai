const bcrypt = require('bcryptjs');

// 测试现有哈希值
const existingHash = '$2a$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW';
const password = 'admin123';

// 验证现有哈希值
async function verifyExistingHash() {
  try {
    const match = await bcrypt.compare(password, existingHash);
    console.log('现有哈希值验证结果:', match);
  } catch (error) {
    console.error('验证错误:', error);
  }
}

// 生成新的哈希值
async function generateNewHash() {
  try {
    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(password, salt);
    console.log('新的哈希值:', newHash);
    
    // 验证新哈希值
    const match = await bcrypt.compare(password, newHash);
    console.log('新哈希值验证结果:', match);
  } catch (error) {
    console.error('生成错误:', error);
  }
}

// 运行测试
verifyExistingHash();
generateNewHash();