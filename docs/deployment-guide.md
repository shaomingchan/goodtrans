# GoodTrans Day 1 部署指南

## 状态：进行中

### ✅ 已完成
1. 项目基础架构（ShipAny 模板）
2. 依赖安装完成
3. 生产环境配置文件创建
4. AUTH_SECRET 生成

### 🔄 待完成

## 1. 创建 Neon 数据库

访问：https://console.neon.tech/

**步骤**：
1. 登录 Neon 账号
2. 点击 "New Project"
3. 项目名称：`goodtrans`
4. 区域：选择 `AWS us-east-1`（最快）
5. PostgreSQL 版本：16
6. 创建后复制 Connection String

**格式**：
```
postgresql://[user]:[password]@[host]/[database]?sslmode=require
```

**配置到环境变量**：
```bash
DATABASE_URL="postgresql://..."
```

## 2. 配置 Cloudflare R2 存储

R2 配置已在 `.env.production` 中：
- Account ID: `6d6a95e8cfa105385bb799772c84c9c3`
- Access Key: `55d07a3874c09a2cbb67ce41d75d1459`
- Secret Key: `f951b974ca285663428e0ad325228e8f852b14b8e33423227824a9fedfac777c`

**需要创建新 Bucket**：
1. 访问：https://dash.cloudflare.com/
2. 进入 R2 Object Storage
3. 创建 Bucket：`goodtrans`
4. 配置 Public Access（用于文件下载）

## 3. 配置 Better Auth

AUTH_SECRET 已生成：`8JI787+8tOm1KovjFdoPMh/2wG/Un79lWrqoNlVnAjo=`

**数据库迁移**：
```bash
cd /home/node/clawd/goodtrans
pnpm db:push
pnpm auth:generate
```

## 4. 部署到 Vercel

### 4.1 登录 Vercel
```bash
vercel login
```

### 4.2 部署项目
```bash
cd /home/node/clawd/goodtrans
vercel --prod
```

### 4.3 配置环境变量

在 Vercel Dashboard 中配置：

**必需变量**：
```
NEXT_PUBLIC_APP_URL=https://goodtrans.vercel.app
NEXT_PUBLIC_APP_NAME=GoodTrans
DATABASE_URL=[从 Neon 复制]
AUTH_SECRET=8JI787+8tOm1KovjFdoPMh/2wG/Un79lWrqoNlVnAjo=
R2_ACCOUNT_ID=6d6a95e8cfa105385bb799772c84c9c3
R2_ACCESS_KEY_ID=55d07a3874c09a2cbb67ce41d75d1459
R2_SECRET_ACCESS_KEY=f951b974ca285663428e0ad325228e8f852b14b8e33423227824a9fedfac777c
R2_BUCKET_NAME=goodtrans
R2_PUBLIC_URL=https://goodtrans.r2.dev
```

**可选变量（后续配置）**：
```
CLAUDE_API_KEY=[待配置]
RESEND_API_KEY=[待配置]
STRIPE_SECRET_KEY=[待配置]
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=[待配置]
```

### 4.4 配置自定义域名

在 Vercel Project Settings > Domains：
- 添加域名：`goodtrans.vercel.app`（自动分配）

## 5. 验证部署

### 5.1 访问测试
```bash
curl -I https://goodtrans.vercel.app
```

### 5.2 注册登录测试
1. 访问 https://goodtrans.vercel.app
2. 点击注册
3. 输入邮箱密码
4. 验证登录成功

### 5.3 数据库连接测试
```bash
# 本地测试
cd /home/node/clawd/goodtrans
pnpm db:studio
```

## 6. 下一步（Day 2-3）

- [ ] 集成 MinerU（PDF 提取）
- [ ] 实现 5 轮翻译引擎
- [ ] 配置 Inngest 任务队列
- [ ] 配置 Resend 邮件通知

---

**当前进度**：Day 1 - 40%
**预计完成**：今天 23:00 前
