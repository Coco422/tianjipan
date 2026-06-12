# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

天机盘 — 修仙风格预测市场 / 朋友间竞猜平台。用户以"灵石"下注，彩池模式（Parimutuel）结算，庄家抽水。

## 常用命令

```bash
npm run dev          # 启动开发服务器 (localhost:3000)
npm run build        # 生产构建（用于验证代码能否编译通过）
npm run lint         # ESLint 检查
npx prisma db push   # 同步 schema 到数据库（无 migration 文件）
npx prisma generate  # 重新生成 Prisma Client
npm run db:seed      # 初始化管理员 + 示例盘口 + SystemConfig
```

## 技术栈要点

- **Next.js 16** (App Router) — 所有页面在 `src/app/`，使用 Server Components + Server Actions
- **Prisma v7** — 使用 `@prisma/adapter-pg` 适配器模式（非标准 driver），`prisma/prisma.ts` 中通过 `PrismaPg` 连接
- **Auth.js v5** (JWT) — `src/lib/auth.ts`，JWT callback 每次请求刷新用户余额
- **Tailwind CSS 4** — 水墨风格自定义 CSS 在 `src/app/globals.css`
- **Zod v4** — 用于表单校验（注意是 v4，API 与 v3 有差异）

## 架构分层

```
src/
├── lib/           # 纯业务逻辑，不关心 auth/session
│   ├── prisma.ts      # Prisma 单例（adapter-pg 模式）
│   ├── auth.ts        # NextAuth 配置 + JWT 扩展
│   ├── odds.ts        # 赔率计算（Parimutuel）
│   ├── settlement.ts  # 结算 + 取消 + 抽水逻辑
│   ├── review.ts      # LLM 审核 prompt + API 调用
│   └── dispute.ts     # 申诉系统（发起/附议/撤市/驳回）
├── actions/       # Server Actions — 负责 auth 校验 + revalidatePath
│   ├── auth.ts        # 登录/注册/登出
│   ├── market.ts      # 创建盘口 + 下注
│   ├── admin.ts       # 结算/取消/审核/重试审核（全部 ADMIN-only）
│   ├── review.ts      # 自动审核调度（LLM → 高置信度自动决策，低置信度留给 Admin）
│   └── dispute.ts     # 申诉操作的 Server Action 包装
├── app/           # Next.js 页面（Server Components）
│   ├── (auth)/login/register  # 登录/注册（route group，无 layout）
│   ├── markets/       # 盘口列表 / 创建 / 详情 / 我的 / 待审核
│   ├── disputes/      # 申诉列表
│   ├── leaderboard/   # 天榜
│   └── profile/       # 个人中心
└── components/market/ # 客户端交互组件
    ├── BetForm.tsx        # 下注表单
    ├── ReviewPanel.tsx    # Admin 审核面板
    ├── SettlementPanel.tsx# Admin 结算面板
    └── DisputeSection.tsx # 申诉区域
```

**调用方向**: `app/` → `actions/` → `lib/`。`actions/` 层做 auth 校验，`lib/` 层只做业务逻辑。Server Actions 返回 `{ success }` 或 `{ error }` 对象。

## 盘口生命周期

```
PENDING_REVIEW  ──→  OPEN  ──→  CLOSED  ──→  SETTLED
       │                                          ↑
       ├── (LLM 高置信度 approved) ──→ OPEN       │
       ├── (LLM 高置信度 rejected) ──→ CANCELLED   │
       └── (LLM 低置信度) ──→ 等待 Admin 手动审核  │
                                                   │
PENDING_REVIEW/OPEN/CLOSED  ──→  DISPUTED  ──→  PASSED → CANCELLED（撤市）
                                        └──→  REJECTED → CLOSED
```

## LLM 审核机制

- 审核 prompt 定义在 `src/lib/review.ts`，检查合法性、可结算性、歧义性
- 使用 OpenAI 兼容 API，当前配置 Qwen3 模型
- **关键**: Qwen3 默认开启 thinking 模式会导致 content 为空，需传 `chat_template_kwargs: { enable_thinking: false }`
- 阈值: `confidence >= 0.8` 时自动决策（通过或拒绝），低于则留给 Admin
- 审核结果写入 `market.reviewNote`，用户在"我的盘口"可见

## 申诉系统

- 只有投注者可发起申诉，扣除 10 灵石保证金（SystemConfig.disputeDeposit）
- 其他投注者可附议，扣除 5 灵石（SystemConfig.secondDeposit）
- 附议人数 ≥ max(3, 30%投注人数) 时自动撤市，全额退还
- Admin 可驳回（费用充入金库）或支持（手动撤市）

## Auth 扩展

JWT token 和 Session 都扩展了 `id`, `nickname`, `role`, `balance` 字段，类型定义在 `src/types/auth.d.ts`。每次请求的 JWT callback 会从数据库刷新余额。

## 数据库

- PostgreSQL (Neon)，表名用 `@@map` 映射为 snake_case（`users`, `markets`, `market_options`, `bets`, `disputes`, `dispute_votes`, `system_config`）
- SystemConfig 是单行配置表，存抽水率、金库余额、申诉参数
- Bet 有 `@@unique([userId, marketId])` 约束 — 每人每盘只能下一注
