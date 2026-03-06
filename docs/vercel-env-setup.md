# Vercel 环境变量配置指南

## 必需环境变量

### 1. 数据库
```bash
DATABASE_PROVIDER=postgresql
DATABASE_URL=postgresql://neondb_owner:npg_chKFsDO3Gi7k@ep-falling-block-ajd1jkpj-pooler.c-3.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
DB_SINGLETON_ENABLED=true
DB_MAX_CONNECTIONS=1
```

### 2. 认证
```bash
AUTH_SECRET=8JI787+8tOm1KovjFdoPMh/2wG/Un79lWrqoNlVnAjo=
```

### 3. AI API (302.ai)
```bash
AI_302_API_KEY=sk-YOUR_302_API_KEY_HERE
```
**获取方式**：从 302.ai 控制台获取

### 4. Cloudflare R2 存储
```bash
R2_ACCOUNT_ID=6d6a95e8cfa105385bb799772c84c9c3
R2_ACCESS_KEY_ID=55d07a3874c09a2cbb67ce41d75d1459
R2_SECRET_ACCESS_KEY=f951b974ca285663428e0ad325228e8f852b14b8e33423227824a9fedfac777c
R2_BUCKET_NAME=goodtrans
R2_PUBLIC_URL=https://goodtrans.r2.dev
```

### 5. Resend 邮件服务
```bash
RESEND_API_KEY=re_YOUR_RESEND_KEY_HERE
```
**获取方式**：https://resend.com/api-keys

### 6. Inngest 任务队列
```bash
INNGEST_EVENT_KEY=YOUR_EVENT_KEY_HERE
INNGEST_SIGNING_KEY=YOUR_SIGNING_KEY_HERE
```
**获取方式**：https://app.inngest.com/

### 7. 应用配置
```bash
NEXT_PUBLIC_APP_URL=https://goodtrans.vercel.app
NEXT_PUBLIC_APP_NAME=GoodTrans
NEXT_PUBLIC_THEME=default
NEXT_PUBLIC_APPEARANCE=system
```

## 配置步骤

1. 登录 Vercel Dashboard
2. 进入 GoodTrans 项目
3. Settings → Environment Variables
4. 逐个添加上述变量
5. 选择环境：Production, Preview, Development
6. 保存后重新部署

## 验证

部署后访问：
- https://goodtrans.vercel.app/api/inngest (应返回 Inngest 状态)
- 测试翻译功能确认端到端流程
