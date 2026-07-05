// Home Page - Start Screen
// Design: Laboratory Minimal - Clean entry point for experiment

import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useExperiment } from "@/contexts/ExperimentContext";
import {
  FlaskConical,
  Settings,
  ClipboardList,
  Play,
  RotateCcw,
} from "lucide-react";

const HERO_IMAGE =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663611919142/92fqiX2qfJ8xgRFULzE5TX/dsst-hero-MxXUwpArUyZ3wtVHC3ZUF2.webp";

export default function Home() {
  const [, navigate] = useLocation();
  const { state, dispatch } = useExperiment();
  const [participantId, setParticipantId] = useState("");
  const [conditionId, setConditionId] = useState(
    state.config.conditions[0]?.id || ""
  );
  const [formError, setFormError] = useState("");

  const handleStart = (target: "/practice" | "/experiment") => {
    if (!participantId.trim()) {
      setFormError("参加者IDを入力してください");
      return;
    }
    if (!conditionId) {
      setFormError("条件を選択してください");
      return;
    }
    setFormError("");
    dispatch({ type: "SET_PARTICIPANT_ID", payload: participantId.trim() });
    dispatch({ type: "SET_CONDITION_ID", payload: conditionId });
    navigate(target);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border/60 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-primary" />
            <span className="font-semibold text-foreground tracking-tight">
              DSST Experiment
            </span>
          </div>
          <nav className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/settings")}
              className="text-muted-foreground hover:text-foreground"
            >
              <Settings className="w-4 h-4 mr-1.5" />
              設定
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/logs")}
              className="text-muted-foreground hover:text-foreground"
            >
              <ClipboardList className="w-4 h-4 mr-1.5" />
              ログ
            </Button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg space-y-8">
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <div className="mx-auto w-full max-w-sm rounded-xl overflow-hidden shadow-sm border border-border/40">
              <img
                src={HERO_IMAGE}
                alt="DSST Experiment"
                className="w-full h-auto"
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                数字記号置換テスト
              </h1>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                Digit Symbol Substitution Test — マッピング変更版
              </p>
            </div>
          </div>

          {/* Start Form */}
          <Card className="shadow-sm border-border/60">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold">
                実験セッション開始
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="participant-id" className="text-sm font-medium">
                  参加者ID
                </Label>
                <Input
                  id="participant-id"
                  placeholder="例: P001"
                  value={participantId}
                  onChange={e => setParticipantId(e.target.value)}
                  onKeyDown={e =>
                    e.key === "Enter" && handleStart("/experiment")
                  }
                  className="font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="condition" className="text-sm font-medium">
                  条件
                </Label>
                <Select value={conditionId} onValueChange={setConditionId}>
                  <SelectTrigger id="condition">
                    <SelectValue placeholder="条件を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {state.config.conditions.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Mode indicator */}
              <div className="rounded-lg bg-muted/50 border border-border/40 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">モード</span>
                  <span className="text-sm font-medium">
                    {state.config.mode === "sequential"
                      ? "Sequential（Standard→Simple）"
                      : state.config.mode === "simple"
                        ? "Simple（記号→数字キー）"
                        : "Standard（数字→記号キー）"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {state.config.mode === "sequential"
                    ? state.config.durationMode === "time"
                      ? `Standard ${state.config.totalTimeSeconds}秒 → Simple ${state.config.totalTimeSeconds}秒を連続実行`
                      : `Standard ${state.config.totalTrials}試行 → Simple ${state.config.totalTrials}試行を連続実行`
                    : state.config.mode === "simple"
                      ? "記号が表示され、対応する数字キー(1/2/3/4)を押します"
                      : "数字が表示され、対応する記号キー(F/G/H/J)を押します"}
                </p>
              </div>

              {formError && (
                <p className="text-sm text-destructive font-medium">
                  {formError}
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleStart("/practice")}
                  className="h-11 font-semibold"
                  size="lg"
                >
                  <RotateCcw className="w-4 h-4 mr-1.5" />
                  練習する
                </Button>
                <Button
                  type="button"
                  onClick={() => handleStart("/experiment")}
                  className="h-11 font-semibold"
                  size="lg"
                >
                  <Play className="w-4 h-4 mr-1.5" />
                  本番を開始する
                </Button>
              </div>

              <div className="flex items-center justify-center gap-4 pt-1">
                <p className="text-xs text-muted-foreground">
                  {state.config.durationMode === "time"
                    ? `時間: ${state.config.totalTimeSeconds}秒`
                    : `試行数: ${state.config.totalTrials}回`}
                </p>
                {state.config.practiceTrials > 0 && (
                  <p className="text-xs text-muted-foreground">
                    練習: {state.config.practiceTrials}回
                  </p>
                )}
                {state.config.mappingChangeRule.enabled && (
                  <p className="text-xs text-muted-foreground">
                    マッピング変更:{" "}
                    {state.config.durationMode === "time"
                      ? `${state.config.mappingChangeRule.changeAfterSeconds}秒ごと`
                      : `${state.config.mappingChangeRule.changeAfterTrials}試行ごと`}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
