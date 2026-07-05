// DSST Experiment Types

export interface Condition {
  id: string;
  name: string;
  digitSymbolMap: Record<number, string>;
  keySymbolMap: Record<string, string>;
}

export type DurationMode = "trials" | "time";

export interface MappingChangeRule {
  enabled: boolean;
  changeAfterTrials: number;
  changeAfterSeconds: number;   // 時間制: 何秒ごとにマッピング変更
  changeType: "rotate" | "shuffle" | "custom";
  customMappings?: Record<number, string>[];
}

export type ExperimentMode = "standard" | "simple" | "sequential";
// standard:   数字表示 → 対応する記号のキー(F/G/H/J)を押す
// simple:     記号表示 → 対応する数字キー(1/2/3/4)を押す
// sequential: Standard→Simpleを連続実行（各totalTrials回ずつ）

export interface ExperimentConfig {
  conditions: Condition[];
  durationMode: DurationMode;       // 試行数制 or 時間制
  totalTrials: number;              // 試行数制: 総試行数
  totalTimeSeconds: number;         // 時間制: 総タスク時間（秒）
  practiceTrials: number;           // 練習試行数（0=練習なし）
  mode: ExperimentMode;             // 実験モード
  mappingChangeRule: MappingChangeRule;
  mappingMemoryDurationMs: number;  // マッピング記憶表の表示時間（ミリ秒）
  showFeedback: boolean;
  showReactionTime: boolean;        // フィードバックでRTを表示するか
  feedbackDurationMs: number;
  interTrialIntervalMs: number;
  digits: number[];
}

export interface TrialLog {
  trialNumber: number;
  presentedDigit: number;
  correctSymbol: string;
  correctKey: string;
  respondedKey: string;
  respondedSymbol: string;
  isCorrect: boolean;
  reactionTimeMs: number;
  conditionId: string;
  currentDigitSymbolMap: Record<number, string>;
  timestamp: number;
  mode: "standard" | "simple";  // この試行がどのモードで実施されたか
}

export interface ExperimentSummary {
  totalTrials: number;
  correctCount: number;
  errorCount: number;
  accuracyRate: number;
  meanReactionTimeMs: number;
  medianReactionTimeMs: number;
}

export interface ExperimentSession {
  sessionId: string;
  participantId: string;
  conditionId: string;
  conditionName: string;
  startTime: number;
  endTime: number;
  trials: TrialLog[];
  summary: ExperimentSummary;
}

export type ExperimentPhase =
  | "idle"
  | "countdown"
  | "mapping_memory"
  | "practice"
  | "practice_feedback"
  | "practice_done"
  | "running"
  | "feedback"
  | "paused"
  | "finished";
