import { prisma } from "./prisma";
import { MarketStatus } from "@prisma/client";

export async function settleMarket(
  marketId: string,
  winningOptionId: string
): Promise<void> {
  const market = await prisma.market.findUnique({
    where: { id: marketId },
    include: { options: true, bets: true },
  });

  if (!market || market.status !== MarketStatus.CLOSED) {
    throw new Error("盘口未找到或未处于关闭状态");
  }

  const winner = market.options.find((o) => o.id === winningOptionId);
  if (!winner) throw new Error("无效的胜出选项");

  const totalPool = market.bets.reduce((sum, b) => sum + b.amount, 0);
  const winnerPool = market.bets
    .filter((b) => b.optionId === winningOptionId)
    .reduce((sum, b) => sum + b.amount, 0);

  if (winnerPool === 0) throw new Error("无人投注该选项，无法结算");

  // 抽水计算
  const rakePercent = market.rakePercent;
  const rake = Math.floor((totalPool * rakePercent) / 100);
  const distributable = totalPool - rake;

  await prisma.$transaction(async (tx) => {
    await tx.marketOption.update({
      where: { id: winningOptionId },
      data: { isWinner: true },
    });

    for (const bet of market.bets) {
      if (bet.optionId === winningOptionId && winnerPool > 0) {
        const payout = Math.floor((bet.amount * distributable) / winnerPool);
        await tx.user.update({
          where: { id: bet.userId },
          data: { balance: { increment: payout } },
        });
        await tx.bet.update({
          where: { id: bet.id },
          data: { payout },
        });
      } else {
        await tx.bet.update({
          where: { id: bet.id },
          data: { payout: 0 },
        });
      }
    }

    // 记录抽水收入
    await tx.market.update({
      where: { id: marketId },
      data: {
        status: MarketStatus.SETTLED,
        settledAt: new Date(),
        houseRevenue: rake,
      },
    });

    // 更新系统金库
    const config = await tx.systemConfig.findFirst();
    if (config) {
      await tx.systemConfig.update({
        where: { id: config.id },
        data: { houseBalance: { increment: rake } },
      });
    } else {
      await tx.systemConfig.create({
        data: { houseBalance: rake },
      });
    }
  });
}

export async function cancelMarket(marketId: string): Promise<void> {
  const market = await prisma.market.findUnique({
    where: { id: marketId },
    include: { bets: true },
  });

  if (!market) throw new Error("盘口未找到");
  if (market.status === MarketStatus.SETTLED)
    throw new Error("已结算的盘口无法取消");

  await prisma.$transaction(async (tx) => {
    for (const bet of market.bets) {
      await tx.user.update({
        where: { id: bet.userId },
        data: { balance: { increment: bet.amount } },
      });
    }

    await tx.market.update({
      where: { id: marketId },
      data: { status: MarketStatus.CANCELLED },
    });
  });
}
