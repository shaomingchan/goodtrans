# GoodTrans 项目交接文档
**给：哥的本地 Claude Code**
**整理时间：2026-04-05**
**最新代码：main 分支，commit `0ecde8f`（2026-03-30）**

---

## 一、项目是什么

**GoodTrans** — AI 反思翻译 SaaS。

核心逻辑：上传 PDF/Word/Markdown → 邮箱 → 1小时后收到高质量译文（5轮反思翻译）。

**目标用户**：中小出海企业、独立开发者、跨境电商卖家

**定价**（前1个月半价）：
- 1万字 $125
- 5万字 $600
- 10万字 $1,125

**技术栈**：Next.js + Neon PostgreSQL + Stripe + Inngest + Resend + R2 + Better Auth

**线上地址**：https://goodtrans.vercel.app

---

## 二、前因后果（时间线）

### 起源（2026-02）
- 哥想做翻译工具，最初设想是"做视频的兄弟产品"
- 内部代号 GoodTrans，对标 DeepL，但强调"反思翻译"（5轮迭代）
- 核心差异化：格式保留 + 术语一致性 + 全自动化

### 第一次重建（2026-02~03）
- 初始代码质量差，存在严重安全问题（API裸奔、密钥泄露、支付绕过后端）
- 各部门联合评审后结论：C+ 级，必须重建

### 第二次重建（2026-03-06，ShipAny 模板）
- 用 Pieter Levels 模式：12天上线 MVP
- 用 ShipAny 模板快速搭建（Next.js + Neon + Stripe + R2）
- 翻译引擎：Sonnet 做初稿 + Opus 做反思，5轮迭代
- 完成了：认证、数据库、R2存储、翻译核心、Inngest队列、Resend邮件

### 卡在支付（2026-03 中下旬）
- Stripe checkout 是自己写的，没有走 ShipAny 标准体系
- 结果：用户付了钱 → Stripe 通知来 → 积分不发放（webhook 没接通）
- 根源：`session.metadata.order_no` 在 checkout 创建时没有正确传递

### 最近一次修复（2026-03-30，commit `0ecde8f`）
- **修复内容**：Stripe webhook 的 `PAYMENT_INTENT_SUCCEEDED` 事件中，加入 `order_no` metadata 回补逻辑 + 幂等保护 + 防重试死循环
- **代码改动**：`src/app/api/payment/notify/[provider]/route.ts` + `src/extensions/payment/stripe.ts`
- **验证方式**：本地 `tsx scripts/verify-order-no-guards.ts`，5/5 guard cases 通过

---

## 三、当前状态

### ✅ 已完成
- 核心翻译引擎（5轮反思，Sonnet+Opus）
- 用户认证（Better Auth）
- 数据库 schema（Drizzle + Neon）
- R2 文件存储
- Resend 邮件通知
- Inngest 异步任务队列
- Stripe checkout 创建流程
- Credits 扣减逻辑
- order_no metadata 保护（callback + notify 两处 guard）
- Webhook 幂等 + 重试防死循环

### 🔴 仍然卡住（上线阻断）
**只有一件事：Stripe Webhook 没有真实联调过。**

- `.env.production` 中 `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` 是空的
- 没有在 Stripe Dashboard 配置过 webhook URL
- 没有用真实 Stripe Sandbox 卡做过端到端测试（支付→积分发放）
- commit `0ecde8f` 的修复是代码级 guard 验证，但从未在真实环境跑过

**只要哥在 Stripe 后台配置好 Webhook，理论上整个支付链就通了。**

### 🟡 未完成（不影响支付上线）
- PDF 中文支持（jsPDF → 应换 `@react-pdf/renderer`）
- 翻译 API 流式输出（30-60秒干等）
- max_tokens 硬编码 4096（长文档截断）
- SEO 落地页（语言对矩阵 / 格式落地页）
- Landing Page 文案重写（聚焦"格式保留"对比）

---

## 四、Git 情况

```
仓库：https://github.com/shaomingchan/goodtrans
分支：main
最新 commit：0ecde8f（2026-03-30）
Author: DevOps Agent
信息：fix: stripe payment_intent.succeeded order_no metadata backfill with idempotency
```

本地路径：`/home/node/clawd/goodtrans/`

---

## 五、环境变量（生产）

`.env.production` 当前状态：
- ✅ `NEXT_PUBLIC_APP_URL` = "https://goodtrans.vercel.app"
- ✅ `DATABASE_URL` = 已填（Neon PostgreSQL）
- ✅ `AUTH_SECRET` = 已填
- ✅ `R2_*` = 已填（Cloudflare R2）
- ❌ `STRIPE_SECRET_KEY` = **空**
- ❌ `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` = **空**
- ❌ `STRIPE_WEBHOOK_SECRET` = **空**
- ❌ `AI_302_API_KEY` = **空**（需要填入才能翻译）

---

## 六、给本地 Claude Code 的任务建议

### 任务 1（必须）：Stripe Webhook 真实联调

**目标**：用 Stripe Sandbox 完成一次真实端到端测试

**步骤**：
1. 哥在 Stripe Dashboard 创建测试模式 account
2. 填入 `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` / `STRIPE_WEBHOOK_SECRET`
3. 配置 Webhook URL 指向 `https://goodtrans.vercel.app/api/payment/notify/stripe`
4. 勾选事件：`checkout.session.completed`，`payment_intent.succeeded`
5. 用测试卡走一次完整支付流程
6. 确认积分到账

**验证成功标准**：付款后用户在数据库中 credits 增加

### 任务 2（可选）：review 代码找其他问题

已知的潜在问题：
- `src/app/api/payment/notify/[provider]/route.ts` — webhook 处理逻辑
- `src/extensions/payment/stripe.ts` — Stripe SDK 调用封装
- `src/app/api/payment/callback/route.ts` — checkout callback guard
- `scripts/verify-order-no-guards.ts` — 现有 guard 验证脚本（参考）

### 任务 3（如果要做）：AI_302_API_KEY 配置

`.env.production` 中的 `AI_302_API_KEY` 如果要真实翻译，需要填入 302.ai 的 key。

---

## 七、相关文档路径

| 文档 | 路径 |
|------|------|
| PRD v2.0（产品定义） | `docs/goodtrans/product/PRD-v2.0.md` |
| 项目愿景 | `docs/goodtrans/VISION.md` |
| 优化方案（多部门评审） | `goodtrans/docs/goodtrans-optimization-plan.md` |
| 12天开发计划 | `docs/goodtrans/PROJECT-MASTER.md` |
| order_no 回归验证 | `goodtrans/docs/order-no-metadata-regression-validation-2026-03-21.md` |
| webhook 幂等验证 | `goodtrans/docs/webhook-idempotency-validation-2026-03-21.md` |
| 三审制度 | `docs/goodtrans/PROJECT-MASTER.md`（第三节） |
| 技术术语表 | `docs/goodtrans/technical/glossary-final-v5.md` |

---

## 八、关键决策记录（CEO 确认）

1. **不做流式预览** — 技术复杂，用户可以等1小时
2. **全自动化** — 上传→邮箱→1小时后收到，不做实时进度
3. **不承诺100%术语一致性** — 实测后再定，不夸大宣传
4. **前1个月半价** — 测市场反应
5. **多平台推广** — Product Hunt + Twitter + 小红书
6. **最大护城河** — 自动化（免去分段翻译的痛苦）+ 5轮反思 + 术语库

---

*整理：Coo (Main) · 2026-04-05*
