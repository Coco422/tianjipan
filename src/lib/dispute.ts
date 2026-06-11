import { prisma } from "./prisma";
import { DisputeStatus, MarketStatus } from "@prisma/client";

/**
 * 发起申诉
 * - 只有投注者能发起
 * - 盘口必须是 CLOSED 状态
 * - 扣除 10 灵石保证金
 * - 盘口状态变为 DISPUTED
 * - 发起人自动算一票
 */
export async function fileDispute(
  marketId: string,
  userId: string,
  reason: string
): Promise<void> {
  const market = await prisma.market.findUnique({
    where: { id: marketId },
    include: { bets: true, disputes: { where: { status: DisputeStatus.OPEN } } },
  });

  if (!market) throw new Error("盘口不存在");
  if (market.status !== MarketStatus.CLOSED) {
    throw new Error("只有已关闭的盘口可以申诉");
  }

  // 检查用户是否投注了
  const userBet = market.bets.find((b) => b.userId === userId);
  if (!userBet) throw new Error("只有投注者可以发起申诉");

  // 检查是否已有进行中的申诉
  if (market.disputes.length > 0) {
    throw new Error("该盘口已有进行中的申诉");
  }

  const config = await getConfig();
  const deposit = config.disputeDeposit;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.balance < deposit) {
    throw new Error(`灵石不足，发起申诉需要 ${deposit} 灵石`);
  }

  await prisma.$transaction(async (tx) => {
    // 扣除保证金
    await tx.user.update({
      where: { id: userId },
      data: { balance: { decrement: deposit } },
    });

    // 创建申诉
    const dispute = await tx.dispute.create({
      data: {
        reason,
        marketId,
        filedById: userId,
      },
    });

    // 发起人自动投一票
    await tx.disputeVote.create({
      data: {
        disputeId: dispute.id,
        userId,
        amount: deposit,
      },
    });

    // 盘口状态变为 DISPUTED
    await tx.market.update({
      where: { id: marketId },
      data: { status: MarketStatus.DISPUTED },
    });
  });

  // 检查是否达到撤市阈值
  await checkDisputeThreshold(marketId);
}

/**
 * 附议
 * - 只有投注者能附议
 * - 扣除 5 灵石
 */
export async function voteDispute(
  disputeId: string,
  userId: string
): Promise<void> {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    include: {
      market: { include: { bets: true } },
      votes: true,
    },
  });

  if (!dispute) throw new Error("申诉不存在");
  if (dispute.status !== DisputeStatus.OPEN) {
    throw new Error("该申诉已结束");
  }

  // 检查用户是否投注了
  const userBet = dispute.market.bets.find((b) => b.userId === userId);
  if (!userBet) throw new Error("只有投注者可以附议");

  // 检查是否已投过票
  const existingVote = dispute.votes.find((v) => v.userId === userId);
  if (existingVote) throw new Error("每人只能投一次");

  const config = await getConfig();
  const deposit = config.secondDeposit;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.balance < deposit) {
    throw new Error(`灵石不足，附议需要 ${deposit} 灵石`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { balance: { decrement: deposit } },
    });

    await tx.disputeVote.create({
      data: {
        disputeId,
        userId,
        amount: deposit,
      },
    });
  });

  // 检查是否达到撤市阈值
  await checkDisputeThreshold(dispute.marketId);
}

/**
 * 检查申诉是否达到撤市阈值
 * 阈值：附议人数 ≥ max(disputeMinVotes, 总投注人数 * disputeThreshold)
 */
export async function checkDisputeThreshold(marketId: string): Promise<boolean> {
  const dispute = await prisma.dispute.findFirst({
    where: { marketId, status: DisputeStatus.OPEN },
    include: {
      market: { include: { bets: true } },
      votes: true,
    },
  });

  if (!dispute) return false;

  const config = await getConfig();
  const totalBettors = dispute.market.bets.length;
  const voteCount = dispute.votes.length;
  const threshold = Math.max(
    config.disputeMinVotes,
    Math.ceil(totalBettors * config.disputeThreshold)
  );

  if (voteCount >= threshold) {
    // 达到阈值，自动撤市
    await executeRevokeMarket(dispute.id);
    return true;
  }

  return false;
}

/**
 * 执行撤市：退还所有下注 + 退还所有申诉费用
 */
async function executeRevokeMarket(disputeId: string): Promise<void> {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    include: {
      market: { include: { bets: true } },
      votes: true,
    },
  });

  if (!dispute) return;

  await prisma.$transaction(async (tx) => {
    // 退还所有下注金额
    for (const bet of dispute.market.bets) {
      await tx.user.update({
        where: { id: bet.userId },
        data: { balance: { increment: bet.amount } },
      });
    }

    // 退还所有申诉/附议费用
    for (const vote of dispute.votes) {
      await tx.user.update({
        where: { id: vote.userId },
        data: { balance: { increment: vote.amount } },
      });
    }

    // 标记申诉通过
    await tx.dispute.update({
      where: { id: disputeId },
      data: { status: DisputeStatus.PASSED, resolvedAt: new Date() },
    });

    // 盘口取消
    await tx.market.update({
      where: { id: dispute.marketId },
      data: { status: MarketStatus.CANCELLED },
    });
  });
}

/**
 * Admin 驳回申诉
 * - 申诉费用充入金库
 * - 盘口恢复 CLOSED
 */
export async function rejectDispute(disputeId: string): Promise<void> {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    include: { votes: true },
  });

  if (!dispute) throw new Error("申诉不存在");
  if (dispute.status !== DisputeStatus.OPEN) throw new Error("申诉已结束");

  const totalDeposit = dispute.votes.reduce((sum, v) => sum + v.amount, 0);

  await prisma.$transaction(async (tx) => {
    // 申诉费用充入金库
    const config = await tx.systemConfig.findFirst();
    if (config) {
      await tx.systemConfig.update({
        where: { id: config.id },
        data: { houseBalance: { increment: totalDeposit } },
      });
    }

    await tx.dispute.update({
      where: { id: disputeId },
      data: { status: DisputeStatus.REJECTED, resolvedAt: new Date() },
    });

    // 盘口恢复 CLOSED
    await tx.market.update({
      where: { id: dispute.marketId },
      data: { status: MarketStatus.CLOSED },
    });
  });
}

/**
 * Admin 支持申诉（手动撤市）
 */
export async function upholdDispute(disputeId: string): Promise<void> {
  await executeRevokeMarket(disputeId);
}

/**
 * 获取系统配置（不存在则创建默认值）
 */
export async function getConfig() {
  let config = await prisma.systemConfig.findFirst();
  if (!config) {
    config = await prisma.systemConfig.create({
      data: { defaultRake: 5, houseBalance: 0 },
    });
  }
  return config;
}
