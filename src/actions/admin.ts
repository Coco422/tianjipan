"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { MarketStatus } from "@prisma/client";
import { settleMarket as settle, cancelMarket as cancel } from "@/lib/settlement";
import { revalidatePath } from "next/cache";

export async function settleMarket(
  marketId: string,
  winningOptionId: string
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { error: "仅开盘长老可结算" };
  }

  try {
    await settle(marketId, winningOptionId);
    revalidatePath(`/markets/${marketId}`);
    revalidatePath("/leaderboard");
    revalidatePath("/");
    return { success: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function cancelMarket(marketId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { error: "仅开盘长老可取消盘口" };
  }

  try {
    await cancel(marketId);
    revalidatePath(`/markets/${marketId}`);
    revalidatePath("/");
    return { success: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function approveMarket(marketId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { error: "仅开盘长老可审核盘口" };
  }

  await prisma.market.update({
    where: { id: marketId },
    data: {
      status: MarketStatus.OPEN,
      reviewedAt: new Date(),
      reviewNote: "人工审核通过",
    },
  });

  revalidatePath(`/markets/${marketId}`);
  revalidatePath("/markets/pending");
  revalidatePath("/");
  return { success: true };
}

export async function rejectMarket(marketId: string, reason: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { error: "仅开盘长老可审核盘口" };
  }

  await prisma.market.update({
    where: { id: marketId },
    data: {
      status: MarketStatus.CANCELLED,
      reviewedAt: new Date(),
      reviewNote: reason || "人工审核未通过",
    },
  });

  revalidatePath(`/markets/${marketId}`);
  revalidatePath("/markets/pending");
  revalidatePath("/");
  return { success: true };
}

/**
 * Admin 重新触发 LLM 审核（用于低 confidence 的待审盘口）
 */
export async function retryAutoReview(marketId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { error: "仅开盘长老可操作" };
  }

  const { autoReviewMarket } = await import("./review");
  const result = await autoReviewMarket(marketId);

  revalidatePath(`/markets/${marketId}`);
  revalidatePath("/markets/pending");
  return result;
}
