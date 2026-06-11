import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { calculateOdds } from "@/lib/odds";
import { MarketStatus } from "@prisma/client";
import BetForm from "@/components/market/BetForm";
import SettlementPanel from "@/components/market/SettlementPanel";

export default async function MarketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const market = await prisma.market.findUnique({
    where: { id },
    include: {
      options: { orderBy: { sortOrder: "asc" } },
      bets: { include: { user: { select: { nickname: true } } } },
      creator: { select: { id: true, nickname: true } },
    },
  });

  if (!market) {
    return (
      <div className="ink-card p-12 text-center">
        <p className="text-ink-light">盘口不存在</p>
      </div>
    );
  }

  const odds = calculateOdds(market.options, market.bets);
  const userBet = market.bets.find((b) => b.userId === session.user.id);
  const isAdmin = session.user.role === "ADMIN";

  const statusLabels: Record<MarketStatus, string> = {
    OPEN: "◉ 下注中",
    CLOSED: "◎ 待结算",
    SETTLED: "● 已结算",
    CANCELLED: "○ 已取消",
  };

  const winnerOption = market.options.find((o) => o.isWinner);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="ink-card p-6">
        <div className="flex items-start justify-between mb-3">
          <h1 className="font-brush text-2xl text-ink-black">{market.title}</h1>
          <span
            className={`text-xs ${
              market.status === MarketStatus.OPEN
                ? "text-jade-green"
                : market.status === MarketStatus.SETTLED
                  ? "text-ink-light"
                  : "text-gold-accent"
            }`}
          >
            {statusLabels[market.status]}
          </span>
        </div>
        {market.description && (
          <p className="text-ink-medium text-sm mb-3">{market.description}</p>
        )}
        <div className="flex items-center gap-4 text-xs text-ink-light">
          <span>开盘: {market.creator.nickname}</span>
          <span>
            创建:{" "}
            {new Date(market.createdAt).toLocaleDateString("zh-CN")}
          </span>
        </div>
      </div>

      {/* Odds */}
      <div className="ink-card p-5">
        <h2 className="font-brush text-lg mb-3">
          ☯ 天机推演
        </h2>
        <div className="text-center mb-4">
          <span className="text-xs text-ink-medium">总彩池</span>
          <div className="spirit-stone text-xl">{odds.totalPool}</div>
        </div>
        <div className="space-y-3">
          {odds.options.map((opt) => {
            const isWinner = market.options.find(
              (o) => o.id === opt.optionId
            )?.isWinner;
            return (
              <div key={opt.optionId}>
                <div className="flex justify-between text-sm mb-1">
                  <span className={isWinner ? "text-jade-green font-bold" : ""}>
                    {opt.label}{" "}
                    {isWinner && (
                      <span className="seal-stamp text-xs ml-1">胜</span>
                    )}
                  </span>
                  <span className="text-ink-medium text-xs">
                    {opt.totalWagered} 灵石 · {opt.bettorCount} 人 ·{" "}
                    {opt.impliedOdds > 0
                      ? `${opt.impliedOdds.toFixed(2)}x`
                      : "--"}
                  </span>
                </div>
                <div className="odds-bar">
                  <div
                    className="odds-bar-fill"
                    style={{ width: `${opt.impliedProb}%` }}
                  />
                </div>
                <div className="text-right text-xs text-ink-light">
                  {opt.impliedProb.toFixed(1)}%
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* User's Bet */}
      {userBet && (
        <div className="ink-card p-4">
          <h3 className="font-brush text-base mb-2">你的下注</h3>
          <div className="flex items-center gap-4 text-sm">
            <span>
              方向:{" "}
              <strong>
                {market.options.find((o) => o.id === userBet.optionId)?.label}
              </strong>
            </span>
            <span className="spirit-stone">{userBet.amount}</span>
            {userBet.payout !== null && userBet.payout !== undefined && (
              <span
                className={
                  userBet.payout > 0 ? "text-jade-green" : "text-vermillion"
                }
              >
                {userBet.payout > 0
                  ? `获得 ${userBet.payout} 灵石`
                  : "未中"}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Bet Form */}
      {market.status === MarketStatus.OPEN && !userBet && (
        <BetForm
          marketId={market.id}
          options={market.options.map((o) => ({ id: o.id, label: o.label }))}
          balance={session.user.balance}
        />
      )}

      {/* Admin: Close Market */}
      {isAdmin && market.status === MarketStatus.OPEN && (
        <form
          action={async () => {
            "use server";
            const { closeMarket } = await import("@/actions/market");
            await closeMarket(market.id);
          }}
        >
          <button type="submit" className="btn-ink-outline w-full">
            关闭下注
          </button>
        </form>
      )}

      {/* Admin: Settlement */}
      {isAdmin && market.status === MarketStatus.CLOSED && (
        <SettlementPanel
          marketId={market.id}
          options={market.options.map((o) => ({ id: o.id, label: o.label }))}
        />
      )}

      {/* Settled Result */}
      {market.status === MarketStatus.SETTLED && winnerOption && (
        <div className="ink-card p-4 text-center">
          <p className="text-ink-medium text-xs mb-1">天道裁决</p>
          <p className="font-brush text-xl text-jade-green">{winnerOption.label}</p>
          <p className="text-xs text-ink-light mt-1">
            已于{" "}
            {market.settledAt
              ? new Date(market.settledAt).toLocaleString("zh-CN")
              : ""}
            结算
          </p>
        </div>
      )}

      {/* Bettors List */}
      {market.bets.length > 0 && (
        <div className="ink-card p-4">
          <h3 className="font-brush text-base mb-3">下注记录</h3>
          <div className="space-y-2 text-sm">
            {market.bets.map((bet) => (
              <div
                key={bet.id}
                className="flex justify-between items-center py-1 border-b border-ink-black/5 last:border-0"
              >
                <span className="text-ink-dark">
                  {bet.user.nickname}
                </span>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-ink-medium">
                    {market.options.find((o) => o.id === bet.optionId)?.label}
                  </span>
                  <span className="spirit-stone">{bet.amount}</span>
                  {bet.payout !== null && bet.payout !== undefined && (
                    <span
                      className={
                        bet.payout > 0 ? "text-jade-green" : "text-ink-light"
                      }
                    >
                      {bet.payout > 0 ? `+${bet.payout}` : "未中"}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
