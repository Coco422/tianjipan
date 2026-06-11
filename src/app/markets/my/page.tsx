import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { MarketStatus } from "@prisma/client";
import Link from "next/link";

const statusMap: Record<MarketStatus, { label: string; color: string }> = {
  PENDING_REVIEW: { label: "⊙ 审核中", color: "text-mist-blue" },
  OPEN: { label: "◉ 下注中", color: "text-jade-green" },
  CLOSED: { label: "◎ 待结算", color: "text-gold-accent" },
  DISPUTED: { label: "⚑ 申诉中", color: "text-vermillion" },
  SETTLED: { label: "● 已结算", color: "text-ink-light" },
  CANCELLED: { label: "○ 已取消", color: "text-vermillion" },
};

export default async function MyMarketsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const markets = await prisma.market.findMany({
    where: { creatorId: session.user.id },
    include: {
      options: { orderBy: { sortOrder: "asc" } },
      bets: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="font-brush text-3xl text-ink-black mb-2">☰ 我的盘口</h1>
      <p className="text-ink-medium text-sm mb-6">
        共 {markets.length} 个盘口
      </p>

      {markets.length === 0 ? (
        <div className="ink-card p-12 text-center">
          <p className="text-ink-light text-lg">你还没有开过盘</p>
          <Link
            href="/markets/create"
            className="btn-ink inline-block mt-4 no-underline"
          >
            开启天机
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {markets.map((market) => {
            const st = statusMap[market.status];
            return (
              <Link
                key={market.id}
                href={`/markets/${market.id}`}
                className="ink-card p-5 hover:shadow-lg transition-shadow no-underline text-ink-black block"
              >
                <div className="flex items-start justify-between mb-2">
                  <h2 className="font-brush text-lg">{market.title}</h2>
                  <span className={`text-xs ${st.color}`}>{st.label}</span>
                </div>

                {/* 审核备注（被拒绝时显示） */}
                {market.status === MarketStatus.CANCELLED && market.reviewNote && (
                  <p className="text-xs text-vermillion mb-2 bg-vermillion/5 p-2 rounded-sm">
                    {market.reviewNote}
                  </p>
                )}

                {/* 审核备注（待审核时显示 LLM 低置信度备注） */}
                {market.status === MarketStatus.PENDING_REVIEW && market.reviewNote && (
                  <p className="text-xs text-mist-blue mb-2 bg-mist-blue/5 p-2 rounded-sm">
                    {market.reviewNote}
                  </p>
                )}

                <div className="flex items-center gap-4 text-xs text-ink-light">
                  <span>
                    类型: {market.type === "BINARY" ? "二选一" : "多选"}
                  </span>
                  <span>选项: {market.options.map((o) => o.label).join(" / ")}</span>
                  <span>{market.bets.length} 人下注</span>
                  <span>
                    {new Date(market.createdAt).toLocaleDateString("zh-CN")}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
