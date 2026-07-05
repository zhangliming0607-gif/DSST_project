// Settings Page - Experiment Configuration

import { useState } from "react";
import { useLocation } from "wouter";
import { useExperiment } from "@/contexts/ExperimentContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { SYMBOLS, DEFAULT_CONFIG } from "@/lib/config";
import type { Condition, DurationMode, ExperimentConfig } from "@/lib/types";
import { ArrowLeft, Plus, Trash2, Save, RotateCcw, Clock, Hash } from "lucide-react";
import { toast } from "sonner";

const AVAILABLE_SYMBOLS = Object.values(SYMBOLS);

export default function Settings() {
  const [, navigate] = useLocation();
  const { state, saveConfigToDb } = useExperiment();
  const [config, setConfig] = useState<ExperimentConfig>({ ...state.config });

  const updateConfig = (updates: Partial<ExperimentConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  };

  const updateCondition = (index: number, updates: Partial<Condition>) => {
    const newConditions = [...config.conditions];
    newConditions[index] = { ...newConditions[index], ...updates };
    updateConfig({ conditions: newConditions });
  };

  const addCondition = () => {
    const newId = `condition-${Date.now()}`;
    const newCondition: Condition = {
      id: newId,
      name: `条件${config.conditions.length + 1}`,
      digitSymbolMap: { 1: "△", 2: "○", 3: "□", 4: "☆" },
      keySymbolMap: { F: "△", G: "○", H: "□", J: "☆" },
    };
    updateConfig({ conditions: [...config.conditions, newCondition] });
  };

  const removeCondition = (index: number) => {
    if (config.conditions.length <= 1) {
      toast.error("最低1つの条件が必要です");
      return;
    }
    const newConditions = config.conditions.filter((_, i) => i !== index);
    updateConfig({ conditions: newConditions });
  };

  const updateDigitSymbolMap = (
    condIndex: number,
    digit: number,
    symbol: string
  ) => {
    const newMap = { ...config.conditions[condIndex].digitSymbolMap };
    newMap[digit] = symbol;
    updateCondition(condIndex, { digitSymbolMap: newMap });
  };

  const updateKeySymbolMap = (
    condIndex: number,
    key: string,
    symbol: string
  ) => {
    const newMap = { ...config.conditions[condIndex].keySymbolMap };
    newMap[key] = symbol;
    updateCondition(condIndex, { keySymbolMap: newMap });
  };

  const addCustomMapping = () => {
    const defaultMapping: Record<number, string> = {};
    config.digits.forEach((d, i) => {
      const symbols = ["△", "○", "□", "☆", "◇", "✕", "♡", "⬠", "⬡"];
      defaultMapping[d] = symbols[i] || "△";
    });
    const currentMappings = config.mappingChangeRule.customMappings || [];
    updateConfig({
      mappingChangeRule: {
        ...config.mappingChangeRule,
        customMappings: [...currentMappings, defaultMapping],
      },
    });
  };

  const removeCustomMapping = (index: number) => {
    const currentMappings = config.mappingChangeRule.customMappings || [];
    updateConfig({
      mappingChangeRule: {
        ...config.mappingChangeRule,
        customMappings: currentMappings.filter((_, i) => i !== index),
      },
    });
  };

  const updateCustomMapping = (
    mapIndex: number,
    digit: number,
    symbol: string
  ) => {
    const currentMappings = [
      ...(config.mappingChangeRule.customMappings || []),
    ];
    if (currentMappings[mapIndex]) {
      currentMappings[mapIndex] = {
        ...currentMappings[mapIndex],
        [digit]: symbol,
      };
      updateConfig({
        mappingChangeRule: {
          ...config.mappingChangeRule,
          customMappings: currentMappings,
        },
      });
    }
  };

  const handleSave = async () => {
    await saveConfigToDb(config);
    toast.success("設定を保存しました");
  };

  const handleReset = () => {
    setConfig({ ...DEFAULT_CONFIG });
    toast.info("デフォルト設定に戻しました");
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
            <Separator orientation="vertical" className="h-5" />
            <h1 className="font-semibold text-foreground">実験設定</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="w-4 h-4 mr-1.5" />
              リセット
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Save className="w-4 h-4 mr-1.5" />
              保存
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8 max-w-3xl space-y-6">
        {/* Mode Selection */}
        <Card className="shadow-sm border-border/60">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">実験モード</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => updateConfig({ mode: "standard" })}
                className={`rounded-lg border-2 p-4 text-left transition-all ${
                  config.mode === "standard"
                    ? "border-primary bg-primary/5"
                    : "border-border/60 hover:border-border"
                }`}
              >
                <p className="text-sm font-semibold">Standard</p>
                <p className="text-xs text-muted-foreground mt-1">
                  数字表示 → 記号キー
                </p>
              </button>
              <button
                type="button"
                onClick={() => updateConfig({ mode: "simple" })}
                className={`rounded-lg border-2 p-4 text-left transition-all ${
                  config.mode === "simple"
                    ? "border-primary bg-primary/5"
                    : "border-border/60 hover:border-border"
                }`}
              >
                <p className="text-sm font-semibold">Simple</p>
                <p className="text-xs text-muted-foreground mt-1">
                  記号表示 → 数字キー
                </p>
              </button>
              <button
                type="button"
                onClick={() => updateConfig({ mode: "sequential" })}
                className={`rounded-lg border-2 p-4 text-left transition-all ${
                  config.mode === "sequential"
                    ? "border-primary bg-primary/5"
                    : "border-border/60 hover:border-border"
                }`}
              >
                <p className="text-sm font-semibold">Sequential</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Standard→Simple 連続実行
                </p>
              </button>
            </div>
            {config.mode === "sequential" && (
              <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                {config.durationMode === "trials"
                  ? `Standard（数字→記号キー）を${config.totalTrials}試行実施後、自動的にSimple（記号→数字キー）に切り替わり、さらに${config.totalTrials}試行実施します。合計${config.totalTrials * 2}試行。`
                  : `Standard（数字→記号キー）を${config.totalTimeSeconds}秒実施後、自動的にSimple（記号→数字キー）に切り替わり、さらに${config.totalTimeSeconds}秒実施します。合計${config.totalTimeSeconds * 2}秒。`}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Duration Mode Selection */}
        <Card className="shadow-sm border-border/60">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">終了条件</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => updateConfig({ durationMode: "trials" as DurationMode })}
                className={`rounded-lg border-2 p-4 text-left transition-all ${config.durationMode === "trials" ? "border-primary bg-primary/5" : "border-border/60 hover:border-border"}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Hash className="w-4 h-4" />
                  <p className="text-sm font-semibold">試行数制</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  指定した試行数で終了
                </p>
              </button>
              <button
                type="button"
                onClick={() => updateConfig({ durationMode: "time" as DurationMode })}
                className={`rounded-lg border-2 p-4 text-left transition-all ${config.durationMode === "time" ? "border-primary bg-primary/5" : "border-border/60 hover:border-border"}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4" />
                  <p className="text-sm font-semibold">時間制</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  指定した時間（秒）で終了
                </p>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* General Settings */}
        <Card className="shadow-sm border-border/60">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">一般設定</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              {config.durationMode === "trials" ? (
                <div className="space-y-2">
                  <Label className="text-sm">試行数</Label>
                  <Input
                    type="number"
                    min={1}
                    max={500}
                    value={config.totalTrials}
                    onChange={(e) =>
                      updateConfig({
                        totalTrials: parseInt(e.target.value) || 60,
                      })
                    }
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    この回数の試行で実験が終了します
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="text-sm">タスク時間（秒）</Label>
                  <Input
                    type="number"
                    min={10}
                    max={600}
                    value={config.totalTimeSeconds}
                    onChange={(e) =>
                      updateConfig({
                        totalTimeSeconds: parseInt(e.target.value) || 90,
                      })
                    }
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    この時間が経過すると実験が終了します
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-sm">練習試行数</Label>
                <Input
                  type="number"
                  min={0}
                  max={50}
                  value={config.practiceTrials}
                  onChange={(e) =>
                    updateConfig({
                      practiceTrials: parseInt(e.target.value) || 0,
                    })
                  }
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  0で練習なし。本番前に操作を練習できます
                </p>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">フィードバック表示時間（ms）</Label>
                <Input
                  type="number"
                  min={0}
                  max={2000}
                  value={config.feedbackDurationMs}
                  onChange={(e) =>
                    updateConfig({
                      feedbackDurationMs: parseInt(e.target.value) || 500,
                    })
                  }
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">試行間インターバル（ms）</Label>
                <Input
                  type="number"
                  min={0}
                  max={2000}
                  value={config.interTrialIntervalMs}
                  onChange={(e) =>
                    updateConfig({
                      interTrialIntervalMs: parseInt(e.target.value) || 200,
                    })
                  }
                  className="font-mono"
                />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">マッピング記憶表の表示時間（秒）</Label>
                <Input
                  type="number"
                  min={1}
                  max={60}
                  value={Math.round(config.mappingMemoryDurationMs / 1000)}
                  onChange={(e) =>
                    updateConfig({
                      mappingMemoryDurationMs: (parseInt(e.target.value) || 5) * 1000,
                    })
                  }
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  実験開始前やマッピング変更時に表示されます
                </p>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">フィードバック表示</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    正解/不正解を回答後に表示
                  </p>
                </div>
                <Switch
                  checked={config.showFeedback}
                  onCheckedChange={(checked) =>
                    updateConfig({ showFeedback: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">反応時間（RT）表示</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    フィードバックに反応時間を含める
                  </p>
                </div>
                <Switch
                  checked={config.showReactionTime}
                  onCheckedChange={(checked) =>
                    updateConfig({ showReactionTime: checked })
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mapping Change Rule */}
        <Card className="shadow-sm border-border/60">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">マッピング変更ルール</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center gap-3">
              <Switch
                checked={config.mappingChangeRule.enabled}
                onCheckedChange={(checked) =>
                  updateConfig({
                    mappingChangeRule: {
                      ...config.mappingChangeRule,
                      enabled: checked,
                    },
                  })
                }
              />
              <Label className="text-sm">マッピング変更を有効にする</Label>
            </div>
            {config.mappingChangeRule.enabled && (
              <div className="space-y-5 pl-4 border-l-2 border-primary/20">
                <div className="grid grid-cols-2 gap-4">
                  {config.durationMode === "trials" ? (
                    <div className="space-y-2">
                      <Label className="text-sm">変更間隔（試行数）</Label>
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        value={config.mappingChangeRule.changeAfterTrials}
                        onChange={(e) =>
                          updateConfig({
                            mappingChangeRule: {
                              ...config.mappingChangeRule,
                              changeAfterTrials: parseInt(e.target.value) || 20,
                            },
                          })
                        }
                        className="font-mono"
                      />
                      <p className="text-xs text-muted-foreground">
                        N試行ごとにマッピングが変更されます
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label className="text-sm">変更間隔（秒）</Label>
                      <Input
                        type="number"
                        min={5}
                        max={300}
                        value={config.mappingChangeRule.changeAfterSeconds}
                        onChange={(e) =>
                          updateConfig({
                            mappingChangeRule: {
                              ...config.mappingChangeRule,
                              changeAfterSeconds: parseInt(e.target.value) || 30,
                            },
                          })
                        }
                        className="font-mono"
                      />
                      <p className="text-xs text-muted-foreground">
                        N秒ごとにマッピングが変更されます
                      </p>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label className="text-sm">変更方式</Label>
                    <Select
                      value={config.mappingChangeRule.changeType}
                      onValueChange={(
                        value: "rotate" | "shuffle" | "custom"
                      ) =>
                        updateConfig({
                          mappingChangeRule: {
                            ...config.mappingChangeRule,
                            changeType: value,
                          },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rotate">
                          ローテーション（1つずつずらす）
                        </SelectItem>
                        <SelectItem value="shuffle">
                          シャッフル（ランダム）
                        </SelectItem>
                        <SelectItem value="custom">
                          カスタム（事前定義）
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Custom Mapping Patterns UI */}
                {config.mappingChangeRule.changeType === "custom" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">カスタムマッピングパターン</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          N試行ごとに以下のパターンを順番に適用します
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={addCustomMapping}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        パターン追加
                      </Button>
                    </div>

                    {(!config.mappingChangeRule.customMappings ||
                      config.mappingChangeRule.customMappings.length === 0) && (
                      <div className="rounded-lg bg-muted/50 border border-dashed border-border p-4 text-center">
                        <p className="text-sm text-muted-foreground">
                          パターンが未登録です。「パターン追加」で数字→記号の対応を登録してください。
                        </p>
                      </div>
                    )}

                    {config.mappingChangeRule.customMappings?.map(
                      (mapping, mapIndex) => (
                        <div
                          key={mapIndex}
                          className="rounded-lg border border-border/60 p-4 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              パターン {mapIndex + 1}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeCustomMapping(mapIndex)}
                              className="text-muted-foreground hover:text-destructive h-7 w-7 p-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                            {config.digits.map((digit) => (
                              <div key={digit} className="space-y-1">
                                <Label className="text-xs font-mono">
                                  {digit} →
                                </Label>
                                <Select
                                  value={mapping[digit] || "△"}
                                  onValueChange={(value) =>
                                    updateCustomMapping(
                                      mapIndex,
                                      digit,
                                      value
                                    )
                                  }
                                >
                                  <SelectTrigger className="h-8 text-lg">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {AVAILABLE_SYMBOLS.map((sym) => (
                                      <SelectItem key={sym} value={sym}>
                                        <span className="text-lg">{sym}</span>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Conditions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">条件設定</h2>
            <Button variant="outline" size="sm" onClick={addCondition}>
              <Plus className="w-4 h-4 mr-1.5" />
              条件を追加
            </Button>
          </div>

          {config.conditions.map((condition, condIndex) => (
            <Card key={condition.id} className="shadow-sm border-border/60">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Input
                    value={condition.name}
                    onChange={(e) =>
                      updateCondition(condIndex, { name: e.target.value })
                    }
                    className="w-32 h-8 text-sm font-semibold"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCondition(condIndex)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                    数字 → 記号 マッピング
                  </p>
                  <div className="grid grid-cols-4 gap-3">
                    {config.digits.map((digit) => (
                      <div key={digit} className="space-y-1.5">
                        <Label className="text-xs font-mono">
                          数字 {digit}
                        </Label>
                        <Select
                          value={condition.digitSymbolMap[digit] || "△"}
                          onValueChange={(value) =>
                            updateDigitSymbolMap(condIndex, digit, value)
                          }
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {AVAILABLE_SYMBOLS.map((sym) => (
                              <SelectItem key={sym} value={sym}>
                                <span className="text-lg">{sym}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                    キー → 記号 マッピング
                  </p>
                  <div className="grid grid-cols-4 gap-3">
                    {Object.entries(condition.keySymbolMap).map(
                      ([key, symbol]) => (
                        <div key={key} className="space-y-1.5">
                          <Label className="text-xs">
                            <kbd className="font-mono bg-muted border border-border rounded px-1.5 py-0.5 text-xs">
                              {key}
                            </kbd>
                          </Label>
                          <Select
                            value={symbol}
                            onValueChange={(value) =>
                              updateKeySymbolMap(condIndex, key, value)
                            }
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {AVAILABLE_SYMBOLS.map((sym) => (
                                <SelectItem key={sym} value={sym}>
                                  <span className="text-lg">{sym}</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-end gap-3 pb-8">
          <Button variant="outline" onClick={() => navigate("/")}>
            キャンセル
          </Button>
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-1.5" />
            設定を保存
          </Button>
        </div>
      </main>
    </div>
  );
}
