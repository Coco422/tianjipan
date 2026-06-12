import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { auth, signOut } from "@/lib/auth";

const siteTitle = "天机盘 — 修仙预测市场";
const siteDescription = "诸位道友，今日天机已现，请下注";
const metadataBase = new URL(
  process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000"),
);
const ogImage = {
  url: "/og.png",
  width: 1200,
  height: 630,
  alt: "天机盘 - 诸位道友，请下注",
};

export const metadata: Metadata = {
  metadataBase,
  title: siteTitle,
  description: siteDescription,
  applicationName: "天机盘",
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    type: "website",
    locale: "zh_CN",
    siteName: "天机盘",
    images: [ogImage],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: [ogImage],
  },
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
          {/* 水墨山峦装饰 */}
          <div className="absolute inset-x-0 top-0 h-20 pointer-events-none opacity-45 overflow-hidden">
            <img
              src="/decorations/mountains.svg"
              alt=""
              className="w-full h-full object-cover object-bottom"
              aria-hidden="true"
            />
          </div>
          <div className="relative max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
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
                  <Link
                    href="/markets/create"
                    className="text-gold-accent hover:text-ink-black no-underline"
                  >
                    开盘
                  </Link>
                  <Link
                    href="/markets/my"
                    className="text-ink-dark hover:text-ink-black no-underline"
                  >
                    我的盘口
                  </Link>
                  {session.user.role === "ADMIN" && (
                    <Link
                      href="/markets/pending"
                      className="text-gold-accent hover:text-ink-black no-underline"
                    >
                      审核
                    </Link>
                  )}
                  <Link
                    href="/disputes"
                    className="text-ink-dark hover:text-ink-black no-underline"
                  >
                    申诉
                  </Link>
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
