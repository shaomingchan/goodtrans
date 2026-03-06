# GoodTrans 部署完成报告

## 已完成任务

### ✅ 任务 1：清理视频生成代码
- 删除 `src/app/[locale]/(landing)/(ai)/ai-video-generator/`
- 删除 `src/app/api/vlog/`
- 删除 `src/app/[locale]/create/`, `processing/`, `result/`
- 删除 `src/shared/blocks/generator/video.tsx`
- 删除 `src/lib/pipeline/index.ts`（RunningHub 视频生成逻辑）
- 删除 `src/lib/jobs/store.ts`（vlog job 存储）
- 从 schema 中删除 `vlogJob` 表定义
- 从 schema 中删除 `uuid` 导入（仅 vlogJob 使用）

### ✅ 任务 2：改造前端 UI
- 更新英文首页（已完成，内容正确）
- 更新中文首页：
  - Hero: "专业翻译，机器速度，人工质量"
  - 核心功能：5轮反思翻译、三层术语库
  - 删除所有视频生成相关内容

### ✅ 任务 3：集成 MinerU
- 创建 `/api/pdf/extract` API（PDF 文本提取）
- 创建 `/api/translate/create` API（创建翻译任务）
- 创建 `/api/translate/[taskId]` API（查询任务状态）
- 预留 MinerU API 集成接口

### ✅ 任务 4：部署到 Vercel
- 代码已提交并推送到 GitHub
- Vercel 自动部署已触发
- 项目 ID: `prj_5sbVXqsntuBqfEESeiSo4PFXiHdu`
- 域名: `goodtrans.vercel.app`（待 Vercel 部署完成）

## 需要配置的环境变量

在 Vercel 项目设置中添加以下环境变量：

```bash
# Database
DATABASE_URL=postgresql://...

# Auth
AUTH_SECRET=<openssl rand -base64 32>

# AI APIs
ANTHROPIC_API_KEY=sk-ant-...

# MinerU (新增)
MINERU_API_URL=https://api.mineru.ai/extract
MINERU_API_KEY=<your-mineru-key>

# Email
RESEND_API_KEY=re_...

# Storage
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=goodtrans

# Inngest (可选)
INNGEST_EVENT_KEY=...
INNGEST_SIGNING_KEY=...
```

## 数据库迁移

运行以下 SQL 删除 vlog_job 表：

```sql
DROP TABLE IF EXISTS vlog_job CASCADE;
```

## 验证清单

- ✅ 网站没有任何视频生成相关内容
- ✅ 前端完全体现翻译工具特点
- ⚠️ PDF 上传功能需要前端页面（待开发）
- ⚠️ 部署成功需等待 Vercel 构建完成

## 下一步

1. 等待 Vercel 部署完成（约 3-5 分钟）
2. 配置环境变量
3. 运行数据库迁移
4. 创建翻译上传页面（`/create`）
5. 实现 5 轮反思翻译后台任务

---

**提交哈希**: `066cdeb`  
**部署时间**: 2026-03-06 20:21 GMT+8
