// Logs Page - Experiment Session History
// Design: Laboratory Minimal - Data-focused table view

import { useLocation } from "wouter";
import { useExperiment } from "@/contexts/ExperimentContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { downloadCSV } from "@/lib/experiment";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  ArrowLeft,
  Download,
  Trash2,
  FileSpreadsheet,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Logs() {
  const [, navigate] = useLocation();
  const { state, clearAllSessionsFromDb } = useExperiment();
  const { isAuthenticated } = useAuth();
  const { sessions } = state;

  // For downloading individual session trials from DB
  const utils = trpc.useUtils();

  const buildTrialCSV = (
    sessions: typeof state.sessions,
    trialData?: Array<{
      sessionId: string;
      trialNumber: number;
      presentedDigit: number;
      correctSymbol: string;
      correctKey: string;
      respondedKey: string;
      respondedSymbol: string;
      isCorrect: boolean;
      reactionTimeMs: number;
      conditionId: string;
      currentDigitSymbolMap: unknown;
      trialTimestamp: number;
    }>
  ) => {
    const headers = [
      "session_id",
      "participant_id",
      "condition",
      "trial_number",
      "presented_digit",
      "correct_symbol",
      "correct_key",
      "responded_key",
      "responded_symbol",
      "is_correct",
      "reaction_time_ms",
      "digit_symbol_mapping",
      "timestamp",
    ];

    if (trialData && trialData.length > 0) {
      const session = sessions.find(
        (s) => s.sessionId === trialData[0].sessionId
      );
      const rows = trialData.map((t) => [
        t.sessionId,
        session?.participantId || "",
        session?.conditionName || "",
        t.trialNumber,
        t.presentedDigit,
        t.correctSymbol,
        t.correctKey,
        t.respondedKey,
        t.respondedSymbol,
        t.isCorrect ? 1 : 0,
        t.reactionTimeMs,
        JSON.stringify(t.currentDigitSymbolMap),
        new Date(t.trialTimestamp).toISOString(),
      ]);
      return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    }

    return headers.join(",");
  };

  const buildSummaryCSV = () => {
    const headers = [
      "session_id",
      "participant_id",
      "condition",
      "total_trials",
      "correct_count",
      "error_count",
      "accuracy_rate",
      "mean_reaction_time_ms",
      "median_reaction_time_ms",
      "start_time",
      "end_time",
      "duration_seconds",
    ];

    const rows = sessions.map((s) => [
      s.sessionId,
      s.participantId,
      s.conditionName,
      s.summary.totalTrials,
      s.summary.correctCount,
      s.summary.errorCount,
      s.summary.accuracyRate.toFixed(4),
      s.summary.meanReactionTimeMs,
      s.summary.medianReactionTimeMs,
      new Date(s.startTime).toISOString(),
      new Date(s.endTime).toISOString(),
      Math.round((s.endTime - s.startTime) / 1000),
    ]);

    return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  };

  const handleDownloadSummary = () => {
    if (sessions.length === 0) {
      toast.error("ダウンロードするデータがありません");
      return;
    }
    const csv = buildSummaryCSV();
    const filename = `dsst_summary_${new Date().toISOString().slice(0, 10)}.csv`;
    downloadCSV(csv, filename);
    toast.success("サマリーデータをダウンロードしました");
  };

  const handleDownloadAll = async () => {
    if (sessions.length === 0) {
      toast.error("ダウンロードするデータがありません");
      return;
    }

    // Fetch all trials from DB for all sessions
    const allRows: string[] = [];
    const headers = [
      "session_id",
      "participant_id",
      "condition",
      "trial_number",
      "presented_digit",
      "correct_symbol",
      "correct_key",
      "responded_key",
      "responded_symbol",
      "is_correct",
      "reaction_time_ms",
      "digit_symbol_mapping",
      "timestamp",
    ];
    allRows.push(headers.join(","));

    if (isAuthenticated) {
      for (const session of sessions) {
        try {
          const trials = await utils.experiment.getTrials.fetch({
            sessionId: session.sessionId,
          });
          for (const t of trials) {
            allRows.push(
              [
                session.sessionId,
                session.participantId,
                session.conditionName,
                t.trialNumber,
                t.presentedDigit,
                t.correctSymbol,
                t.correctKey,
                t.respondedKey,
                t.respondedSymbol,
                t.isCorrect ? 1 : 0,
                t.reactionTimeMs,
                JSON.stringify(t.currentDigitSymbolMap),
                new Date(t.trialTimestamp).toISOString(),
              ].join(",")
            );
          }
        } catch (err) {
          console.error("Failed to fetch trials for session:", session.sessionId, err);
        }
      }
    }

    const csv = allRows.join("\n");
    const filename = `dsst_all_trials_${new Date().toISOString().slice(0, 10)}.csv`;
    downloadCSV(csv, filename);
    toast.success("全試行データをダウンロードしました");
  };

  const handleDownloadSession = async (sessionId: string) => {
    if (isAuthenticated) {
      try {
        const trials = await utils.experiment.getTrials.fetch({ sessionId });
        const csv = buildTrialCSV(sessions, trials);
        const session = sessions.find((s) => s.sessionId === sessionId);
        const filename = `dsst_${session?.participantId || "unknown"}_${session?.conditionName || "unknown"}_${new Date().toISOString().slice(0, 10)}.csv`;
        downloadCSV(csv, filename);
      } catch (err) {
        console.error("Failed to download session:", err);
        toast.error("ダウンロードに失敗しました");
      }
    }
  };

  const handleClearAll = async () => {
    await clearAllSessionsFromDb();
    toast.success("全ログを削除しました");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-white sticky top-0 z-10">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              戻る
            </Button>
            <span className="text-border">|</span>
            <h1 className="font-semibold text-foreground">実験ログ</h1>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
              {sessions.length} セッション
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadSummary}
              disabled={sessions.length === 0}
            >
              <BarChart3 className="w-4 h-4 mr-1.5" />
              サマリーCSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadAll}
              disabled={sessions.length === 0}
            >
              <FileSpreadsheet className="w-4 h-4 mr-1.5" />
              全試行CSV
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={sessions.length === 0}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-1.5" />
                  全削除
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>全ログを削除しますか？</AlertDialogTitle>
                  <AlertDialogDescription>
                    この操作は取り消せません。全{sessions.length}
                    セッションのデータが完全に削除されます。
                    削除前にCSVダウンロードを推奨します。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>キャンセル</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleClearAll}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    削除する
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </header>

      <main className="container py-8 max-w-5xl">
        {sessions.length === 0 ? (
          <Card className="shadow-sm border-border/60">
            <CardContent className="py-16 text-center">
              <FileSpreadsheet className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
              <p className="text-muted-foreground">
                まだ実験ログがありません
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                実験を実施するとここにログが表示されます
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => navigate("/")}
              >
                実験を開始する
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-sm border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">セッション一覧</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/30">
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                        日時
                      </th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                        参加者ID
                      </th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                        条件
                      </th>
                      <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">
                        試行数
                      </th>
                      <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">
                        正答率
                      </th>
                      <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">
                        平均RT
                      </th>
                      <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((session) => (
                      <tr
                        key={session.sessionId}
                        className="border-b border-border/30 hover:bg-muted/20 transition-colors"
                      >
                        <td className="px-4 py-2.5 font-mono text-xs">
                          {new Date(session.startTime).toLocaleString("ja-JP")}
                        </td>
                        <td className="px-4 py-2.5 font-mono font-medium">
                          {session.participantId}
                        </td>
                        <td className="px-4 py-2.5">{session.conditionName}</td>
                        <td className="px-4 py-2.5 text-right font-mono">
                          {session.summary.totalTrials}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono">
                          {(session.summary.accuracyRate * 100).toFixed(1)}%
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono">
                          {session.summary.meanReactionTimeMs}ms
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleDownloadSession(session.sessionId)
                            }
                          >
                            <Download className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
