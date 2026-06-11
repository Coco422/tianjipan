"use client";

import { useState } from "react";
import { approveMarket, rejectMarket } from "@/actions/admin";

interface ReviewPanelProps {
  marketId: string;
}

export default function ReviewPanel({ marketId }: ReviewPanelProps) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleApprove() {
    setLoading(true);
    setResult(null);
    const res = await approveMarket(marketId);
    setLoading(false);
    if (res.error) setResult(res.error);
    else setResult("✓ 盘口已通过审核，开放下注");
  }

  async function handleReject() {
    if (!reason.trim()) {
      setResult("请填写拒绝理由");
      return;
    }
    setLoading(true);
    setResult(null);
    const res = await rejectMarket(marketId, reason);
    setLoading(false);
    if (res.error) setResult(res.error);
    else setResult("✓ 盘口已拒绝");
  }

  return (
    <div className="ink-card p-5 border-l-4 border-gold-accent">
      <h3 className="font-brush text-base mb-3 text-gold-accent">
        ⚖ 开盘长老审核
      </h3>

      {result && (
        <p className="text-sm mb-3 text-ink-medium">{result}</p>
      )}

      <div className="space-y-3">
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="拒绝理由（通过时可不填）"
          className="w-full bg-rice-paper border border-ink-black/10 rounded-sm p-2 text-sm text-ink-dark placeholder:text-ink-light resize-none"
          rows={2}
        />
        <div className="flex gap-2">
          <button
            onClick={handleApprove}
            disabled={loading}
            className="btn-ink flex-1"
          >
            {loading ? "处理中..." : "通过"}
          </button>
          <button
            onClick={handleReject}
            disabled={loading}
            className="btn-ink-outline flex-1 text-vermillion border-vermillion hover:bg-vermillion/10"
          >
            拒绝
          </button>
        </div>
      </div>
    </div>
  );
}
