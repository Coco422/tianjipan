import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { MarketStatus } from "@prisma/client";
import Link from "next/link";

export default async function PendingReviewPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  const markets = await prisma.market.findMany({
    where: { status: MarketStatus.PENDING_REVIEW },
    include: {
      options: { orderBy: { sortOrder: "asc" } },
      creator: { select: { nickname: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <h1 className="font-brush text-3xl text-ink-black mb-2">⚖ 审核队列</h1>
      <p className="text-ink-medium text-sm mb-6">
        待审核盘口: {markets.length} 个
      </p>

      {markets.length === 0 ? (
        <div className="ink-card p-12 text-center">
          <p className="text-ink-light text-lg">暂无待审盘口</p>
          <p className="text-ink-light text-sm mt-2">天机清静，无事可审</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {markets.map((market) => (
            <Link
              key={market.id}
              href={`/markets/${market.id}`}
              className="ink-card p-5 hover:shadow-lg transition-shadow no-underline text-ink-black block"
            >
              <div className="flex items-start justify-between mb-2">
                <h2 className="font-brush text-lg">{market.title}</h2>
                <span className="text-xs text-mist-blue">⊙ 审核中</span>
              </div>
              {market.description && (
                <p className="text-ink-medium text-sm mb-2 line-clamp-2">
                  {market.description}
                </p>
              )}
              <div className="flex items-center gap-4 text-xs text-ink-light">
                <span>类型: {market.type === "BINARY" ? "二选一" : "多选"}</span>
                <span>选项: {market.options.map((o) => o.label).join(" / ")}</span>
                <span>开盘人: {market.creator.nickname}</span>
                <span>
                  提交: {new Date(market.createdAt).toLocaleDateString("zh-CN")}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
