import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { MarketStatus } from "@prisma/client";
import { calculateOdds } from "@/lib/odds";

export default async function HomePage() {
  const markets = await prisma.market.findMany({
    where: {
      status: { in: [MarketStatus.OPEN, MarketStatus.CLOSED] },
    },
    include: {
      options: true,
      bets: true,
      creator: { select: { nickname: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <div>
      <div className="text-center mb-10">
        <h1 className="font-brush text-4xl text-ink-black mb-2">
          ☰ 天机盘
        </h1>
        <p className="text-ink-medium text-sm">
          诸位道友，今日天机已现，请下注
        </p>
        <div className="ink-divider mt-4">━━━ ✦ ━━━</div>
      </div>

      {markets.length === 0 ? (
        <div className="ink-card p-12 text-center">
          <p className="text-ink-light text-lg">暂无盘口</p>
          <p className="text-ink-light text-sm mt-2">
            等待开盘长老揭示天机...
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {markets.map((market) => {
            const odds = calculateOdds(market.options, market.bets, market.rakePercent);
            const statusLabel =
              market.status === MarketStatus.OPEN ? "◉ 下注中" : "◎ 待结算";
            const statusColor =
              market.status === MarketStatus.OPEN
                ? "text-jade-green"
                : "text-gold-accent";

            return (
              <Link
                key={market.id}
                href={`/markets/${market.id}`}
                className="ink-card p-5 hover:shadow-lg transition-shadow no-underline text-ink-black block"
              >
                <div className="flex items-start justify-between mb-3">
                  <h2 className="font-brush text-xl">{market.title}</h2>
                  <span className={`text-xs ${statusColor}`}>{statusLabel}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-ink-medium">
                  <span>
                    彩池{" "}
                    <span className="spirit-stone">{odds.totalPool}</span>
                  </span>
                  <span>{market.bets.length} 人下注</span>
                  <span>开盘: {market.creator.nickname}</span>
                </div>
                <div className="mt-3 flex gap-2">
                  {odds.options.map((opt) => (
                    <div
                      key={opt.optionId}
                      className="flex-1 bg-rice-paper rounded-sm p-2"
                    >
                      <div className="text-xs text-ink-medium mb-1">
                        {opt.label}
                      </div>
                      <div className="odds-bar">
                        <div
                          className="odds-bar-fill"
                          style={{ width: `${opt.impliedProb}%` }}
                        />
                      </div>
                      <div className="text-xs text-ink-light mt-1">
                        {opt.impliedOdds > 0
                          ? `${opt.impliedOdds.toFixed(2)}x`
                          : "--"}
                      </div>
                    </div>
                  ))}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
