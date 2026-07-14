"use client";

export function ErrorState({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex items-center justify-center p-12">
      <div className="w-full max-w-md rounded-xl border border-rose-200 bg-rose-50 p-10 text-center">
        <div className="mb-4 text-5xl">&#9888;&#65039;</div>
        <h3 className="mb-2 text-lg font-bold text-rose-800">
          {message ?? "加载失败"}
        </h3>
        <p className="mb-6 text-sm text-rose-600">请检查网络连接后重试</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="rounded-full bg-rose-700 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-800"
          >
            重新加载
          </button>
        )}
      </div>
    </div>
  );
}
