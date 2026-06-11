"use client";

import { useState } from "react";
import { MarketStatus } from "@prisma/client";
import {
  fileDisputeAction,
  voteDisputeAction,
  rejectDisputeAction,
  upholdDisputeAction,
} from "@/actions/dispute";

interface DisputeVote {
  id: string;
  amount: number;
  userId: string;
  user: { id: string; nickname: string };
}

interface Dispute {
  id: string;
  reason: string;
  status: string;
  filedBy: { id: string; nickname: string };
  votes: DisputeVote[];
}

interface DisputeSectionProps {
  marketId: string;
  marketStatus: MarketStatus;
  disputes: Dispute[];
  userBet: { id: string } | null;
  userId: string;
  isAdmin: boolean;
}

export default function DisputeSection({
  marketId,
  marketStatus,
  disputes,
  userBet,
  userId,
  isAdmin,
}: DisputeSectionProps) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const activeDispute = disputes.find((d) => d.status === "OPEN");
  const hasVoted = activeDispute?.votes.some((v) => v.userId === userId);

  // 只有 CLOSED 或 DISPUTED 状态才显示申诉区域
  if (
    marketStatus !== MarketStatus.CLOSED &&
    marketStatus !== MarketStatus.DISPUTED
  ) {
    return null;
  }

  async function handleFileDispute() {
    if (!reason.trim()) {
      setMessage("请填写申诉理由");
      return;
    }
    setLoading(true);
    setMessage(null);
    const res = await fileDisputeAction(marketId, reason);
    setLoading(false);
    if (res.error) setMessage(res.error);
    else {
      setMessage("✓ 申诉已提交");
      setReason("");
    }
  }

  async function handleVote() {
    if (!activeDispute) return;
    setLoading(true);
    setMessage(null);
    const res = await voteDisputeAction(activeDispute.id);
    setLoading(false);
    if (res.error) setMessage(res.error);
    else setMessage("✓ 已附议");
  }

  async function handleAdminReject() {
    if (!activeDispute) return;
    setLoading(true);
    setMessage(null);
    const res = await rejectDisputeAction(activeDispute.id);
    setLoading(false);
    if (res.error) setMessage(res.error);
    else setMessage("✓ 申诉已驳回");
  }

  async function handleAdminUphold() {
    if (!activeDispute) return;
    setLoading(true);
    setMessage(null);
    const res = await upholdDisputeAction(activeDispute.id);
    setLoading(false);
    if (res.error) setMessage(res.error);
    else setMessage("✓ 申诉通过，盘口已撤市");
  }

  return (
    <div className="ink-card p-5 border-l-4 border-vermillion">
      <h3 className="font-brush text-base mb-3 text-vermillion">
        ⚑ 申诉撤市
      </h3>

      {/* 已有申诉 - 显示投票进度 */}
      {activeDispute && (
        <div className="space-y-3">
          <div className="bg-rice-paper/50 p-3 rounded-sm">
            <p className="text-sm text-ink-dark">
              <strong>{activeDispute.filedBy.nickname}</strong> 发起申诉:
            </p>
            <p className="text-xs text-ink-medium mt-1">{activeDispute.reason}</p>
          </div>

          <div className="text-xs text-ink-light">
            附议人数: {activeDispute.votes.length}
          </div>

          {/* 投票列表 */}
          <div className="space-y-1">
            {activeDispute.votes.map((vote) => (
              <div
                key={vote.id}
                className="flex items-center gap-2 text-xs text-ink-medium"
              >
                <span>{vote.user.nickname}</span>
                <span className="text-ink-light">
                  ({vote.amount} 灵石)
                </span>
                {vote.userId === activeDispute.filedBy.id && (
                  <span className="text-xs text-gold-accent">发起人</span>
                )}
              </div>
            ))}
          </div>

          {/* 附议按钮 */}
          {userBet && !hasVoted && (
            <button
              onClick={handleVote}
              disabled={loading}
              className="btn-ink-outline w-full text-vermillion border-vermillion hover:bg-vermillion/10"
            >
              {loading ? "处理中..." : "附议（-5 灵石）"}
            </button>
          )}

          {hasVoted && (
            <p className="text-xs text-ink-light text-center">你已附议</p>
          )}

          {/* Admin 操作 */}
          {isAdmin && (
            <div className="flex gap-2 pt-2 border-t border-ink-black/5">
              <button
                onClick={handleAdminUphold}
                disabled={loading}
                className="btn-ink flex-1"
              >
                支持撤市
              </button>
              <button
                onClick={handleAdminReject}
                disabled={loading}
                className="btn-ink-outline flex-1 text-vermillion border-vermillion"
              >
                驳回
              </button>
            </div>
          )}
        </div>
      )}

      {/* 没有申诉 - 显示发起按钮 */}
      {!activeDispute && userBet && marketStatus === MarketStatus.CLOSED && (
        <div className="space-y-3">
          <p className="text-xs text-ink-light">
            对盘口结果有异议？发起申诉，其他投注者附议达到阈值后自动撤市退款。
          </p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="申诉理由..."
            className="w-full bg-rice-paper border border-ink-black/10 rounded-sm p-2 text-sm text-ink-dark placeholder:text-ink-light resize-none"
            rows={2}
          />
          <button
            onClick={handleFileDispute}
            disabled={loading}
            className="btn-ink-outline w-full text-vermillion border-vermillion hover:bg-vermillion/10"
          >
            {loading ? "处理中..." : "发起申诉（-10 灵石）"}
          </button>
        </div>
      )}

      {message && (
        <p className="text-xs text-ink-medium mt-2 text-center">{message}</p>
      )}
    </div>
  );
}
