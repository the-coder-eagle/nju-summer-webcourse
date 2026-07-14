export function EmptyState({
  message,
  description,
}: {
  message: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-center p-12">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-10 text-center">
        <div className="mb-4 text-6xl">&#9917;</div>
        <h3 className="mb-2 text-lg font-bold text-slate-900">{message}</h3>
        {description && (
          <p className="text-sm text-slate-500">{description}</p>
        )}
      </div>
    </div>
  );
}
