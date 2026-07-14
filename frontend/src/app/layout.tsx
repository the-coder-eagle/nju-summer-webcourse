import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "足球赛事平台",
  description: "世界杯与苏超赛事信息、比分预测与互动平台",
};

const navLinks = [
  { href: "/", label: "首页" },
  { href: "/matches", label: "赛程" },
  { href: "/teams", label: "球队" },
  { href: "/standings", label: "积分榜" },
  { href: "/bracket", label: "淘汰赛" },
  { href: "/my/predictions", label: "我的预测" },
  { href: "/my/favorites", label: "我的收藏" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-6 py-3">
            <Link
              href="/"
              className="mr-4 shrink-0 text-lg font-bold text-slate-900"
            >
              Football Live
            </Link>
            {navLinks.slice(1).map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="shrink-0 rounded-full px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
