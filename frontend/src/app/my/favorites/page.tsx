"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { apiClient, ApiRequestError, type Favorite } from "@/lib/api";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";

export default function MyFavoritesPage() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);

  // ============================================================
  // Data fetching
  // ============================================================
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadFavorites() {
      setLoading(true);
      setError(null);

      try {
        const res = await apiClient.listMyFavorites();
        if (!cancelled) setFavorites(res.data);
      } catch (err) {
        if (!cancelled) {
          if (err instanceof ApiRequestError) {
            setError(err.message);
          } else {
            setError("加载收藏列表失败，请重试");
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadFavorites();
    return () => { cancelled = true; };
  }, [retryCount]);

  const fetchFavorites = useCallback(() => {
    setRetryCount((c) => c + 1);
  }, []);

  // ============================================================
  // Remove favorite
  // ============================================================
  const handleRemoveFavorite = useCallback(async (id: number) => {
    setRemovingId(id);
    try {
      await apiClient.removeFavorite(id);
      setFavorites((prev) => prev.filter((f) => f.id !== id));
    } catch (err) {
      // Silently fail — the item stays in list; user can retry
      const msg = err instanceof ApiRequestError ? err.message : "取消失败";
      // Keep error local so we don't blow away the whole list
      setError(msg);
    } finally {
      setRemovingId(null);
    }
  }, []);

  // ============================================================
  // Split by type
  // ============================================================
  const matchFavorites = favorites.filter((f) => f.type === "match");
  const teamFavorites = favorites.filter((f) => f.type === "team");

  // ============================================================
  // Render: Loading
  // ============================================================
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-4xl px-6 py-10">
          <LoadingSkeleton variant="list" />
        </div>
      </div>
    );
  }

  // ============================================================
  // Render: Error
  // ============================================================
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-4xl px-6 py-10">
          <ErrorState
            message={error}
            onRetry={() => {
              setError(null);
              fetchFavorites();
            }}
          />
        </div>
      </div>
    );
  }

  // ============================================================
  // Render: Empty
  // ============================================================
  if (matchFavorites.length === 0 && teamFavorites.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-4xl px-6 py-10">
          <nav className="mb-6">
            <Link
              href="/matches"
              className="text-sm text-blue-600 hover:text-blue-800 transition"
            >
              &larr; 返回赛程列表
            </Link>
          </nav>
          <EmptyState
            message="暂无收藏"
            description="你还没有收藏任何比赛或球队"
          />
        </div>
      </div>
    );
  }

  // ============================================================
  // Render: Success
  // ============================================================
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-6 py-10">
        {/* ---- Page Header ---- */}
        <nav className="mb-6">
          <Link
            href="/matches"
            className="text-sm text-blue-600 hover:text-blue-800 transition"
          >
            &larr; 返回赛程列表
          </Link>
        </nav>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">我的收藏</h1>
          <p className="mt-2 text-slate-500">
            共 {favorites.length} 个收藏
          </p>
        </div>

        {/* ---- Match Favorites ---- */}
        {matchFavorites.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-lg font-semibold text-slate-800">
              比赛收藏
            </h2>
            <div className="grid gap-3">
              {matchFavorites.map((fav) => (
                <div
                  key={fav.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">⚽</span>
                    <span className="text-sm font-medium text-slate-600">
                      比赛
                    </span>
                    <span className="text-sm text-slate-400">
                      #{fav.targetId}
                    </span>
                    <Link
                      href={`/matches/${fav.targetId}`}
                      className="text-sm text-blue-600 hover:text-blue-800 transition"
                    >
                      查看详情
                    </Link>
                  </div>
                  <button
                    onClick={() => handleRemoveFavorite(fav.id)}
                    disabled={removingId === fav.id}
                    className="text-sm text-rose-500 transition hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {removingId === fav.id ? "取消中..." : "取消收藏"}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ---- Team Favorites ---- */}
        {teamFavorites.length > 0 && (
          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-800">
              球队收藏
            </h2>
            <div className="grid gap-3">
              {teamFavorites.map((fav) => (
                <div
                  key={fav.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">🏟</span>
                    <span className="text-sm font-medium text-slate-600">
                      球队
                    </span>
                    <span className="text-sm text-slate-400">
                      #{fav.targetId}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveFavorite(fav.id)}
                    disabled={removingId === fav.id}
                    className="text-sm text-rose-500 transition hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {removingId === fav.id ? "取消中..." : "取消收藏"}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
