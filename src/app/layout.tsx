import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { auth, signOut } from "@/lib/auth";

export const metadata: Metadata = {
  title: "天机盘 — 修仙预测市场",
  description: "诸位道友，今日天机已现，请下注",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {/* ── Header ──────────────────────────────── */}
        <header className="border-b border-ink-black/10 bg-rice-paper/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 no-underline">
              <span className="font-brush text-2xl text-ink-black tracking-wider">
                天机盘
              </span>
              <span className="text-xs text-ink-light">TianJiPan</span>
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link
                href="/markets"
                className="text-ink-dark hover:text-ink-black no-underline"
              >
                盘口
              </Link>
              <Link
                href="/leaderboard"
                className="text-ink-dark hover:text-ink-black no-underline"
              >
                天榜
              </Link>
              {session?.user ? (
                <>
                  <Link
                    href="/profile"
                    className="text-ink-dark hover:text-ink-black no-underline"
                  >
                    {session.user.nickname}
                    <span className="spirit-stone text-xs ml-1">
                      {session.user.balance}
                    </span>
                  </Link>
                  {session.user.role === "ADMIN" && (
                    <Link
                      href="/markets/create"
                      className="text-gold-accent hover:text-ink-black no-underline"
                    >
                      开盘
                    </Link>
                  )}
                  <form
                    action={async () => {
                      "use server";
                      await signOut({ redirectTo: "/" });
                    }}
                  >
                    <button
                      type="submit"
                      className="text-ink-light hover:text-vermillion text-xs cursor-pointer bg-transparent border-none"
                    >
                      登出
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-ink-dark hover:text-ink-black no-underline"
                  >
                    登录
                  </Link>
                  <Link href="/register" className="btn-ink text-xs !py-1 !px-3 no-underline">
                    注册
                  </Link>
                </>
              )}
            </nav>
          </div>
        </header>

        {/* ── Main ────────────────────────────────── */}
        <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
          {children}
        </main>

        {/* ── Footer ──────────────────────────────── */}
        <footer className="ink-divider py-4">
          ━━━ ✦ 天机不可泄露 ✦ ━━━
        </footer>
      </body>
    </html>
  );
}
