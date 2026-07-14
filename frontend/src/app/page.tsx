import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-10 sm:px-10 sm:py-16">
      <header className="mb-14 grid gap-8 border-b border-slate-200 pb-12 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="mb-4 font-mono text-sm font-semibold tracking-[0.2em] text-emerald-700 uppercase">
            FIFA World Cup & Scottish Premiership
          </p>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-slate-950 sm:text-6xl">
            世界杯/苏超赛事信息与互动预测平台
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-500">
            浏览赛程，查看积分榜，提交比分预测，收藏你关注的比赛和球队。
          </p>
        </div>
        <Link
          className="w-fit rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
          href="/matches"
        >
          查看赛程
        </Link>
      </header>

      <section className="mb-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { href: "/matches", icon: "⚽", title: "赛程", desc: "世界杯小组赛与淘汰赛安排" },
          { href: "/teams", icon: "🏴", title: "球队", desc: "8 支世界杯参赛队伍" },
          { href: "/standings", icon: "📊", title: "积分榜", desc: "小组赛实时排名" },
          { href: "/bracket", icon: "🏆", title: "淘汰赛", desc: "十六强到决赛对阵图" },
          { href: "/my/predictions", icon: "🎯", title: "比分预测", desc: "提交你对比赛的预测" },
          { href: "/my/favorites", icon: "⭐", title: "我的收藏", desc: "收藏关注的比赛和球队" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group rounded-xl border border-slate-200 p-6 transition hover:border-emerald-300 hover:shadow-md"
          >
            <div className="mb-3 text-3xl">{item.icon}</div>
            <h3 className="mb-1 text-lg font-semibold text-slate-900 group-hover:text-emerald-700">
              {item.title}
            </h3>
            <p className="text-sm text-slate-500">{item.desc}</p>
          </Link>
        ))}
      </section>

      <section className="mb-14 rounded-2xl bg-slate-50 p-8">
        <h2 className="mb-2 text-xl font-bold text-slate-900">技术栈</h2>
        <p className="text-slate-500">
          Next.js 16 · Midway.js 4 · SQLite · OpenAPI · Docker · 32 自动化测试
        </p>
        <div className="mt-4 flex gap-3">
          <a
            className="rounded-full bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-300"
            href="/api/health"
          >
            API 健康检查
          </a>
          <a
            className="rounded-full bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-300"
            href="/api/agent/query?q=世界杯有哪些比赛"
          >
            Agent 查询
          </a>
        </div>
      </section>

      <footer className="mt-auto pt-16 text-sm text-slate-400">
        Next.js · Midway.js · SQLite · OpenAPI · Docker Compose
      </footer>
    </main>
  );
}
