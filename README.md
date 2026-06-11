# ☰ 天机盘 (TianJiPan)

> 诸位道友，今日天机已现，请下注

修仙风格的预测市场 / 朋友间竞猜平台，灵石结算。

## 玩法

- **用户** = 修士，注册即得 1000 灵石
- **盘口** = 天机盘，Admin 创建竞猜话题
- **下注** = 压注，选一个方向投入灵石
- **赔率** = 彩池模式，`payout = amount × totalPool / winnerPool`
- **结算** = 天道裁决，Admin 宣布胜方，自动分配灵石
- **排行** = 宗门天榜，按灵石余额排名

## 技术栈

| 层 | 选型 |
|---|---|
| 框架 | Next.js 16 (App Router) |
| 语言 | TypeScript |
| ORM | Prisma v7 + @prisma/adapter-pg |
| 数据库 | PostgreSQL (Neon / Supabase) |
| 认证 | Auth.js v5 (JWT) |
| 样式 | Tailwind CSS 4 + 水墨风自定义 CSS |
| 部署 | Vercel |

## 本地开发

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env  # 填入你的 DATABASE_URL

# 3. 创建数据库表
npx prisma db push

# 4. 生成 Prisma Client
npx prisma generate

# 5. 初始化管理员 + 示例数据
npm run db:seed

# 6. 启动开发服务器
npm run dev
```

## 环境变量

```env
DATABASE_URL="postgresql://..."      # PostgreSQL 连接字符串
NEXTAUTH_SECRET="random-32-chars"    # JWT 签名密钥
NEXTAUTH_URL="http://localhost:3000" # 站点 URL
ADMIN_SEED_NICKNAME="天机子"         # 管理员道号
ADMIN_SEED_PASSWORD="admin1234"      # 管理员密码
```

## 页面

| 路径 | 说明 |
|---|---|
| `/` | 首页，活跃盘口列表 |
| `/login` | 入道（登录） |
| `/register` | 修炼（注册） |
| `/markets` | 所有盘口 |
| `/markets/[id]` | 盘口详情 + 下注 |
| `/markets/create` | 开盘（Admin） |
| `/leaderboard` | 宗门天榜 |
| `/profile` | 个人中心 |

## 赔率算法

彩池模式 (Parimutuel)，无人为固定赔率：

```
A 选项: 600 灵石    B 选项: 400 灵石    总池: 1000

A 赢赔率 = 1000 / 600 = 1.67x
B 赢赔率 = 1000 / 400 = 2.50x

下注 100 灵石押 A → A 赢则获得 167 灵石
```

## 美术资源

网站当前使用纯 CSS + Unicode 实现水墨风格。美术资源需求见 `docs/ART_REQUIREMENTS.md`。

## License

MIT
