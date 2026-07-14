export function LoadingSkeleton({
  variant = "card",
  count = 6,
}: {
  variant?: "card" | "list" | "detail" | "table";
  count?: number;
}) {
  if (variant === "card") {
    return (
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-200 p-5">
            <div className="mb-4 h-40 w-full animate-pulse rounded-lg bg-slate-200" />
            <div className="mb-2 h-5 w-3/4 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-lg border border-slate-200 p-4"
          >
            <div className="h-12 w-12 shrink-0 animate-pulse rounded-full bg-slate-200" />
            <div className="min-w-0 flex-1">
              <div className="mb-1 h-5 w-2/3 animate-pulse rounded bg-slate-200" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200" />
            </div>
            <div className="h-8 w-20 shrink-0 animate-pulse rounded-full bg-slate-200" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "detail") {
    return (
      <div className="rounded-xl border border-slate-200 p-6">
        <div className="mb-8 h-10 w-1/2 animate-pulse rounded bg-slate-200" />
        <div className="mb-6 h-64 w-full animate-pulse rounded-lg bg-slate-200" />
        <div className="mb-3 h-4 w-full animate-pulse rounded bg-slate-200" />
        <div className="mb-3 h-4 w-full animate-pulse rounded bg-slate-200" />
        <div className="mb-3 h-4 w-5/6 animate-pulse rounded bg-slate-200" />
        <div className="mb-8 h-4 w-4/6 animate-pulse rounded bg-slate-200" />
        <div className="flex gap-4">
          <div className="h-12 w-32 animate-pulse rounded-full bg-slate-200" />
          <div className="h-12 w-32 animate-pulse rounded-full bg-slate-200" />
        </div>
      </div>
    );
  }

  if (variant === "table") {
    return (
      <div className="overflow-hidden rounded-xl border border-slate-200">
        <div className="border-b border-slate-200 bg-slate-50 p-4">
          <div className="flex gap-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-4 animate-pulse rounded bg-slate-200"
                style={{ width: `${80 + i * 20}px` }}
              />
            ))}
          </div>
        </div>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-8 border-b border-slate-100 p-4 last:border-b-0"
          >
            {Array.from({ length: 4 }).map((_, j) => (
              <div
                key={j}
                className="h-4 animate-pulse rounded bg-slate-200"
                style={{ width: `${60 + j * 30}px` }}
              />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return null;
}
