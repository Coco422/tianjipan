"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { MarketStatus } from "@prisma/client";
import { reviewMarket, AUTO_APPROVE_THRESHOLD, AUTO_REJECT_THRESHOLD } from "@/lib/review";
import { revalidatePath } from "next/cache";

/**
 * 对待审核盘口执行 LLM 审核
 * - confidence >= 0.8 + approved → 自动通过 → OPEN
 * - confidence >= 0.8 + rejected → 自动拒绝 → CANCELLED
 * - confidence < 0.8 → 保持 PENDING_REVIEW 等人工
 */
export async function autoReviewMarket(marketId: string) {
  const market = await prisma.market.findUnique({
    where: { id: marketId },
    include: { options: { orderBy: { sortOrder: "asc" } } },
  });

  if (!market || market.status !== MarketStatus.PENDING_REVIEW) {
    return { error: "盘口未找到或不在审核状态" };
  }

  const result = await reviewMarket({
    title: market.title,
    description: market.description,
    type: market.type,
    options: market.options.map((o) => o.label),
  });

  const note = `[LLM] ${result.reason}${result.issues?.length ? ` | 问题: ${result.issues.join(", ")}` : ""} (confidence: ${result.confidence.toFixed(2)})`;

  if (result.confidence >= AUTO_APPROVE_THRESHOLD) {
    if (result.approved) {
      // 自动通过
      await prisma.market.update({
        where: { id: marketId },
        data: {
          status: MarketStatus.OPEN,
          reviewedAt: new Date(),
          reviewNote: note,
        },
      });
      revalidatePath(`/markets/${marketId}`);
      revalidatePath("/");
      revalidatePath("/markets");
      return { success: true, action: "approved", note };
    } else {
      // 自动拒绝
      await prisma.market.update({
        where: { id: marketId },
        data: {
          status: MarketStatus.CANCELLED,
          reviewedAt: new Date(),
          reviewNote: note,
        },
      });
      revalidatePath(`/markets/${marketId}`);
      return { success: true, action: "rejected", note };
    }
  }

  // 低置信度 → 保持待审核，记录审核备注
  await prisma.market.update({
    where: { id: marketId },
    data: { reviewNote: note },
  });

  revalidatePath(`/markets/${marketId}`);
  revalidatePath("/markets/pending");
  return { success: true, action: "manual_review", note };
}

/**
 * Admin 手动审核通过
 */
export async function adminApprove(marketId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { error: "仅开盘长老可审核" };
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

/**
 * Admin 手动审核拒绝
 */
export async function adminReject(marketId: string, reason: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { error: "仅开盘长老可审核" };
  }

  await prisma.market.update({
    where: { id: marketId },
    data: {
      status: MarketStatus.CANCELLED,
      reviewedAt: new Date(),
      reviewNote: `人工审核拒绝: ${reason}`,
    },
  });

  revalidatePath(`/markets/${marketId}`);
  revalidatePath("/markets/pending");
  return { success: true };
}
