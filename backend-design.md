# 后端架构设计

## 1. 技术栈选择

| 类别 | 技术 | 理由 |
|------|------|------|
| 后端框架 | Node.js + Express.js | 轻量级、高性能、易于扩展，适合处理API请求 |
| 数据库 | MongoDB | 适合存储非结构化数据，如用户信息、生成历史、分析结果等 |
| 身份验证 | JWT (JSON Web Tokens) | 无状态认证，便于API服务扩展 |
| 文件存储 | AWS S3 / 本地文件系统 | 用于存储生成的视频、音频和截图文件 |
| 队列系统 | Bull.js + Redis | 处理长时间运行的AI生成任务，提高系统吞吐量 |
| API文档 | Swagger/OpenAPI | 自动生成API文档，便于前端开发和测试 |
| 日志 | Winston | 灵活的日志管理，支持多环境配置 |
| 测试 | Jest | 现代化的JavaScript测试框架，支持单元测试和集成测试 |
| 部署 | Docker + Docker Compose | 容器化部署，便于环境一致性和扩展 |

## 2. 架构设计

### 2.1 分层架构

```
┌───────────────────────────────────────────────────────────┐
│                      API Gateway                          │
├───────────────────────────────────────────────────────────┤
│                     Controller Layer                      │
│  - 处理HTTP请求和响应                                     │
│  - 输入验证和转换                                         │
│  - 路由管理                                               │
├───────────────────────────────────────────────────────────┤
│                     Service Layer                         │
│  - 业务逻辑处理                                           │
│  - AI模型调用                                             │
│  - 任务队列管理                                           │
├───────────────────────────────────────────────────────────┤
│                     Data Access Layer                     │
│  - 数据库操作                                             │
│  - 数据模型定义                                           │
│  - 事务管理                                               │
└───────────────────────────────────────────────────────────┘
          ↑              ↑              ↑
          │              │              │
┌───────────────────────────────────────────────────────────┐
│                     外部服务                               │
│  - AI模型API (OpenAI, ElevenLabs, 等)                     │
│  - 社交媒体API (YouTube, TikTok, 等)                      │
│  - 云存储服务                                             │
└───────────────────────────────────────────────────────────┘
```

### 2.2 模块设计

#### 2.2.1 核心模块

| 模块 | 功能 | 主要API端点 |
|------|------|-------------|
| 视频生成 | 生成AI视频 | POST /api/v1/video-generator |
| Niche查找 | 发现趋势niche | POST /api/v1/niche-finder |
| 语音生成 | 生成语音over | POST /api/v1/voice-generator |
| 频道分析 | 分析竞争频道 | POST /api/v1/channel-analysis |
| 截图查找 | 查找高质量截图 | POST /api/v1/screenshot-finder |
| 认证与授权 | 用户认证和权限管理 | POST /api/v1/auth/login, POST /api/v1/auth/register |
| Credits管理 | 管理用户credits | GET /api/v1/credits, POST /api/v1/credits/purchase |
| 设置管理 | 用户设置 | GET /api/v1/settings, PUT /api/v1/settings |

#### 2.2.2 辅助模块

| 模块 | 功能 |
|------|------|
| 任务队列 | 处理异步AI生成任务 |
| 通知服务 | 向用户发送任务完成通知 |
| 监控与日志 | 系统监控和日志记录 |
| API文档 | 自动生成和提供API文档 |

## 3. API设计

### 3.1 API版本控制

所有API端点将使用版本控制，如：
```
/api/v1/video-generator
```

### 3.2 核心API端点

#### 3.2.1 视频生成 API

| 端点 | 方法 | 功能 | 请求体 | 响应 |
|------|------|------|--------|------|
| /api/v1/video-generator | POST | 生成视频 | `{"videoModel": "veo", "videoTitle": "", "videoDescription": "", "videoStyle": "", "resolution": "", "voiceOver": "", "voiceScript": ""}` | `{"taskId": "", "status": "pending", "message": "Video generation started"}` |
| /api/v1/video-generator/:taskId | GET | 获取视频生成状态 | N/A | `{"taskId": "", "status": "completed", "videoUrl": "", "message": ""}` |
| /api/v1/video-generator/history | GET | 获取生成历史 | N/A | `[{"taskId": "", "videoTitle": "", "status": "", "createdAt": "", "videoUrl": ""}]` |

#### 3.2.2 Niche查找 API

| 端点 | 方法 | 功能 | 请求体 | 响应 |
|------|------|------|--------|------|
| /api/v1/niche-finder | POST | 查找niche | `{"keywords": "", "platform": "", "nicheType": "", "engagementLevel": "", "competition": ""}` | `{"niches": [{"name": "", "platform": "", "engagement": "", "competition": "", "growth": ""}]}` |

#### 3.2.3 语音生成 API

| 端点 | 方法 | 功能 | 请求体 | 响应 |
|------|------|------|--------|------|
| /api/v1/voice-generator | POST | 生成语音 | `{"voiceModel": "", "voiceType": "", "voiceClone": "", "speed": "", "script": ""}` | `{"taskId": "", "status": "pending", "message": "Voice generation started"}` |
| /api/v1/voice-generator/:taskId | GET | 获取语音生成状态 | N/A | `{"taskId": "", "status": "completed", "audioUrl": "", "message": ""}` |

#### 3.2.4 频道分析 API

| 端点 | 方法 | 功能 | 请求体 | 响应 |
|------|------|------|--------|------|
| /api/v1/channel-analysis | POST | 分析频道 | `{"channelUrl": "", "platform": ""}` | `{"channelInfo": {"name": "", "subscribers": "", "avgViews": "", "engagementRate": "", "totalVideos": ""}, "topVideos": [{"title": "", "views": "", "engagement": "", "uploadedAt": ""}]}` |
| /api/v1/channel-analysis/saved | GET | 获取保存的频道 | N/A | `[{"channelUrl": "", "platform": "", "name": "", "analyzedAt": ""}]` |
| /api/v1/channel-analysis/:channelId | DELETE | 删除保存的频道 | N/A | `{"message": "Channel deleted successfully"}` |

#### 3.2.5 截图查找 API

| 端点 | 方法 | 功能 | 请求体 | 响应 |
|------|------|------|--------|------|
| /api/v1/screenshot-finder | POST | 查找截图 | `{"keywords": "", "category": "", "resolution": "", "quantity": ""}` | `{"screenshots": [{"url": "", "title": "", "resolution": ""}]}` |

#### 3.2.6 Credits管理 API

| 端点 | 方法 | 功能 | 请求体 | 响应 |
|------|------|------|--------|------|
| /api/v1/credits | GET | 获取credits信息 | N/A | `{"available": 95, "usedThisMonth": 12, "breakdown": [{"description": "", "amount": ""}]}` |
| /api/v1/credits/purchase | POST | 购买credits | `{"package": "", "quantity": ""}` | `{"transactionId": "", "newBalance": "", "message": "Purchase successful"}` |

#### 3.2.7 设置管理 API

| 端点 | 方法 | 功能 | 请求体 | 响应 |
|------|------|------|--------|------|
| /api/v1/settings | GET | 获取用户设置 | N/A | `{"fullName": "", "email": "", "username": "", "bio": "", "notificationSettings": {}}` |
| /api/v1/settings | PUT | 更新用户设置 | `{"fullName": "", "bio": "", "notificationSettings": {}}` | `{"message": "Settings updated successfully"}` |
| /api/v1/settings/api-key | POST | 重新生成API密钥 | N/A | `{"newApiKey": "", "message": "API key regenerated successfully"}` |

## 4. 数据模型设计

### 4.1 用户模型 (User)

```javascript
{
  _id: ObjectId,
  fullName: String,
  email: String,
  username: String,
  password: String, // 加密存储
  apiKey: String,
  createdAt: Date,
  updatedAt: Date,
  lastLogin: Date,
  notificationSettings: {
    emailNotifications: Boolean,
    pushNotifications: Boolean,
    marketingEmails: Boolean,
    creditAlerts: Boolean,
    newFeatures: Boolean
  },
  billingInfo: {
    paymentMethod: String,
    billingAddress: String,
    autoRenew: Boolean,
    taxInvoice: Boolean
  }
}
```

### 4.2 生成任务模型 (GenerationTask)

```javascript
{
  _id: ObjectId,
  userId: ObjectId, // 关联用户
  type: String, // video, voice, niche, channel-analysis, screenshot
  status: String, // pending, processing, completed, failed
  model: String,
  input: Object, // 任务输入参数
  output: Object, // 任务输出结果
  creditsUsed: Number,
  createdAt: Date,
  updatedAt: Date,
  completedAt: Date
}
```

### 4.3 Credits模型 (Credit)

```javascript
{
  _id: ObjectId,
  userId: ObjectId, // 关联用户
  available: Number,
  usedThisMonth: Number,
  monthlyAllocation: Number,
  lastReset: Date,
  transactions: [{
    type: String, // purchase, usage, allocation
    amount: Number,
    description: String,
    timestamp: Date
  }]
}
```

## 5. 安全设计

### 5.1 认证与授权

- API密钥认证：所有API请求需要包含有效的API密钥
- JWT认证：用户登录后获取JWT，用于后续请求
- 权限控制：基于角色的访问控制

### 5.2 输入验证与安全

- 所有输入参数进行严格验证和消毒
- 使用Helmet.js设置安全HTTP头
- 实现速率限制，防止API滥用
- 输入数据加密传输（HTTPS）

### 5.3 CORS配置

- 配置适当的CORS策略，允许前端域名访问API
- 限制允许的HTTP方法和头

## 6. 性能与扩展性设计

### 6.1 异步处理

- 使用Bull.js + Redis处理长时间运行的AI生成任务
- 任务队列支持优先级和重试机制
- WebSocket / SSE用于实时通知任务完成

### 6.2 缓存策略

- 使用Redis缓存频繁访问的数据，如用户信息、生成历史
- 缓存API响应，减少数据库查询

### 6.3 水平扩展

- 无状态API设计，便于水平扩展
- 数据库分片或复制，提高数据库性能和可靠性
- 负载均衡，分发请求到多个API实例

## 7. 监控与日志

### 7.1 日志记录

- 使用Winston记录系统日志、API请求和错误
- 日志分级：debug, info, warn, error
- 日志持久化和定期归档

### 7.2 系统监控

- 监控API响应时间和错误率
- 监控系统资源使用情况：CPU, 内存, 磁盘
- 监控数据库性能和连接数
- 设置告警机制，及时发现和处理问题

## 8. 部署设计

### 8.1 Docker容器化

- 将应用和依赖打包到Docker容器
- 使用Docker Compose管理多容器部署
- 支持开发、测试和生产环境的不同配置

### 8.2 CI/CD流水线

- 自动化测试和构建
- 持续集成和持续部署
- 支持蓝绿部署或滚动更新

## 9. 开发与测试

### 9.1 开发流程

- 使用Git进行版本控制
- 分支管理策略：main, develop, feature/*, bugfix/*
- 代码审查和自动化测试

### 9.2 测试策略

- 单元测试：测试单个函数或模块
- 集成测试：测试模块之间的交互
- 端到端测试：测试完整的API流程
- 负载测试：测试系统在高负载下的性能

## 10. 后续扩展考虑

- 支持更多AI模型
- 提供Webhook机制，允许外部系统接收事件通知
- 实现数据分析和报表功能
- 支持团队协作功能
- 提供SDK，便于第三方集成
- 支持多语言API文档

# 总结

本设计提供了一个完整的后端架构方案，支持Algrow平台的所有核心功能。该架构具有良好的扩展性、可靠性和安全性，能够满足当前需求并支持未来的扩展。系统采用分层设计和模块化架构，便于维护和扩展。异步处理和缓存策略确保了系统在高负载下的性能。安全设计考虑了认证、授权、输入验证和数据保护等方面。部署设计支持容器化和CI/CD，便于快速部署和更新。