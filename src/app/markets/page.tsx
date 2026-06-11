import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { calculateOdds } from "@/lib/odds";
import Link from "next/link";
import { MarketStatus } from "@prisma/client";

export default async function MarketsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const markets = await prisma.market.findMany({
    include: {
      options: true,
      bets: true,
      creator: { select: { nickname: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const statusMap: Record<MarketStatus, { label: string; color: string }> = {
    OPEN: { label: "◉ 下注中", color: "text-jade-green" },
    CLOSED: { label: "◎ 待结算", color: "text-gold-accent" },
    SETTLED: { label: "● 已结算", color: "text-ink-light" },
    CANCELLED: { label: "○ 已取消", color: "text-ink-light" },
  };

  return (
    <div>
      <h1 className="font-brush text-3xl text-ink-black mb-6">☰ 所有盘口</h1>
      <div className="grid gap-4">
        {markets.map((market) => {
          const odds = calculateOdds(market.options, market.bets);
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
              <div className="flex items-center gap-4 text-xs text-ink-medium">
                <span className="spirit-stone">{odds.totalPool}</span>
                <span>{market.bets.length} 人</span>
                <span>{market.creator.nickname}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
