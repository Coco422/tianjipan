"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { login } from "@/actions/auth";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(e.currentTarget);
    const result = await login(formData);
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-16">
      <div className="text-center mb-8">
        <h1 className="font-brush text-3xl mb-2">入道</h1>
        <p className="text-ink-medium text-sm">输入道号，踏入天机</p>
      </div>
      <form onSubmit={handleSubmit} className="ink-card p-6 space-y-4">
        <div>
          <label className="block text-xs text-ink-medium mb-1">道号</label>
          <input
            name="nickname"
            type="text"
            required
            className="ink-input"
            placeholder="你的道号"
          />
        </div>
        <div>
          <label className="block text-xs text-ink-medium mb-1">密码</label>
          <input
            name="password"
            type="password"
            required
            className="ink-input"
            placeholder="密码"
          />
        </div>
        {error && <p className="text-vermillion text-xs">{error}</p>}
        <button type="submit" className="btn-ink w-full" disabled={loading}>
          {loading ? "入道中..." : "踏入天机"}
        </button>
      </form>
      <p className="text-center text-xs text-ink-light mt-4">
        尚无道号？{" "}
        <Link href="/register" className="text-mist-blue no-underline">
          立刻修炼
        </Link>
      </p>
    </div>
  );
}
