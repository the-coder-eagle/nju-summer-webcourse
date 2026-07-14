"use client";

import { useState, type FormEvent } from "react";
import { apiClient, ApiRequestError, type MatchStatus, type Prediction } from "@/lib/api";

interface Props {
  matchId: number;
  matchStatus: MatchStatus;
  existingPrediction: Prediction | null;
  onSuccess: (prediction: Prediction) => void;
}

const DISABLED_MESSAGES: Record<string, string> = {
  live: "比赛进行中，不可预测",
  finished: "比赛已结束",
  postponed: "比赛已延期",
  cancelled: "比赛已取消",
};

export function PredictionForm({
  matchId,
  matchStatus,
  existingPrediction,
  onSuccess,
}: Props) {
  const isScheduled = matchStatus === "scheduled";
  const isUpdate = existingPrediction !== null;

  const [homeScore, setHomeScore] = useState<string>(
    existingPrediction ? String(existingPrediction.homeScore) : ""
  );
  const [awayScore, setAwayScore] = useState<string>(
    existingPrediction ? String(existingPrediction.awayScore) : ""
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---- Disabled states ----
  if (!isScheduled) {
    const label = DISABLED_MESSAGES[matchStatus] || "当前状态不可预测";
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-slate-900">提交比分预测</h3>
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-6">
          <p className="text-center text-slate-500">{label}</p>
        </div>
      </div>
    );
  }

  // ---- Scheduled: show form ----
  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const h = parseInt(homeScore, 10);
    const a = parseInt(awayScore, 10);

    if (
      isNaN(h) ||
      isNaN(a) ||
      h < 0 ||
      a < 0 ||
      !Number.isInteger(h) ||
      !Number.isInteger(a)
    ) {
      setError("请输入非负整数比分");
      return;
    }

    setSubmitting(true);

    const promise = isUpdate
      ? apiClient.updatePrediction(existingPrediction!.id, {
          homeScore: h,
          awayScore: a,
        })
      : apiClient.createPrediction({ matchId, homeScore: h, awayScore: a });

    promise
      .then((res) => {
        onSuccess(res.data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (err instanceof ApiRequestError) {
          setError(err.message);
        } else {
          setError("提交失败，请重试");
        }
      })
      .finally(() => {
        setSubmitting(false);
      });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-slate-200 bg-white p-6"
    >
      <h3 className="text-lg font-semibold text-slate-900">
        {isUpdate ? "修改预测" : "提交比分预测"}
      </h3>

      <div className="mt-5 flex items-center gap-3">
        <input
          type="number"
          min={0}
          step={1}
          value={homeScore}
          onChange={(e) => setHomeScore(e.target.value)}
          placeholder="主队"
          disabled={submitting}
          className="w-20 rounded-lg border border-slate-300 px-3 py-2.5 text-center text-lg font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
        />
        <span className="text-xl font-bold text-slate-400">:</span>
        <input
          type="number"
          min={0}
          step={1}
          value={awayScore}
          onChange={(e) => setAwayScore(e.target.value)}
          placeholder="客队"
          disabled={submitting}
          className="w-20 rounded-lg border border-slate-300 px-3 py-2.5 text-center text-lg font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
        />
      </div>

      {error && <p className="mt-1 text-sm text-rose-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="mt-4 rounded-lg bg-blue-700 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-50"
      >
        {submitting ? "提交中…" : isUpdate ? "更新" : "提交"}
      </button>

      {isUpdate && (
        <p className="mt-3 text-xs text-slate-500">
          你已提交预测，可修改（开赛前有效）
        </p>
      )}
    </form>
  );
}
