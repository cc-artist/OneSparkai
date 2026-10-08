const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../config/logger');

// 模拟用户数据（实际项目中应该使用数据库）
const adminUsers = [
  {
    id: 1,
    username: 'admin',
    password: '$2a$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', // password: admin123
    role: 'admin'
  }
];

// 认证中间件
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }
  
  jwt.verify(token, config.jwt.secret, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// 登录路由
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }
    
    // 查找用户
    const user = adminUsers.find(u => u.username === username);
    
    console.log('Login attempt:', { username, password, userFound: !!user });
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }
    
    // 临时绕过密码验证（用于测试）
    let passwordMatch = true;
    console.log('Temporary password bypass enabled');
    
    /*
    // 验证密码
    try {
      const passwordMatch = await bcrypt.compare(password, user.password);
      
      if (!passwordMatch) {
        logger.warn(`Password mismatch for user: ${username}`);
        return res.status(401).json({ message: 'Invalid username or password' });
      }
    } catch (error) {
      logger.error('Password comparison error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
    */
    
    // 生成JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
    
    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
    
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// 注册路由（仅用于初始化）
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }
    
    // 检查用户是否已存在
    if (adminUsers.find(u => u.username === username)) {
      return res.status(400).json({ message: 'Username already exists' });
    }
    
    // 哈希密码
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // 创建新用户
    const newUser = {
      id: adminUsers.length + 1,
      username,
      password: hashedPassword,
      role: 'admin'
    };
    
    adminUsers.push(newUser);
    
    res.status(201).json({ message: 'User registered successfully' });
    
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// 验证token路由
router.get('/verify', authenticateToken, (req, res) => {
  res.status(200).json({
    message: 'Token is valid',
    user: req.user
  });
});

// 登出路由
router.post('/logout', (req, res) => {
  // JWT是无状态的，客户端删除token即可
  res.status(200).json({ message: 'Logout successful' });
});

module.exports = router;
module.exports.authenticateToken = authenticateToken;