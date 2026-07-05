// DSST Experiment Configuration

import type { Condition, ExperimentConfig } from "./types";

export const SYMBOLS = {
  triangle: "△",
  circle: "○",
  square: "□",
  star: "☆",
  diamond: "◇",
  cross: "✕",
  heart: "♡",
  pentagon: "⬠",
  hexagon: "⬡",
} as const;

export const DEFAULT_CONDITIONS: Condition[] = [
  {
    id: "condition-1",
    name: "条件1",
    digitSymbolMap: { 1: "△", 2: "○", 3: "□", 4: "☆" },
    keySymbolMap: { F: "△", G: "○", H: "□", J: "☆" },
  },
  {
    id: "condition-2",
    name: "条件2",
    digitSymbolMap: { 1: "○", 2: "□", 3: "☆", 4: "△" },
    keySymbolMap: { F: "○", G: "□", H: "☆", J: "△" },
  },
];

export const DEFAULT_CONFIG: ExperimentConfig = {
  conditions: DEFAULT_CONDITIONS,
  durationMode: "time",
  totalTrials: 60,
  totalTimeSeconds: 1200,
  practiceTrials: 50,
  mode: "simple",
  mappingChangeRule: {
    enabled: true,
    changeAfterTrials: 20,
    changeAfterSeconds: 30,
    changeType: "custom",
    customMappings: [
      { 1: "○", 2: "△", 3: "□", 4: "☆" },
      { 1: "○", 2: "□", 3: "☆", 4: "△" },
      { 1: "☆", 2: "○", 3: "□", 4: "△" },
      { 1: "□", 2: "○", 3: "△", 4: "☆" },
      { 1: "△", 2: "□", 3: "○", 4: "☆" },
      { 1: "○", 2: "☆", 3: "□", 4: "△" },
      { 1: "□", 2: "☆", 3: "△", 4: "○" },
      { 1: "☆", 2: "□", 3: "○", 4: "△" },
      { 1: "△", 2: "☆", 3: "□", 4: "○" },
      { 1: "☆", 2: "○", 3: "△", 4: "□" },
    ],
  },
  mappingMemoryDurationMs: 10000,
  showFeedback: true,
  showReactionTime: true,
  feedbackDurationMs: 500,
  interTrialIntervalMs: 150,
  digits: [1, 2, 3, 4],
};

const STORAGE_KEY = "dsst-experiment-config";

export function loadConfig(): ExperimentConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Migration: if old config has timeLimitSeconds, convert to new format
      if (parsed.timeLimitSeconds && !parsed.totalTrials) {
        parsed.totalTrials = DEFAULT_CONFIG.totalTrials;
        parsed.practiceTrials = DEFAULT_CONFIG.practiceTrials;
        parsed.showReactionTime = DEFAULT_CONFIG.showReactionTime;
        delete parsed.timeLimitSeconds;
      }
      // Migration: add mode if missing
      if (!parsed.mode) {
        parsed.mode = DEFAULT_CONFIG.mode;
      }
      // Migration: add durationMode if missing
      if (!parsed.durationMode) {
        parsed.durationMode = DEFAULT_CONFIG.durationMode;
      }
      // Migration: add totalTimeSeconds if missing
      if (parsed.totalTimeSeconds === undefined) {
        parsed.totalTimeSeconds = DEFAULT_CONFIG.totalTimeSeconds;
      }
      // Migration: add changeAfterSeconds if missing
      if (parsed.mappingChangeRule && parsed.mappingChangeRule.changeAfterSeconds === undefined) {
        parsed.mappingChangeRule.changeAfterSeconds = DEFAULT_CONFIG.mappingChangeRule.changeAfterSeconds;
      }
      // Migration: add mappingMemoryDurationMs if missing
      if (parsed.mappingMemoryDurationMs === undefined) {
        parsed.mappingMemoryDurationMs = DEFAULT_CONFIG.mappingMemoryDurationMs;
      }
      return { ...DEFAULT_CONFIG, ...parsed };
    }
  } catch (e) {
    console.error("Failed to load config:", e);
  }
  return { ...DEFAULT_CONFIG };
}

export function saveConfig(config: ExperimentConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error("Failed to save config:", e);
  }
}
