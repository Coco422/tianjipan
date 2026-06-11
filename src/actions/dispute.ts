"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DisputeStatus, MarketStatus } from "@prisma/client";
import {
  fileDispute,
  voteDispute,
  rejectDispute,
  upholdDispute,
} from "@/lib/dispute";
import { revalidatePath } from "next/cache";

export async function fileDisputeAction(marketId: string, reason: string) {
  const session = await auth();
  if (!session?.user) return { error: "请先登录" };

  if (!reason.trim()) return { error: "请填写申诉理由" };

  try {
    await fileDispute(marketId, session.user.id, reason);
    revalidatePath(`/markets/${marketId}`);
    revalidatePath("/");
    return { success: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function voteDisputeAction(disputeId: string) {
  const session = await auth();
  if (!session?.user) return { error: "请先登录" };

  try {
    await voteDispute(disputeId, session.user.id);
    revalidatePath(`/markets/[id]`);
    return { success: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function rejectDisputeAction(disputeId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { error: "仅开盘长老可处理申诉" };
  }

  try {
    await rejectDispute(disputeId);
    revalidatePath("/disputes");
    revalidatePath("/");
    return { success: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function upholdDisputeAction(disputeId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { error: "仅开盘长老可处理申诉" };
  }

  try {
    await upholdDispute(disputeId);
    revalidatePath("/disputes");
    revalidatePath("/");
    return { success: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
