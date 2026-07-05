// Result Page - Experiment Summary
// Design: Laboratory Minimal - Clear data presentation

import { useLocation } from "wouter";
import { useExperiment } from "@/contexts/ExperimentContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { downloadCSV } from "@/lib/experiment";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  CheckCircle2,
  XCircle,
  Clock,
  BarChart3,
  Download,
  RotateCcw,
  Home,
} from "lucide-react";
import { motion } from "framer-motion";

export default function Result() {
  const [, navigate] = useLocation();
  const { state } = useExperiment();
  const { isAuthenticated } = useAuth();

  const latestSession = state.sessions[state.sessions.length - 1];

  // Fetch trials from DB for the latest session
  const { data: dbTrials } = trpc.experiment.getTrials.useQuery(
    { sessionId: latestSession?.sessionId || "" },
    { enabled: isAuthenticated && !!latestSession?.sessionId }
  );

  if (!latestSession) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">セッションデータがありません</p>
          <Button onClick={() => navigate("/")}>ホームに戻る</Button>
        </div>
      </div>
    );
  }

  const { summary } = latestSession;
  // Use in-memory trials if available, otherwise use DB trials
  const trials =
    latestSession.trials.length > 0
      ? latestSession.trials
      : (dbTrials || []).map((t) => ({
          trialNumber: t.trialNumber,
          presentedDigit: t.presentedDigit,
          correctSymbol: t.correctSymbol,
          correctKey: t.correctKey,
          respondedKey: t.respondedKey,
          respondedSymbol: t.respondedSymbol,
          isCorrect: t.isCorrect,
          reactionTimeMs: t.reactionTimeMs,
          conditionId: t.conditionId,
          currentDigitSymbolMap: t.currentDigitSymbolMap as Record<
            number,
            string
          >,
          timestamp: t.trialTimestamp,
        }));

  const handleDownloadCSV = () => {
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

    const rows = trials.map((t) => [
      latestSession.sessionId,
      latestSession.participantId,
      latestSession.conditionName,
      t.trialNumber,
      t.presentedDigit,
      t.correctSymbol,
      t.correctKey,
      t.respondedKey,
      t.respondedSymbol,
      t.isCorrect ? 1 : 0,
      t.reactionTimeMs,
      JSON.stringify(t.currentDigitSymbolMap),
      new Date(t.timestamp).toISOString(),
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const filename = `dsst_${latestSession.participantId}_${latestSession.conditionName}_${new Date().toISOString().slice(0, 10)}.csv`;
    downloadCSV(csv, filename);
  };

  const statCards = [
    {
      label: "正答数",
      value: summary.correctCount,
      icon: CheckCircle2,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "誤答数",
      value: summary.errorCount,
      icon: XCircle,
      color: "text-rose-600",
      bg: "bg-rose-50",
    },
    {
      label: "正答率",
      value: `${(summary.accuracyRate * 100).toFixed(1)}%`,
      icon: BarChart3,
      color: "text-primary",
      bg: "bg-blue-50",
    },
    {
      label: "平均RT",
      value: `${summary.meanReactionTimeMs}ms`,
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-white">
        <div className="container flex items-center justify-between h-14">
          <h1 className="font-semibold text-foreground">実験結果</h1>
          <Button variant="outline" size="sm" onClick={handleDownloadCSV}>
            <Download className="w-4 h-4 mr-1.5" />
            CSV
          </Button>
        </div>
      </header>

      <main className="container py-8 max-w-4xl space-y-8">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>
            参加者:{" "}
            <span className="font-mono font-medium text-foreground">
              {latestSession.participantId}
            </span>
          </span>
          <span className="text-border">|</span>
          <span>
            条件:{" "}
            <span className="font-medium text-foreground">
              {latestSession.conditionName}
            </span>
          </span>
          <span className="text-border">|</span>
          <span>
            所要時間:{" "}
            <span className="font-mono font-medium text-foreground">
              {Math.round(
                (latestSession.endTime - latestSession.startTime) / 1000
              )}
              秒
            </span>
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="shadow-sm border-border/60">
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                        {stat.label}
                      </p>
                      <p className="text-2xl font-bold font-mono mt-1">
                        {stat.value}
                      </p>
                    </div>
                    <div className={`p-2 rounded-lg ${stat.bg}`}>
                      <stat.icon className={`w-4 h-4 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <Card className="shadow-sm border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">詳細統計</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">総試行数</p>
                <p className="font-mono font-semibold">
                  {summary.totalTrials}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">中央値RT</p>
                <p className="font-mono font-semibold">
                  {summary.medianReactionTimeMs}ms
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">セッションID</p>
                <p className="font-mono text-xs text-muted-foreground truncate">
                  {latestSession.sessionId}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {trials.length > 0 && (
          <Card className="shadow-sm border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">試行詳細</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/30">
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                        #
                      </th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                        提示数字
                      </th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                        正解
                      </th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                        回答
                      </th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                        正誤
                      </th>
                      <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">
                        RT (ms)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {trials.map((trial) => (
                      <tr
                        key={trial.trialNumber}
                        className="border-b border-border/30 hover:bg-muted/20 transition-colors"
                      >
                        <td className="px-4 py-2 font-mono text-muted-foreground">
                          {trial.trialNumber}
                        </td>
                        <td className="px-4 py-2 font-mono font-semibold">
                          {trial.presentedDigit}
                        </td>
                        <td className="px-4 py-2">
                          <span className="text-lg">{trial.correctSymbol}</span>
                          <span className="text-xs text-muted-foreground ml-1">
                            ({trial.correctKey})
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <span className="text-lg">
                            {trial.respondedSymbol}
                          </span>
                          <span className="text-xs text-muted-foreground ml-1">
                            ({trial.respondedKey})
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          {trial.isCorrect ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3" />
                              正解
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                              <XCircle className="w-3 h-3" />
                              不正解
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right font-mono">
                          {trial.reactionTimeMs}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-center gap-4 pb-8">
          <Button variant="outline" onClick={() => navigate("/")}>
            <Home className="w-4 h-4 mr-1.5" />
            ホームに戻る
          </Button>
          <Button onClick={() => navigate("/experiment")}>
            <RotateCcw className="w-4 h-4 mr-1.5" />
            もう一度実験する
          </Button>
        </div>
      </main>
    </div>
  );
}
