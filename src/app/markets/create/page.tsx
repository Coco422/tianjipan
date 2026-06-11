"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createMarket } from "@/actions/market";

export default function CreateMarketPage() {
  const [type, setType] = useState<"BINARY" | "MULTI">("BINARY");
  const [options, setOptions] = useState(["会", "不会"]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function addOption() {
    setOptions([...options, ""]);
  }

  function removeOption(i: number) {
    if (options.length <= 2) return;
    setOptions(options.filter((_, idx) => idx !== i));
  }

  function updateOption(i: number, val: string) {
    const copy = [...options];
    copy[i] = val;
    setOptions(copy);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(e.currentTarget);
    options.forEach((o) => formData.append("options", o));
    formData.set("type", type);
    const result = await createMarket(formData);
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push("/markets");
      router.refresh();
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="font-brush text-3xl text-ink-black mb-6">☰ 开启天机</h1>
      <form onSubmit={handleSubmit} className="ink-card p-6 space-y-5">
        <div>
          <label className="block text-xs text-ink-medium mb-1">盘口标题</label>
          <input
            name="title"
            required
            maxLength={200}
            className="ink-input"
            placeholder="例: DeepSeek-R2 是否会在7月发布"
          />
        </div>

        <div>
          <label className="block text-xs text-ink-medium mb-1">
            详情 (可选)
          </label>
          <textarea
            name="description"
            rows={3}
            maxLength={1000}
            className="ink-input resize-none"
            placeholder="补充说明..."
          />
        </div>

        <div>
          <label className="block text-xs text-ink-medium mb-2">盘口类型</label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setType("BINARY");
                setOptions(["会", "不会"]);
              }}
              className={`flex-1 p-2 border text-sm cursor-pointer ${
                type === "BINARY"
                  ? "border-ink-black bg-rice-paper-2"
                  : "border-ink-light/30 bg-rice-paper"
              }`}
            >
              二选一
            </button>
            <button
              type="button"
              onClick={() => {
                setType("MULTI");
                setOptions(["", "", ""]);
              }}
              className={`flex-1 p-2 border text-sm cursor-pointer ${
                type === "MULTI"
                  ? "border-ink-black bg-rice-paper-2"
                  : "border-ink-light/30 bg-rice-paper"
              }`}
            >
              多选项
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs text-ink-medium mb-2">选项</label>
          <div className="space-y-2">
            {options.map((opt, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={opt}
                  onChange={(e) => updateOption(i, e.target.value)}
                  className="ink-input flex-1"
                  placeholder={`选项 ${i + 1}`}
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(i)}
                    className="text-vermillion text-xs px-2 cursor-pointer bg-transparent border-none"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          {type === "MULTI" && (
            <button
              type="button"
              onClick={addOption}
              className="text-mist-blue text-xs mt-2 cursor-pointer bg-transparent border-none"
            >
              + 添加选项
            </button>
          )}
        </div>

        {error && <p className="text-vermillion text-xs">{error}</p>}
        <button type="submit" className="btn-ink w-full" disabled={loading}>
          {loading ? "开启中..." : "开启天机"}
        </button>
      </form>
    </div>
  );
}
