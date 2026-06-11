import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminNickname = process.env.ADMIN_SEED_NICKNAME || "天机子";
  const adminPassword = process.env.ADMIN_SEED_PASSWORD || "admin1234";

  const existing = await prisma.user.findUnique({
    where: { nickname: adminNickname },
  });

  if (!existing) {
    const hashed = await bcrypt.hash(adminPassword, 10);
    await prisma.user.create({
      data: {
        nickname: adminNickname,
        password: hashed,
        role: "ADMIN",
        balance: 10000,
      },
    });
    console.log(`✓ 管理员「${adminNickname}」已创建`);
  } else {
    console.log(`⊙ 管理员「${adminNickname}」已存在`);
  }

  // Create a sample market
  const sampleMarket = await prisma.market.findFirst({
    where: { title: "示例盘口: 今天会下雨吗" },
  });

  if (!sampleMarket) {
    await prisma.market.create({
      data: {
        title: "示例盘口: 今天会下雨吗",
        description: "今天下午之前是否会有降雨",
        type: "BINARY",
        creatorId: (await prisma.user.findUnique({ where: { nickname: adminNickname } }))!.id,
        options: {
          create: [
            { label: "会", sortOrder: 0 },
            { label: "不会", sortOrder: 1 },
          ],
        },
      },
    });
    console.log("✓ 示例盘口已创建");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
