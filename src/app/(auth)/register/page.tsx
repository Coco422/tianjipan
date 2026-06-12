"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { register } from "@/actions/auth";

export default function RegisterPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(e.currentTarget);
    const result = await register(formData);
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-16 relative">
      {/* 装饰插画 */}
      <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-64 opacity-25 pointer-events-none" aria-hidden="true">
        <img src="/illustrations/empty-market.png" alt="" className="w-full h-auto" />
      </div>
      <div className="text-center mb-8 relative">
        <h1 className="font-brush text-3xl mb-2">修炼</h1>
        <p className="text-ink-medium text-sm">取得道号，获赠 1000 灵石</p>
      </div>
      <form onSubmit={handleSubmit} className="ink-card p-6 space-y-4">
        <div>
          <label className="block text-xs text-ink-medium mb-1">道号</label>
          <input
            name="nickname"
            type="text"
            required
            minLength={2}
            maxLength={20}
            className="ink-input"
            placeholder="取一个道号"
          />
        </div>
        <div>
          <label className="block text-xs text-ink-medium mb-1">密码</label>
          <input
            name="password"
            type="password"
            required
            minLength={4}
            className="ink-input"
            placeholder="密码至少四位"
          />
        </div>
        {error && <p className="text-vermillion text-xs">{error}</p>}
        <button type="submit" className="btn-ink w-full" disabled={loading}>
          {loading ? "修炼中..." : "开始修炼"}
        </button>
      </form>
      <p className="text-center text-xs text-ink-light mt-4">
        已有道号？{" "}
        <Link href="/login" className="text-mist-blue no-underline">
          入道
        </Link>
      </p>
    </div>
  );
}
