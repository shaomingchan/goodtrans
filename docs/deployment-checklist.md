# GoodTrans 部署清单

## ✅ 已完成

### 1. 核心翻译引擎
- ✅ 5轮反思翻译（Sonnet 4.6 + Opus 4.6）
- ✅ 使用 302.ai API（OpenAI 兼容格式）
- ✅ 分段处理（2000字/段，100字重叠）
- ✅ 术语表集成

### 2. 文件存储
- ✅ Cloudflare R2 上传
- ✅ PDF 上传支持
- ✅ Markdown 结果存储

### 3. 任务队列
- ✅ Inngest 工作流配置
- ✅ 异步翻译处理
- ✅ 邮件通知（Resend）
- ✅ 错误重试机制

### 4. 数据库
- ✅ translation_task 表已存在
- ✅ 状态追踪（pending/processing/completed/failed）
- ✅ 进度追踪（currentRound/totalRounds）

### 5. API 路由
- ✅ POST /api/translation/create
- ✅ POST /api/inngest（Inngest webhook）

## 🔧 待配置环境变量

在 Vercel Dashboard 配置以下变量：

```bash
# AI API
AI_302_API_KEY=sk-YOUR_302_API_KEY

# Resend 邮件
RESEND_API_KEY=re_YOUR_KEY

# Inngest
INNGEST_EVENT_KEY=YOUR_EVENT_KEY
INNGEST_SIGNING_KEY=YOUR_SIGNING_KEY
```

其他变量已在 .env.production 中配置。

## 📋 部署步骤

1. **配置 Inngest**
   - 访问 https://app.inngest.com/
   - 创建新应用 "GoodTrans"
   - 获取 Event Key 和 Signing Key
   - 配置 Webhook URL: `https://goodtrans.vercel.app/api/inngest`

2. **配置 Resend**
   - 访问 https://resend.com/api-keys
   - 创建 API Key
   - 验证发件域名（或使用 Resend 测试域名）

3. **配置 302.ai**
   - 已有账号，获取 API Key
   - 确保余额充足

4. **Vercel 部署**
   ```bash
   cd /home/node/clawd/goodtrans
   vercel --prod
   ```

5. **验证部署**
   - 访问 https://goodtrans.vercel.app/api/inngest
   - 应返回 Inngest 状态页面

## 🧪 测试流程

```bash
curl -X POST https://goodtrans.vercel.app/api/translation/create \
  -H "Content-Type: application/json" \
  -d '{
    "sourceText": "Hello world. This is a test.",
    "sourceLang": "English",
    "targetLang": "Chinese",
    "email": "test@example.com"
  }'
```

预期结果：
1. 返回 taskId
2. 数据库创建记录
3. Inngest 触发工作流
4. 5轮翻译执行
5. 结果上传到 R2
6. 邮件发送到指定地址

## 📊 监控

- Inngest Dashboard: 查看任务执行状态
- Vercel Logs: 查看应用日志
- Neon Dashboard: 查看数据库记录
- R2 Dashboard: 查看上传文件
