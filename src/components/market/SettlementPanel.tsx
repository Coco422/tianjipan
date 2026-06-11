"use client";

import { useState } from "react";
import { settleMarket, cancelMarket } from "@/actions/admin";

interface SettlementPanelProps {
  marketId: string;
  options: { id: string; label: string }[];
}

export default function SettlementPanel({
  marketId,
  options,
}: SettlementPanelProps) {
  const [winnerId, setWinnerId] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSettle() {
    if (!winnerId) return;
    setLoading(true);
    setError("");
    const result = await settleMarket(marketId, winnerId);
    if (result.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  async function handleCancel() {
    setLoading(true);
    setError("");
    const result = await cancelMarket(marketId);
    if (result.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="ink-card p-4 space-y-4">
      <h3 className="font-brush text-lg text-vermillion">天道裁决</h3>

      <div>
        <label className="block text-xs text-ink-medium mb-2">
          选择胜出选项
        </label>
        <div className="flex gap-2">
          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                setWinnerId(opt.id);
                setConfirming(false);
              }}
              className={`flex-1 py-2 px-3 border text-sm cursor-pointer ${
                winnerId === opt.id
                  ? "border-jade-green bg-jade-green/10 text-jade-green font-bold"
                  : "border-ink-light/30 bg-rice-paper"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-vermillion text-xs">{error}</p>}

      {winnerId && !confirming && (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="btn-ink w-full"
        >
          确认结算
        </button>
      )}

      {confirming && (
        <div className="border border-vermillion/30 p-3 rounded-sm">
          <p className="text-sm text-ink-dark mb-3">
            确定{" "}
            <span className="font-bold text-jade-green">
              {options.find((o) => o.id === winnerId)?.label}
            </span>{" "}
            胜出？此操作不可撤销。
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSettle}
              className="btn-ink flex-1"
              disabled={loading}
            >
              {loading ? "裁决中..." : "天道裁决"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="btn-ink-outline flex-1"
              disabled={loading}
            >
              取消
            </button>
          </div>
        </div>
      )}

      <div className="ink-divider">━━━ ✦ ━━━</div>

      <button
        type="button"
        onClick={handleCancel}
        className="btn-ink-outline w-full text-vermillion border-vermillion/30 hover:border-vermillion"
        disabled={loading}
      >
        取消盘口（全额退款）
      </button>
    </div>
  );
}
