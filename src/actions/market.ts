"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { MarketStatus, MarketType } from "@prisma/client";
import { revalidatePath } from "next/cache";

const createMarketSchema = z.object({
  title: z.string().min(2, "标题太短").max(200, "标题太长"),
  description: z.string().max(1000).optional(),
  type: z.enum(["BINARY", "MULTI"]),
  options: z
    .array(z.string().min(1))
    .min(2, "至少需要两个选项")
    .max(10, "最多十个选项"),
});

export async function createMarket(formData: FormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { error: "仅开盘长老可创建盘口" };
  }

  const rawOptions = formData.getAll("options") as string[];
  const parsed = createMarketSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    type: formData.get("type"),
    options: rawOptions.filter((o) => o.trim()),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { title, description, type, options } = parsed.data;

  await prisma.market.create({
    data: {
      title,
      description,
      type: type as MarketType,
      creatorId: session.user.id,
      options: {
        create: options.map((label, i) => ({ label, sortOrder: i })),
      },
    },
  });

  revalidatePath("/");
  revalidatePath("/markets");
  return { success: true };
}

export async function placeBet(
  marketId: string,
  optionId: string,
  amount: number
) {
  const session = await auth();
  if (!session?.user) {
    return { error: "请先登录" };
  }

  if (amount <= 0 || !Number.isInteger(amount)) {
    return { error: "灵石数量须为正整数" };
  }

  const market = await prisma.market.findUnique({
    where: { id: marketId },
    include: { options: true },
  });

  if (!market) return { error: "盘口不存在" };
  if (market.status !== MarketStatus.OPEN)
    return { error: "此盘口已关闭下注" };

  const option = market.options.find((o) => o.id === optionId);
  if (!option) return { error: "无效选项" };

  const existingBet = await prisma.bet.findUnique({
    where: { userId_marketId: { userId: session.user.id, marketId } },
  });
  if (existingBet) return { error: "每人每盘只能下一注" };

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { balance: true },
  });
  if (!user || user.balance < amount)
    return { error: "灵石不足" };

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: session.user.id },
      data: { balance: { decrement: amount } },
    });
    await tx.bet.create({
      data: {
        userId: session.user.id,
        marketId,
        optionId,
        amount,
      },
    });
  });

  revalidatePath(`/markets/${marketId}`);
  revalidatePath("/");
  return { success: true };
}

export async function closeMarket(marketId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { error: "仅开盘长老可关闭盘口" };
  }

  await prisma.market.update({
    where: { id: marketId },
    data: { status: MarketStatus.CLOSED, closedAt: new Date() },
  });

  revalidatePath(`/markets/${marketId}`);
  revalidatePath("/");
  return { success: true };
}
