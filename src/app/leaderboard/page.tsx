import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export default async function LeaderboardPage() {
  const session = await auth();

  const users = await prisma.user.findMany({
    select: {
      id: true,
      nickname: true,
      balance: true,
      bets: {
        select: { payout: true },
      },
    },
    orderBy: { balance: "desc" },
    take: 50,
  });

  const ranked = users.map((u) => {
    const totalBets = u.bets.length;
    const wins = u.bets.filter((b) => b.payout !== null && b.payout! > 0).length;
    const winRate = totalBets > 0 ? Math.round((wins / totalBets) * 100) : 0;
    return { ...u, totalBets, wins, winRate };
  });

  const rankStyles = ["rank-gold", "rank-silver", "rank-bronze"];
  const rankLabels = ["壹", "贰", "叁"];

  // 数字转繁体中文
  const cnDigits = ["零", "壹", "贰", "叁", "肆", "伍", "陆", "柒", "捌", "玖"];
  function toCnNum(n: number): string {
    if (n <= 10) return cnDigits[n] ?? String(n);
    if (n < 20) return "拾" + (n % 10 === 0 ? "" : cnDigits[n % 10]);
    if (n < 100) {
      const tens = Math.floor(n / 10);
      const ones = n % 10;
      return cnDigits[tens] + "拾" + (ones === 0 ? "" : cnDigits[ones]);
    }
    return String(n); // fallback
  }

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="font-brush text-3xl text-ink-black mb-2">
          ☰ 宗门天榜
        </h1>
        <p className="text-ink-medium text-xs">
          灵石排行 · 道友之争
        </p>
        <div className="ink-divider mt-3">━━━ ✦ ━━━</div>
      </div>

      <div className="grid gap-2">
        {ranked.map((user, i) => {
          const isMe = session?.user?.id === user.id;
          const rankClass = i < 3 ? rankStyles[i] : "";
          return (
            <div
              key={user.id}
              className={`ink-card p-4 flex items-center gap-4 ${
                isMe ? "ring-1 ring-gold-accent/30" : ""
              }`}
            >
              <div
                className={`font-brush text-2xl w-10 text-center ${rankClass}`}
              >
                {i < 3 ? rankLabels[i] : toCnNum(i + 1)}
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold text-ink-dark">
                  {user.nickname}
                  {isMe && (
                    <span className="text-xs text-ink-light ml-2">(你)</span>
                  )}
                </div>
                <div className="text-xs text-ink-light">
                  {user.totalBets} 战 {user.wins} 胜 · 胜率 {user.winRate}%
                </div>
              </div>
              <div className="spirit-stone text-lg">{user.balance}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
