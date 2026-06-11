"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
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
