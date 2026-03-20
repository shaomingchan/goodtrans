# GoodTrans order_no metadata 回归验证（2026-03-21）

## 本轮目标
仅验证两处 QA FAIL 修复：
1. callback 路由在 `session.metadata.order_no` 缺失时必须失败；不一致时必须失败。
2. notify 路由在 `PAYMENT_SUCCESS` 一次性支付分支中，`metadata.order_no` 缺失时必须明确失败，不能返回 success。

## 自动化验证材料
新增脚本：`scripts/verify-order-no-guards.ts`

执行命令：
```bash
cd /home/node/clawd/goodtrans
npx tsx scripts/verify-order-no-guards.ts
```

实际输出：
```text
PASS callback: accepts matching order_no
PASS callback: rejects missing session metadata.order_no -> session order_no not found
PASS callback: rejects mismatched order_no -> order no mismatch
PASS notify: accepts existing metadata.order_no
PASS notify: rejects missing metadata.order_no -> order no not found
Verified 5/5 order_no guard cases
```

## 覆盖到的失败路径
- callback：`session.metadata.order_no` 缺失 -> 抛错 `session order_no not found`
- callback：`session.metadata.order_no !== callback order_no` -> 抛错 `order no mismatch`
- notify（一次性支付/复用 guard）:`session.metadata.order_no` 缺失 -> 抛错 `order no not found`

## 为什么本轮没有做真实 Stripe sandbox 联调
本轮工作空间内可以看到 Stripe 相关代码与环境模板，但**没有完成可直接复现的真实联调前置条件证明**，因此本轮不把“已完成 Stripe sandbox 联调”作为已验证事实：
- 当前任务要求只在 `/home/node/clawd/goodtrans` 内最小修复；
- 本轮未建立/验证 Stripe sandbox 凭证、checkout 可访问环境、webhook 签名配置、以及可稳定重放的真实事件链路；
- 运行环境中也未发现 `stripe` CLI，可见无法直接用本机 CLI 生成和转发 sandbox webhook 作为补证。

因此本轮采用**最小替代验证**：
- 将关键强校验抽到纯函数；
- 使用 `tsx` 脚本覆盖 QA 指定的缺失/不一致分支；
- 以可重复命令输出作为回归证据。

## 补充说明
尝试执行 ESLint：
```bash
npx eslint src/app/api/payment/callback/route.ts src/app/api/payment/notify/[provider]/route.ts src/app/api/payment/_lib/order-no-guards.ts scripts/verify-order-no-guards.ts
```
结果失败，原因不是本次改动，而是仓库当前缺少 ESLint v9 需要的 `eslint.config.*`：
```text
ESLint couldn't find an eslint.config.(js|mjs|cjs) file.
```
该项仅作为仓库现状记录，不作为本轮修复范围。
