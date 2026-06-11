"use client";

import { useState } from "react";
import { placeBet } from "@/actions/market";

interface BetFormProps {
  marketId: string;
  options: { id: string; label: string }[];
  balance: number;
}

export default function BetForm({ marketId, options, balance }: BetFormProps) {
  const [selected, setSelected] = useState(options[0]?.id || "");
  const [amount, setAmount] = useState(100);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const quickAmounts = [50, 100, 250, 500];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setLoading(true);
    setError("");
    const result = await placeBet(marketId, selected, amount);
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setDone(true);
    }
  }

  if (done) {
    return (
      <div className="ink-card p-4 text-center">
        <p className="text-jade-green font-brush text-lg">下注成功！</p>
        <p className="text-ink-medium text-xs mt-1">静待天道裁决...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="ink-card p-4 space-y-4">
      <h3 className="font-brush text-lg text-ink-black">压注</h3>

      <div>
        <label className="block text-xs text-ink-medium mb-2">选择方向</label>
        <div className="flex gap-2">
          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setSelected(opt.id)}
              className={`flex-1 py-2 px-3 border text-sm cursor-pointer transition-colors ${
                selected === opt.id
                  ? "border-ink-black bg-rice-paper-2 font-bold"
                  : "border-ink-light/30 bg-rice-paper hover:border-ink-medium"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs text-ink-medium mb-2">
          灵石数量 <span className="text-ink-light">(余额: {balance})</span>
        </label>
        <div className="flex gap-2 mb-2">
          {quickAmounts.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setAmount(q)}
              className={`text-xs px-3 py-1 border cursor-pointer ${
                amount === q
                  ? "border-gold-accent text-gold-accent"
                  : "border-ink-light/30 text-ink-medium"
              } bg-transparent`}
            >
              {q}
            </button>
          ))}
        </div>
        <input
          type="number"
          min={1}
          max={balance}
          value={amount}
          onChange={(e) => setAmount(Math.max(1, Number(e.target.value)))}
          className="ink-input"
        />
      </div>

      {error && <p className="text-vermillion text-xs">{error}</p>}
      <button type="submit" className="btn-ink w-full" disabled={loading}>
        {loading ? "下注中..." : `投入 ${amount} 灵石`}
      </button>
    </form>
  );
}
