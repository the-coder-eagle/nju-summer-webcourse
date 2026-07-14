"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";
import { apiClient, ApiRequestError, type Comment, type Pagination } from "@/lib/api";
import { ErrorState } from "./error-state";
import { EmptyState } from "./empty-state";

interface Props {
  matchId: number;
}

export function CommentSection({ matchId }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchComments = useCallback(
    (page = 1) => {
      setLoading(true);
      setError(null);

      apiClient
        .listComments(matchId, { page, pageSize: 20 })
        .then((res) => {
          if (page === 1) {
            setComments(res.data);
          } else {
            setComments((prev) => [...prev, ...res.data]);
          }
          setPagination(res.pagination);
        })
        .catch((err: unknown) => {
          const message =
            err instanceof ApiRequestError
              ? err.message
              : "加载评论失败，请重试";
          setError(message);
        })
        .finally(() => {
          setLoading(false);
        });
    },
    [matchId]
  );

  useEffect(() => {
    // Initial fetch — fetchComments is manually invoked for pagination/retry
    let ignore = false;

    async function initialFetch() {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.listComments(matchId, { page: 1, pageSize: 20 });
        if (!ignore) {
          setComments(res.data);
          setPagination(res.pagination);
        }
      } catch (err: unknown) {
        if (!ignore) {
          const message =
            err instanceof ApiRequestError ? err.message : "加载评论失败，请重试";
          setError(message);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    void initialFetch();
    return () => { ignore = true; };
  }, [matchId]);

  const trimmed = content.trim();
  const remaining = 500 - content.length;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (trimmed.length === 0 || trimmed.length > 500) {
      setSubmitError("评论内容需为 1-500 个字符");
      return;
    }

    setSubmitting(true);

    apiClient
      .createComment(matchId, { content: trimmed })
      .then((res) => {
        setComments((prev) => [res.data, ...prev]);
        setContent("");
        setSubmitError(null);
        // Increment total count on pagination so "load more" logic stays accurate
        if (pagination) {
          setPagination({ ...pagination, total: pagination.total + 1 });
        }
      })
      .catch((err: unknown) => {
        const message =
          err instanceof ApiRequestError ? err.message : "发表失败，请重试";
        setSubmitError(message);
      })
      .finally(() => {
        setSubmitting(false);
      });
  }

  function handleDelete(commentId: number) {
    setDeletingId(commentId);

    apiClient
      .deleteComment(commentId)
      .then(() => {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
        if (pagination) {
          setPagination({ ...pagination, total: pagination.total - 1 });
        }
      })
      .catch((err: unknown) => {
        const message =
          err instanceof ApiRequestError ? err.message : "删除失败，请重试";
        alert(message);
      })
      .finally(() => {
        setDeletingId(null);
      });
  }

  const hasMore =
    pagination !== null &&
    pagination.page * pagination.pageSize < pagination.total;

  // ---- Loading skeleton ----
  if (loading) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">评论区</h2>
        <div className="mt-5 space-y-4" aria-label="正在加载评论">
          {[0, 1, 2].map((i) => (
            <div key={i} className="animate-pulse rounded-lg bg-slate-100">
              <div className="p-4">
                <div className="mb-3 h-4 w-24 rounded bg-slate-200" />
                <div className="h-3 w-full rounded bg-slate-200" />
                <div className="mt-1.5 h-3 w-2/3 rounded bg-slate-200" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  // ---- Error state ----
  if (error) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">评论区</h2>
        <ErrorState message={error} onRetry={() => fetchComments(1)} />
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-slate-900">评论区</h2>

      {/* ---- Submit form ---- */}
      <form onSubmit={handleSubmit} className="mt-5">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={500}
          rows={4}
          placeholder="写下你的评论…"
          disabled={submitting}
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50 resize-y"
        />
        <div className="mt-2 flex items-center justify-between">
          <span
            className={`text-xs ${
              remaining < 20
                ? "text-rose-500"
                : remaining < 50
                  ? "text-amber-500"
                  : "text-slate-400"
            }`}
          >
            {content.length}/500
          </span>
          <button
            type="submit"
            disabled={trimmed.length === 0 || submitting}
            className="rounded-lg bg-blue-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-50"
          >
            {submitting ? "提交中…" : "发表评论"}
          </button>
        </div>
        {submitError && (
          <p className="mt-1 text-sm text-rose-600">{submitError}</p>
        )}
      </form>

      {/* ---- Comment list ---- */}
      <div className="mt-6">
        {comments.length === 0 ? (
          <EmptyState message="暂无评论" description="来发表第一条评论吧" />
        ) : (
          <ul className="space-y-4" role="list">
            {comments.map((comment) => (
              <li
                key={comment.id}
                className="rounded-lg border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-slate-700">
                      {comment.userId}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(comment.createdAt).toLocaleString("zh-CN", {
                        month: "numeric",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(comment.id)}
                    disabled={deletingId === comment.id}
                    className="text-xs font-medium text-rose-600 transition hover:text-rose-800 disabled:opacity-50"
                  >
                    {deletingId === comment.id ? "删除中…" : "删除"}
                  </button>
                </div>
                <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap text-slate-700">
                  {comment.content}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ---- Load more ---- */}
      {hasMore && (
        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={() => fetchComments(pagination!.page + 1)}
            disabled={loading}
            className="rounded-lg border border-slate-300 px-5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            加载更多评论
          </button>
        </div>
      )}
    </section>
  );
}
