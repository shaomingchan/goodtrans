# GoodTrans 项目交接文档
**给：哥的本地 Claude Code**
**整理：Coo (Main)**
**整理时间：2026-04-05**
**最新代码：main 分支，commit `1cfa0cc`（2026-04-05）**

---

## 一、项目是什么

**GoodTrans** — AI 反思翻译 SaaS。

**一句话定位**：上传文档 → 关掉页面 → 1小时后邮箱收到高质量译文（5轮反思翻译）。

**核心护城河**（来自 CEO 决策）：
1. 全自动化（免去分段翻译的痛苦）
2. 5轮反思翻译（质量接近人工翻译）
3. 三层术语库（确保专业术语一致性）

**定价**（前1个月半价推广）：
- 1万字 $125（原价 $250）
- 5万字 $600（原价 $1,200）
- 10万字 $1,125（原价 $2,250）

**技术栈**：Next.js + Neon PostgreSQL + Stripe + Inngest + Resend + R2 + Better Auth

**线上地址**：https://goodtrans.vercel.app

---

## 二、当前真实状态

### ✅ 已完成（支付链路除外）
- 核心翻译引擎（5轮：PDF提取→格式优化→初稿→反思→终稿）
- Better Auth 用户认证
- Drizzle + Neon 数据库 schema
- Cloudflare R2 文件存储
- Resend 邮件通知
- Inngest 异步任务队列
- Stripe checkout 创建流程
- Credits 扣减逻辑
- order_no metadata 幂等 guard（commit `0ecde8f`）

### 🔴 唯一上线阻断项：Stripe Webhook 未真实联调
- `.env.production` 里 `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` 是空的
- Stripe Dashboard 从未配置过 webhook URL
- 从未用真实测试卡跑过完整支付→积分发放流程
- **fix：哥在 Stripe Dashboard 配置 webhook URL，支付链就通**

### 🟡 未完成（不影响支付上线）
- PDF 中文支持（jsPDF → 换 `@react-pdf/renderer`）
- max_tokens 4096 硬编码（长文档截断）
- SEO 落地页（语言对矩阵）
- Landing Page 文案（聚焦"格式保留"对比 DeepL）

---

## 三、技术决策时间线（必读）

### 2026-02 — 起源
- 最初设想"做视频的兄弟产品"，对标 DeepL，强调"反思翻译"
- 初始代码质量差，安全问题严重（API裸奔、密钥泄露、支付绕过）

### 2026-02-28 — Round 1 评审（5部门联合）
**结论：C+ 级，必须重建**
- 核心问题：ShipAny 模板 + 翻译页面，两套系统没接通
- Dev 发现：认证/支付/credits 体系完全绕过
- 安全问题：SSRF 漏洞、API Key 泄露、checkout 绕过

### 2026-03-04 — Kickoff 启动会（全员）
**CEO 核心决策**：
- 定价对标人工翻译 75%，不参考 DeepL
- 模型选最好的：Sonnet（初稿）+ Opus（反思+终稿），不省成本
- 先深入研究参考工作流，再提建议（CEO 批评团队没做功课）
- 品牌文案：**No language should be a barrier / 愿世上没有文字的障碍**

### 2026-03-05 晚 — 晚间会议（CEO+COO）
- Design 交付被打回（无美感，不对标 Squarespace）
- **新决策：UI 直接套 ShipAny 模板，Design Agent 只做品牌元素**
- DanceDitto 产品方向提出

### 2026-03-05 深夜 — Session 2（CEO+COO）
- 术语库架构确定：三层（用户私有/官方/众包）
- VISION 确立：**世界上最优质的翻译工具，超越人工翻译**
- 成本修正：$45.5/10万字（不优化，保持质量）
- 采纳的优化：上下文窗口(500字重叠) + 翻译记忆 + 质量评估

### 2026-03-06 — PRD v2.0 冻结
CEO 最终决策（PRD-v2.0 已记录）：
1. 产品定位：通用型翻译工具（不限用户群体）
2. 翻译时间：10万字 1 小时内完成
3. 不做流式预览（邮件通知替代）
4. 不承诺 100% 术语一致性（实测后再定）
5. 前1个月半价测市场
6. 护城河：自动化 + 5轮反思 + 术语库

### 2026-03-21 — order_no guard 修复（commit `0ecde8f`）
- 问题：checkout 创建时 `order_no` 没正确传递到 session metadata
- 修复：webhook 的 `PAYMENT_INTENT_SUCCEEDED` 中回补 metadata + 幂等保护 + 防重试死循环
- 验证：`scripts/verify-order-no-guards.ts`，5/5 guard cases 通过

---

## 四、环境变量（生产）

`.env.production` 当前状态：

| 变量 | 状态 | 说明 |
|------|------|------|
| `NEXT_PUBLIC_APP_URL` | ✅ 已填 | `https://goodtrans.vercel.app` |
| `DATABASE_URL` | ✅ 已填 | Neon PostgreSQL |
| `AUTH_SECRET` | ✅ 已填 | |
| `R2_*` | ✅ 已填 | Cloudflare R2 |
| `STRIPE_SECRET_KEY` | ❌ 空 | **需哥填入** |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ❌ 空 | **需哥填入** |
| `STRIPE_WEBHOOK_SECRET` | ❌ 空 | **需哥填入** |
| `AI_302_API_KEY` | ❌ 空 | 填入后才能真实翻译 |

**Webhook URL**：`https://goodtrans.vercel.app/api/payment/notify/stripe`
**监听事件**：`checkout.session.completed`，`payment_intent.succeeded`

---

## 五、给本地 Claude Code 的任务建议

### 任务 1（P0）：Stripe Webhook 端到端联调
**这是唯一阻断上线的事。做完 GoodTrans 就能收款。**

1. 哥在 Stripe Dashboard 创建测试模式 account
2. 填入 `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` / `STRIPE_WEBHOOK_SECRET`
3. 配置 webhook URL → `https://goodtrans.vercel.app/api/payment/notify/stripe`
4. 勾选事件：`checkout.session.completed`，`payment_intent.succeeded`
5. 用 Stripe 测试卡跑一次完整支付
6. 验证：数据库中用户 credits 增加

**成功标准**：付款后用户在数据库中 credits 增加，无报错

### 任务 2（可选）：review 代码找其他问题

参考文件：
- `src/app/api/payment/notify/[provider]/route.ts` — webhook 处理逻辑
- `src/extensions/payment/stripe.ts` — Stripe SDK 封装
- `src/app/api/payment/callback/route.ts` — checkout callback guard
- `scripts/verify-order-no-guards.ts` — 现有 guard 验证脚本

### 任务 3（可选）：AI_302_API_KEY 配置

填入 302.ai 的 key 后可测试真实翻译。

---

## 六、仓库文档索引（本地 Claude Code 必读）

**优先阅读顺序**：

```
1. ONBOARDING-For-Local-Claude-Code.md    ← 你现在在这里，快速了解现状
2. docs/PRD-v2.0.md                        ← 产品需求定义，CEO 最终确认版
3. docs/MEETING-01-kickoff-2026-03-04.md ← 项目启动会，所有核心决策在这里
4. docs/MEETING-Round1-review-summary.md   ← Round 1 踩坑诊断，C+ 代码问题清单
5. docs/MEETING-03-session2-2026-03-05.md ← Session 2，VISION+技术决策
6. docs/MEETING-02-evening-2026-03-05.md ← 晚间会议，质量管理+Design失败
```

**辅助文档**：
```
docs/webhook-idempotency-validation-2026-03-21.md   ← webhook 幂等验证
docs/order-no-metadata-regression-validation-2026-03-21.md  ← order_no guard 说明
docs/goodtrans-optimization-plan.md                  ← 优化方案（多部门评审）
```

---

## 七、Git 信息

```
仓库：https://github.com/shaomingchan/goodtrans
分支：main
最新 commit：1cfa0cc（2026-04-05）
内容：docs: add PRD v2.0 product specification
本地路径：/home/node/clawd/goodtrans/
```

---

*整理：COO (Main) · 2026-04-05 02:48 北京时间*
