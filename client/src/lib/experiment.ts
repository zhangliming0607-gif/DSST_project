// DSST Experiment Logic Utilities
// Design: Laboratory Minimal

import type {
  Condition,
  ExperimentConfig,
  ExperimentSession,
  ExperimentSummary,
  TrialLog,
} from "./types";

export function getRandomDigit(digits: number[]): number {
  return digits[Math.floor(Math.random() * digits.length)];
}

export function getCorrectKey(
  digit: number,
  condition: Condition
): { key: string; symbol: string } {
  const symbol = condition.digitSymbolMap[digit];
  const key = Object.entries(condition.keySymbolMap).find(
    ([, s]) => s === symbol
  )?.[0];
  return { key: key || "", symbol };
}

// Simple mode: given a symbol, find the correct digit
export function getCorrectDigitForSymbol(
  symbol: string,
  condition: Condition
): { digit: number; symbol: string } {
  const entry = Object.entries(condition.digitSymbolMap).find(
    ([, s]) => s === symbol
  );
  return { digit: entry ? parseInt(entry[0]) : 0, symbol };
}

// Get a random symbol from the condition's digit-symbol map
export function getRandomSymbol(
  condition: Condition,
  digits: number[]
): string {
  const randomDigit = digits[Math.floor(Math.random() * digits.length)];
  return condition.digitSymbolMap[randomDigit];
}

export function rotateMappings(
  digitSymbolMap: Record<number, string>,
  digits: number[]
): Record<number, string> {
  const symbols = digits.map(d => digitSymbolMap[d]);
  const rotated = [...symbols.slice(1), symbols[0]];
  const newMap: Record<number, string> = {};
  digits.forEach((d, i) => {
    newMap[d] = rotated[i];
  });
  return newMap;
}

export function shuffleMappings(
  digitSymbolMap: Record<number, string>,
  digits: number[]
): Record<number, string> {
  const symbols = digits.map(d => digitSymbolMap[d]);
  // Fisher-Yates shuffle
  for (let i = symbols.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [symbols[i], symbols[j]] = [symbols[j], symbols[i]];
  }
  const newMap: Record<number, string> = {};
  digits.forEach((d, i) => {
    newMap[d] = symbols[i];
  });
  return newMap;
}

export function calculateSummary(trials: TrialLog[]): ExperimentSummary {
  const correctTrials = trials.filter(t => t.isCorrect);
  const totalTrials = trials.length;
  const correctCount = correctTrials.length;
  const errorCount = totalTrials - correctCount;
  const accuracyRate = totalTrials > 0 ? correctCount / totalTrials : 0;

  const reactionTimes = trials.map(t => t.reactionTimeMs).sort((a, b) => a - b);
  const meanReactionTimeMs =
    reactionTimes.length > 0
      ? reactionTimes.reduce((sum, rt) => sum + rt, 0) / reactionTimes.length
      : 0;
  const medianReactionTimeMs =
    reactionTimes.length > 0
      ? reactionTimes.length % 2 === 0
        ? (reactionTimes[reactionTimes.length / 2 - 1] +
            reactionTimes[reactionTimes.length / 2]) /
          2
        : reactionTimes[Math.floor(reactionTimes.length / 2)]
      : 0;

  return {
    totalTrials,
    correctCount,
    errorCount,
    accuracyRate,
    meanReactionTimeMs: Math.round(meanReactionTimeMs),
    medianReactionTimeMs: Math.round(medianReactionTimeMs),
  };
}

export function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function sessionsToCSV(sessions: ExperimentSession[]): string {
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

  const rows = sessions.flatMap(session =>
    session.trials.map(trial => [
      session.sessionId,
      session.participantId,
      session.conditionName,
      trial.trialNumber,
      trial.presentedDigit,
      trial.correctSymbol,
      trial.correctKey,
      trial.respondedKey,
      trial.respondedSymbol,
      trial.isCorrect ? 1 : 0,
      trial.reactionTimeMs,
      JSON.stringify(trial.currentDigitSymbolMap),
      new Date(trial.timestamp).toISOString(),
    ])
  );

  return [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
}

export function summaryToCSV(sessions: ExperimentSession[]): string {
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

  const rows = sessions.map(session => [
    session.sessionId,
    session.participantId,
    session.conditionName,
    session.summary.totalTrials,
    session.summary.correctCount,
    session.summary.errorCount,
    session.summary.accuracyRate.toFixed(4),
    session.summary.meanReactionTimeMs,
    session.summary.medianReactionTimeMs,
    new Date(session.startTime).toISOString(),
    new Date(session.endTime).toISOString(),
    Math.round((session.endTime - session.startTime) / 1000),
  ]);

  return [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
}

export function downloadCSV(content: string, filename: string): void {
  const bom = "\uFEFF";
  const blob = new Blob([bom + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function applyMappingChange(
  config: ExperimentConfig,
  currentCondition: Condition,
  trialNumber: number
): Record<number, string> | null {
  const rule = config.mappingChangeRule;
  if (!rule.enabled) return null;
  // Only apply in trials mode
  if (config.durationMode !== "trials") return null;
  if (trialNumber === 0 || trialNumber % rule.changeAfterTrials !== 0)
    return null;

  return applyMappingChangeByType(
    rule,
    currentCondition.digitSymbolMap,
    config.digits,
    trialNumber,
    rule.changeAfterTrials
  );
}

/**
 * Time-based mapping change: check if enough seconds have elapsed since last change.
 * Returns new mapping if change should occur, null otherwise.
 * `changeCount` is how many times the mapping has already been changed (used for custom index).
 */
export function applyTimeMappingChange(
  config: ExperimentConfig,
  currentCondition: Condition,
  changeCount: number
): Record<number, string> | null {
  const rule = config.mappingChangeRule;
  if (!rule.enabled) return null;
  if (config.durationMode !== "time") return null;

  // changeCount+1 because we're about to apply the next change
  return applyMappingChangeByType(
    rule,
    currentCondition.digitSymbolMap,
    config.digits,
    changeCount + 1,
    1
  );
}

export function getInitialDigitSymbolMap(
  config: ExperimentConfig,
  condition: Condition
): Record<number, string> {
  const rule = config.mappingChangeRule;
  if (
    rule.enabled &&
    rule.changeType === "custom" &&
    rule.customMappings &&
    rule.customMappings.length > 0
  ) {
    return { ...rule.customMappings[0] };
  }
  return { ...condition.digitSymbolMap };
}

function applyMappingChangeByType(
  rule: ExperimentConfig["mappingChangeRule"],
  currentMap: Record<number, string>,
  digits: number[],
  changeIndex: number,
  divisor: number
): Record<number, string> | null {
  switch (rule.changeType) {
    case "rotate":
      return rotateMappings(currentMap, digits);
    case "shuffle":
      return shuffleMappings(currentMap, digits);
    case "custom":
      if (rule.customMappings && rule.customMappings.length > 0) {
        const idx =
          Math.floor(changeIndex / divisor) % rule.customMappings.length;
        return rule.customMappings[idx];
      }
      return null;
    default:
      return null;
  }
}
