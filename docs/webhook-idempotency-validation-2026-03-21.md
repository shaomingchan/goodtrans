# GoodTrans A5 webhook 重放幂等验证（2026-03-21）

## 本轮目标
仅修 A5：webhook 重放幂等。

## 改动摘要
- 将订单状态推进到 `PAID` 与权益发放绑定到同一事务语义：先在事务内尝试将订单从 `CREATED/PENDING` 推进到 `PAID`。
- 只有状态推进成功，事务内才继续插入 credit / subscription。
- 若订单未成功推进到 `PAID`（例如重复 webhook / 已处理），则整笔事务直接跳过权益发放。
- 弱化服务层事务外的 `already paid` 预判，改为以事务内状态门闩为准。

## 自动化回归
脚本：`scripts/verify-webhook-idempotency-a5.ts`

执行命令：
```bash
cd /home/node/clawd/goodtrans
npx tsx scripts/verify-webhook-idempotency-a5.ts
```

预期输出：
```text
PASS paid transition payload: prepares PAID update and credit grant
PASS status gate: CREATED/PENDING are the only payable states
PASS replay guard: second execution for same order_no must skip entitlement when status is already PAID
Verified 3/3 webhook replay idempotency guard cases
```

## 本地验证
1. `npx tsx scripts/verify-webhook-idempotency-a5.ts`
2. `git diff -- src/shared/models/order.ts src/shared/services/payment.ts scripts/verify-webhook-idempotency-a5.ts docs/webhook-idempotency-validation-2026-03-21.md`

## QA 关注点
- 重放同一 `order_no` 两次时，第二次不得再发 credit / subscription。
- 事务门闩必须是 `order.status in (CREATED, PENDING)` -> `PAID` 的单次成功更新。
- 不接受仅靠事务外 `if (order.status === PAID) return` 作为并发安全证明。
