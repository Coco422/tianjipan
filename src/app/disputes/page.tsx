import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DisputeStatus } from "@prisma/client";
import Link from "next/link";

export default async function DisputesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const isAdmin = session.user.role === "ADMIN";

  // Admin 看所有，普通用户看自己参与的
  const disputes = await prisma.dispute.findMany({
    where: isAdmin
      ? {}
      : {
          OR: [
            { filedById: session.user.id },
            { votes: { some: { userId: session.user.id } } },
          ],
        },
    include: {
      market: { select: { id: true, title: true, status: true } },
      filedBy: { select: { nickname: true } },
      votes: {
        include: { user: { select: { nickname: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const statusMap: Record<DisputeStatus, { label: string; color: string }> = {
    OPEN: { label: "⚑ 进行中", color: "text-vermillion" },
    PASSED: { label: "✓ 通过", color: "text-jade-green" },
    REJECTED: { label: "✕ 驳回", color: "text-ink-light" },
    CANCELLED: { label: "○ 撤回", color: "text-ink-light" },
  };

  return (
    <div>
      <h1 className="font-brush text-3xl text-ink-black mb-2">⚑ 申诉记录</h1>
      <p className="text-ink-medium text-sm mb-6">
        {isAdmin ? "所有申诉" : "我参与的申诉"}: {disputes.length} 条
      </p>

      {disputes.length === 0 ? (
        <div className="ink-card p-12 text-center">
          <p className="text-ink-light text-lg">暂无申诉记录</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {disputes.map((dispute) => {
            const st = statusMap[dispute.status];
            return (
              <Link
                key={dispute.id}
                href={`/markets/${dispute.market.id}`}
                className="ink-card p-5 hover:shadow-lg transition-shadow no-underline text-ink-black block"
              >
                <div className="flex items-start justify-between mb-2">
                  <h2 className="font-brush text-lg">{dispute.market.title}</h2>
                  <span className={`text-xs ${st.color}`}>{st.label}</span>
                </div>
                <p className="text-sm text-ink-medium mb-2 line-clamp-1">
                  {dispute.reason}
                </p>
                <div className="flex items-center gap-4 text-xs text-ink-light">
                  <span>发起: {dispute.filedBy.nickname}</span>
                  <span>附议: {dispute.votes.length} 人</span>
                  <span>
                    {new Date(dispute.createdAt).toLocaleDateString("zh-CN")}
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
