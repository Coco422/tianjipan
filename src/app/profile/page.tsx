import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      nickname: true,
      balance: true,
      role: true,
      createdAt: true,
      bets: {
        include: {
          market: { select: { id: true, title: true, status: true } },
          option: { select: { label: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!user) redirect("/login");

  const totalBets = user.bets.length;
  const wins = user.bets.filter((b) => b.payout !== null && b.payout! > 0).length;
  const totalWon = user.bets.reduce((sum, b) => sum + (b.payout || 0), 0);
  const totalWagered = user.bets.reduce((sum, b) => sum + b.amount, 0);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="ink-card p-6 text-center">
        <h1 className="font-brush text-3xl text-ink-black mb-1">
          {user.nickname}
        </h1>
        {user.role === "ADMIN" && (
          <span className="seal-stamp text-xs">开盘长老</span>
        )}
        <div className="mt-4">
          <span className="text-xs text-ink-medium">灵石余额</span>
          <div className="spirit-stone text-2xl">{user.balance}</div>
        </div>
        <div className="ink-divider mt-4">━━━ ✦ ━━━</div>
        <div className="grid grid-cols-3 gap-4 mt-4 text-center">
          <div>
            <div className="text-lg font-bold text-ink-dark">{totalBets}</div>
            <div className="text-xs text-ink-light">总下注</div>
          </div>
          <div>
            <div className="text-lg font-bold text-jade-green">{wins}</div>
            <div className="text-xs text-ink-light">获胜</div>
          </div>
          <div>
            <div className="text-lg font-bold text-ink-dark">
              {totalBets > 0 ? Math.round((wins / totalBets) * 100) : 0}%
            </div>
            <div className="text-xs text-ink-light">胜率</div>
          </div>
        </div>
      </div>

      {user.bets.length > 0 && (
        <div className="ink-card p-5">
          <h2 className="font-brush text-lg mb-3">下注记录</h2>
          <div className="space-y-2">
            {user.bets.map((bet) => {
              const won =
                bet.payout !== null && bet.payout > 0;
              return (
                <Link
                  key={bet.id}
                  href={`/markets/${bet.market.id}`}
                  className="flex justify-between items-center py-2 border-b border-ink-black/5 last:border-0 no-underline text-ink-black hover:bg-rice-paper/50 px-2 -mx-2 transition-colors"
                >
                  <div className="flex-1">
                    <div className="text-sm">{bet.market.title}</div>
                    <div className="text-xs text-ink-light">
                      押 {bet.option.label} · {bet.amount} 灵石
                    </div>
                  </div>
                  <div className="text-sm">
                    {bet.market.status === "SETTLED" ? (
                      won ? (
                        <span className="text-jade-green">
                          +{bet.payout! - bet.amount}
                        </span>
                      ) : (
                        <span className="text-vermillion">-{bet.amount}</span>
                      )
                    ) : (
                      <span className="text-ink-light">待定</span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
