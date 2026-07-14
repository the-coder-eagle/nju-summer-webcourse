import type { MatchStatus } from "@/lib/api";

const STATUS_CONFIG: Record<
  MatchStatus,
  { label: string; className: string }
> = {
  scheduled: { label: "未开始", className: "bg-blue-100 text-blue-800" },
  live: { label: "进行中", className: "bg-green-100 text-green-800" },
  finished: { label: "已结束", className: "bg-slate-100 text-slate-600" },
  postponed: { label: "延期", className: "bg-amber-100 text-amber-800" },
  cancelled: { label: "取消", className: "bg-rose-100 text-rose-800" },
};

export function StatusBadge({ status }: { status: MatchStatus }) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
