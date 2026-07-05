// Experiment Page - DSST Core
// Supports Standard, Simple, and Sequential (Standard→Simple) modes
// Supports both trial-count and time-based duration modes
// Shows mapping memory table before each mapping change (including start)

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useExperiment } from "@/contexts/ExperimentContext";
import {
  getRandomDigit,
  getCorrectKey,
  getCorrectDigitForSymbol,
  getRandomSymbol,
  calculateSummary,
  generateSessionId,
  applyMappingChange,
  applyTimeMappingChange,
  getInitialDigitSymbolMap,
} from "@/lib/experiment";
import type { ExperimentPhase, TrialLog, Condition } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import { Hash, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

const RESPONSE_FLASH_DURATION_MS = 90;

interface ExperimentProps {
  runType?: "experiment" | "practice";
}

export default function Experiment({
  runType = "experiment",
}: ExperimentProps) {
  const [, navigate] = useLocation();
  const { state, saveSessionToDb } = useExperiment();
  const { config } = state;
  const isPracticeOnly = runType === "practice";

  const baseCondition = config.conditions.find(
    c => c.id === state.currentConditionId
  );

  const isSequentialMode = config.mode === "sequential";
  const isTimeMode = config.durationMode === "time";

  // In sequential mode, we track which phase we're in (standard first, then simple)
  const [sequentialPhase, setSequentialPhase] = useState<"standard" | "simple">(
    "standard"
  );
  // Current active mode for this moment
  const activeMode =
    config.mode === "sequential"
      ? sequentialPhase
      : config.mode === "simple"
        ? "simple"
        : "standard";
  const isCurrentlySimple = activeMode === "simple";

  useEffect(() => {
    if (!state.currentParticipantId || !baseCondition) {
      navigate("/");
    }
  }, [state.currentParticipantId, baseCondition, navigate]);

  const [phase, setPhase] = useState<ExperimentPhase>("countdown");
  const [countdown, setCountdown] = useState(3);
  const [currentDigit, setCurrentDigit] = useState<number>(0);
  const [currentSymbol, setCurrentSymbol] = useState<string>("");
  const [trials, setTrials] = useState<TrialLog[]>([]);
  const [trialCount, setTrialCount] = useState(0);
  const [practiceCount, setPracticeCount] = useState(0);
  const [feedback, setFeedback] = useState<{
    isCorrect: boolean;
    rt: number;
  } | null>(null);
  const [showResponseFlash, setShowResponseFlash] = useState(false);
  const [currentDigitSymbolMap, setCurrentDigitSymbolMap] = useState<
    Record<number, string>
  >(baseCondition ? getInitialDigitSymbolMap(config, baseCondition) : {});
  const [isPractice, setIsPractice] = useState(isPracticeOnly);
  // For sequential mode: show transition screen between modes
  const [showTransition, setShowTransition] = useState(false);

  // Mapping memory table state
  const [memoryCountdown, setMemoryCountdown] = useState(0);

  // Time mode state
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const mappingChangeCountRef = useRef(0);
  const lastMappingChangeTimeRef = useRef(0);

  const trialStartTimeRef = useRef<number>(0);
  const inputLockedRef = useRef(false);
  const sessionIdRef = useRef(generateSessionId());
  const startTimeRef = useRef<number>(0);
  const finishedRef = useRef(false);
  const trialsRef = useRef<TrialLog[]>([]);
  // Track what to do after memory table dismisses
  const afterMemoryRef = useRef<
    "start_practice" | "start_running" | "resume_running"
  >("start_running");
  // Track when memory table started (to subtract paused time from elapsed)
  const memoryStartTimeRef = useRef<number>(0);

  const currentCondition: Condition | undefined = baseCondition
    ? { ...baseCondition, digitSymbolMap: currentDigitSymbolMap }
    : undefined;
  const practiceTarget = Math.max(1, config.practiceTrials);

  // In sequential mode with trials, total is doubled (standard + simple)
  const totalTarget = isSequentialMode
    ? config.totalTrials * 2
    : config.totalTrials;

  // Time mode: total time (sequential doubles it)
  const totalTimeTarget = isSequentialMode
    ? config.totalTimeSeconds * 2
    : config.totalTimeSeconds;

  const progress = isTimeMode
    ? elapsedSeconds / totalTimeTarget
    : trialCount / totalTarget;

  // Which phase label to show in sequential mode
  const sequentialLabel =
    isSequentialMode && sequentialPhase === "standard"
      ? isTimeMode
        ? `Standard (${elapsedSeconds}s/${config.totalTimeSeconds}s)`
        : `Standard (${trialCount}/${config.totalTrials})`
      : isSequentialMode && sequentialPhase === "simple"
        ? isTimeMode
          ? `Simple (${elapsedSeconds - config.totalTimeSeconds}s/${config.totalTimeSeconds}s)`
          : `Simple (${trialCount - config.totalTrials}/${config.totalTrials})`
        : "";

  // Present next stimulus
  const presentStimulus = useCallback(() => {
    if (!currentCondition) return;
    inputLockedRef.current = false;
    if (isCurrentlySimple) {
      const sym = getRandomSymbol(currentCondition, config.digits);
      setCurrentSymbol(sym);
    } else {
      setCurrentDigit(getRandomDigit(config.digits));
    }
    trialStartTimeRef.current = performance.now();
  }, [currentCondition, isCurrentlySimple, config.digits]);

  // Show mapping memory table
  const showMappingMemory = useCallback(
    (afterAction: "start_practice" | "start_running" | "resume_running") => {
      afterMemoryRef.current = afterAction;
      memoryStartTimeRef.current = Date.now();
      setMemoryCountdown(Math.ceil(config.mappingMemoryDurationMs / 1000));
      setPhase("mapping_memory");
    },
    [config.mappingMemoryDurationMs]
  );

  // Countdown for mapping memory table
  useEffect(() => {
    if (phase !== "mapping_memory") return;
    if (memoryCountdown <= 0) {
      // Memory time is up, proceed based on afterMemoryRef
      const action = afterMemoryRef.current;
      if (action === "start_practice") {
        setPhase("practice");
        presentStimulus();
      } else if (action === "start_running") {
        setPhase("running");
        startTimeRef.current = Date.now();
        lastMappingChangeTimeRef.current = Date.now();
        presentStimulus();
      } else if (action === "resume_running") {
        // Compensate: add paused duration to startTimeRef so it doesn't count
        const pausedDuration = Date.now() - memoryStartTimeRef.current;
        startTimeRef.current += pausedDuration;
        lastMappingChangeTimeRef.current += pausedDuration;
        setPhase("running");
        presentStimulus();
      }
      return;
    }
    const timer = setTimeout(() => setMemoryCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, memoryCountdown, presentStimulus]);

  // Countdown (3, 2, 1) → then show mapping memory table
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown <= 0) {
      // After countdown, show mapping memory table
      if (isPractice) {
        showMappingMemory("start_practice");
      } else {
        showMappingMemory("start_running");
      }
      return;
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, countdown, isPractice, showMappingMemory]);

  // Time mode: timer tick (every 200ms)
  useEffect(() => {
    if (!isTimeMode) return;
    if (phase !== "running") return;

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - startTimeRef.current) / 1000);
      setElapsedSeconds(elapsed);

      // Check if time is up
      if (
        isSequentialMode &&
        sequentialPhase === "standard" &&
        elapsed >= config.totalTimeSeconds
      ) {
        setShowTransition(true);
        clearInterval(interval);
        return;
      }
      if (elapsed >= totalTimeTarget) {
        setPhase("finished");
        clearInterval(interval);
        return;
      }

      // Check time-based mapping change
      if (
        config.mappingChangeRule.enabled &&
        config.mappingChangeRule.changeAfterSeconds > 0
      ) {
        const timeSinceLastChange = now - lastMappingChangeTimeRef.current;
        if (
          timeSinceLastChange >=
          config.mappingChangeRule.changeAfterSeconds * 1000
        ) {
          // Apply mapping change and show memory table
          if (baseCondition) {
            const currentMap = currentDigitSymbolMap;
            const newMapping = applyTimeMappingChange(
              config,
              { ...baseCondition, digitSymbolMap: currentMap },
              mappingChangeCountRef.current
            );
            if (newMapping) {
              setCurrentDigitSymbolMap(newMapping);
              mappingChangeCountRef.current += 1;
              lastMappingChangeTimeRef.current = now;
              // Show memory table for the new mapping
              clearInterval(interval);
              showMappingMemory("resume_running");
            }
          }
        }
      }
    }, 200);

    return () => clearInterval(interval);
  }, [
    isTimeMode,
    phase,
    config,
    baseCondition,
    totalTimeTarget,
    isSequentialMode,
    sequentialPhase,
    currentDigitSymbolMap,
    showMappingMemory,
  ]);

  // Next trial
  const nextTrial = useCallback(() => {
    const newTrialCount = trialCount + 1;

    if (!isTimeMode) {
      // Trial-count mode: check if we need to transition in sequential mode
      if (
        isSequentialMode &&
        sequentialPhase === "standard" &&
        newTrialCount >= config.totalTrials
      ) {
        setShowTransition(true);
        return;
      }

      // Check if experiment is done
      if (newTrialCount >= totalTarget) {
        setPhase("finished");
        return;
      }

      // Apply trial-based mapping change
      if (baseCondition) {
        const newMapping = applyMappingChange(
          config,
          { ...baseCondition, digitSymbolMap: currentDigitSymbolMap },
          newTrialCount
        );
        if (newMapping) {
          setCurrentDigitSymbolMap(newMapping);
          // Show mapping memory table instead of just a notification
          showMappingMemory("resume_running");
          return; // Don't proceed to next stimulus yet; memory table will handle it
        }
      }
    }

    setPhase("running");
    setFeedback(null);
    setTimeout(() => presentStimulus(), 10);
  }, [
    trialCount,
    totalTarget,
    config,
    baseCondition,
    currentDigitSymbolMap,
    presentStimulus,
    isSequentialMode,
    sequentialPhase,
    isTimeMode,
    showMappingMemory,
  ]);

  // Handle transition to Simple mode in sequential
  const handleTransitionToSimple = () => {
    setSequentialPhase("simple");
    setShowTransition(false);
    setFeedback(null);
    // In time mode, reset the mapping change timer for the simple phase
    if (isTimeMode) {
      lastMappingChangeTimeRef.current = Date.now();
      mappingChangeCountRef.current = 0;
    }
    // Show mapping memory table before starting simple mode
    showMappingMemory("resume_running");
  };

  // Next practice trial
  const nextPracticeTrial = useCallback(() => {
    const newPracticeCount = practiceCount + 1;
    if (newPracticeCount >= practiceTarget) {
      setPhase("practice_done");
      return;
    }
    setPhase("practice");
    setFeedback(null);
    setTimeout(() => presentStimulus(), 10);
  }, [practiceCount, practiceTarget, presentStimulus]);

  // Handle key press
  useEffect(() => {
    if (phase !== "running" && phase !== "practice") return;
    if (!currentCondition) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      let isValidKey = false;
      let isCorrect = false;
      let correctKey = "";
      let correctSymbol = "";
      let respondedSymbol = "";

      if (isCurrentlySimple) {
        const validDigits = config.digits.map(String);
        if (!validDigits.includes(key)) return;
        isValidKey = true;
        const { digit: correctDigit } = getCorrectDigitForSymbol(
          currentSymbol,
          currentCondition
        );
        correctKey = String(correctDigit);
        correctSymbol = currentSymbol;
        respondedSymbol = currentCondition.digitSymbolMap[parseInt(key)] || "";
        isCorrect = key === correctKey;
      } else {
        const validKeys = Object.keys(currentCondition.keySymbolMap);
        if (!validKeys.includes(key)) return;
        isValidKey = true;
        const result = getCorrectKey(currentDigit, currentCondition);
        correctKey = result.key;
        correctSymbol = result.symbol;
        respondedSymbol = currentCondition.keySymbolMap[key] || "";
        isCorrect = key === correctKey;
      }

      if (!isValidKey) return;
      e.preventDefault();
      if (inputLockedRef.current) return;
      inputLockedRef.current = true;

      const rt = Math.round(performance.now() - trialStartTimeRef.current);
      setShowResponseFlash(true);
      window.setTimeout(() => {
        setShowResponseFlash(false);
      }, RESPONSE_FLASH_DURATION_MS);

      if (phase === "practice") {
        setPracticeCount(c => c + 1);
        if (config.showFeedback) {
          setFeedback({ isCorrect, rt });
          setPhase("practice_feedback");
          setTimeout(() => nextPracticeTrial(), config.feedbackDurationMs);
        } else {
          setTimeout(() => nextPracticeTrial(), config.interTrialIntervalMs);
        }
        return;
      }

      // Main experiment
      const trial: TrialLog = {
        trialNumber: trialCount + 1,
        presentedDigit: isCurrentlySimple
          ? getCorrectDigitForSymbol(currentSymbol, currentCondition).digit
          : currentDigit,
        correctSymbol,
        correctKey,
        respondedKey: key,
        respondedSymbol,
        isCorrect,
        reactionTimeMs: rt,
        conditionId: currentCondition.id,
        currentDigitSymbolMap: { ...currentDigitSymbolMap },
        timestamp: Date.now(),
        mode: isCurrentlySimple ? "simple" : "standard",
      };

      setTrials(prev => {
        const updated = [...prev, trial];
        trialsRef.current = updated;
        return updated;
      });
      setTrialCount(c => c + 1);

      if (config.showFeedback) {
        setFeedback({ isCorrect, rt });
        setPhase("feedback");
        setTimeout(() => nextTrial(), config.feedbackDurationMs);
      } else {
        setTimeout(() => nextTrial(), config.interTrialIntervalMs);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    phase,
    currentCondition,
    currentDigit,
    currentSymbol,
    trialCount,
    config,
    nextTrial,
    nextPracticeTrial,
    currentDigitSymbolMap,
    practiceCount,
    isCurrentlySimple,
  ]);

  // Start main experiment after practice
  const startMainExperiment = () => {
    setIsPractice(false);
    setFeedback(null);
    // Show mapping memory table before starting main experiment
    showMappingMemory("start_running");
  };

  const goToMainExperiment = () => {
    navigate("/experiment");
  };

  // Finish experiment
  useEffect(() => {
    if (phase !== "finished" || finishedRef.current) return;
    finishedRef.current = true;

    const finalTrials = trialsRef.current;
    if (finalTrials.length > 0 && baseCondition) {
      const session = {
        sessionId: sessionIdRef.current,
        participantId: state.currentParticipantId,
        conditionId: baseCondition.id,
        conditionName: baseCondition.name,
        startTime: startTimeRef.current,
        endTime: Date.now(),
        trials: finalTrials,
        summary: calculateSummary(finalTrials),
      };
      saveSessionToDb(session);
    }
    setTimeout(() => navigate("/result"), 500);
  }, [
    phase,
    state.currentParticipantId,
    baseCondition,
    saveSessionToDb,
    navigate,
  ]);

  if (!currentCondition || !baseCondition) return null;

  // Mode label for display
  const modeLabel = isSequentialMode
    ? sequentialPhase === "standard"
      ? "Standard"
      : "Simple"
    : isCurrentlySimple
      ? "Simple"
      : "Standard";

  // Format remaining time for display
  const remainingSeconds = isTimeMode
    ? Math.max(0, totalTimeTarget - elapsedSeconds)
    : 0;
  const formatTime = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-background select-none">
      {/* Countdown Overlay */}
      <AnimatePresence>
        {phase === "countdown" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background flex items-center justify-center"
          >
            <motion.div
              key={countdown}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="text-center"
            >
              {countdown > 0 ? (
                <span className="text-8xl font-mono font-bold text-primary">
                  {countdown}
                </span>
              ) : (
                <span className="text-4xl font-bold text-primary">
                  {isPracticeOnly ? "練習スタート！" : "スタート！"}
                </span>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mapping Memory Table Overlay */}
      <AnimatePresence>
        {phase === "mapping_memory" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background flex items-center justify-center"
          >
            <div className="text-center space-y-8 max-w-lg px-4">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-foreground">
                  マッピングを覚えてください
                </h2>
                <p className="text-base text-muted-foreground">
                  以下の対応関係を記憶してください。{memoryCountdown}
                  秒後に開始します。
                </p>
              </div>

              {/* Memory Table */}
              <div className="inline-flex flex-col gap-4 p-6 bg-white border-2 border-primary/20 rounded-2xl shadow-sm">
                <div className="grid grid-cols-4 gap-6">
                  {config.digits.map(digit => (
                    <div
                      key={digit}
                      className="flex flex-col items-center gap-2"
                    >
                      <span className="font-mono font-bold text-3xl text-foreground">
                        {digit}
                      </span>
                      <span className="text-muted-foreground text-xl">↓</span>
                      <span className="text-5xl leading-none">
                        {currentDigitSymbolMap[digit]}
                      </span>
                    </div>
                  ))}
                </div>
                {!isCurrentlySimple && (
                  <div className="pt-4 border-t border-border/40">
                    <p className="text-sm text-muted-foreground mb-3">
                      キー対応
                    </p>
                    <div className="grid grid-cols-4 gap-4">
                      {Object.entries(currentCondition.keySymbolMap).map(
                        ([key, symbol]) => (
                          <div
                            key={key}
                            className="flex items-center gap-2 justify-center"
                          >
                            <kbd className="font-mono font-bold text-base bg-muted border border-border rounded px-2.5 py-1">
                              {key}
                            </kbd>
                            <span className="text-2xl">{symbol}</span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
                {isCurrentlySimple && (
                  <div className="pt-4 border-t border-border/40">
                    <p className="text-sm text-muted-foreground mb-3">
                      数字キー対応
                    </p>
                    <div className="grid grid-cols-4 gap-4">
                      {config.digits.map(digit => (
                        <div
                          key={digit}
                          className="flex items-center gap-2 justify-center"
                        >
                          <kbd className="font-mono font-bold text-base bg-muted border border-border rounded px-2.5 py-1">
                            {digit}
                          </kbd>
                          <span className="text-2xl">
                            {currentDigitSymbolMap[digit]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Countdown indicator */}
              <div className="flex items-center justify-center gap-2">
                <div className="w-48 h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    initial={{ width: "100%" }}
                    animate={{ width: "0%" }}
                    transition={{
                      duration: memoryCountdown,
                      ease: "linear",
                    }}
                  />
                </div>
                <span className="font-mono text-base font-bold text-primary">
                  {memoryCountdown}s
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Practice Done Overlay */}
      <AnimatePresence>
        {phase === "practice_done" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background flex items-center justify-center"
          >
            <div className="text-center space-y-6 max-w-md px-4">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-foreground">練習完了</h2>
                <p className="text-muted-foreground">
                  {isPracticeOnly
                    ? "練習が終わりました。必要に応じてもう一度練習するか、本番へ進んでください。"
                    : "練習が終わりました。準備ができたら本番を開始してください。"}
                </p>
                {!isPracticeOnly && (
                  <p className="text-sm text-muted-foreground">
                    {isTimeMode
                      ? isSequentialMode
                        ? `本番は Standard ${config.totalTimeSeconds}秒 → Simple ${config.totalTimeSeconds}秒 の合計${totalTimeTarget}秒です。`
                        : `本番は ${config.totalTimeSeconds}秒 です。`
                      : isSequentialMode
                        ? `本番は Standard ${config.totalTrials}試行 → Simple ${config.totalTrials}試行 の合計${totalTarget}試行です。`
                        : `本番は ${totalTarget} 試行です。`}
                  </p>
                )}
              </div>
              {isPracticeOnly ? (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Button
                    variant="outline"
                    size="lg"
                    className="font-semibold px-8"
                    onClick={() => navigate("/")}
                  >
                    ホームに戻る
                  </Button>
                  <Button
                    size="lg"
                    className="font-semibold px-8"
                    onClick={goToMainExperiment}
                  >
                    本番へ進む
                  </Button>
                </div>
              ) : (
                <Button
                  size="lg"
                  className="font-semibold px-8"
                  onClick={startMainExperiment}
                >
                  本番を開始する
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sequential Transition Overlay */}
      <AnimatePresence>
        {showTransition && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background flex items-center justify-center"
          >
            <div className="text-center space-y-6 max-w-md px-4">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  Standard パート完了
                </div>
                <h2 className="text-2xl font-bold text-foreground">
                  次は Simple モードです
                </h2>
                <p className="text-muted-foreground">
                  記号が表示されるので、対応する数字キー（1/2/3/4）を押してください。
                </p>
                <p className="text-sm text-muted-foreground">
                  {isTimeMode
                    ? `残り ${config.totalTimeSeconds}秒`
                    : `残り ${config.totalTrials} 試行`}
                </p>
              </div>
              <Button
                size="lg"
                className="font-semibold px-8"
                onClick={handleTransitionToSimple}
              >
                Simple モードを開始する
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Bar */}
      <div className="border-b border-border/60 bg-white">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-4">
            {isPractice ? (
              <span className="text-base font-semibold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-md">
                練習モード
              </span>
            ) : isTimeMode ? (
              <>
                <div className="flex items-center gap-2 text-base">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                  <span className="font-mono font-bold text-xl tabular-nums text-foreground">
                    {formatTime(remainingSeconds)}
                  </span>
                </div>
                <div className="w-32 h-1.5 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    animate={{ width: `${Math.min(progress * 100, 100)}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <span className="text-sm text-muted-foreground font-mono">
                  #{trialCount}
                </span>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 text-base">
                  <Hash className="w-5 h-5 text-muted-foreground" />
                  <span className="font-mono font-bold text-xl tabular-nums text-foreground">
                    {trialCount} / {totalTarget}
                  </span>
                </div>
                <div className="w-32 h-1.5 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    animate={{ width: `${Math.min(progress * 100, 100)}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-4 text-base text-muted-foreground">
            {isPractice && (
              <span className="font-mono">
                {practiceCount} / {practiceTarget}
              </span>
            )}
            {isSequentialMode && !isPractice && (
              <span className="text-sm font-mono">{sequentialLabel}</span>
            )}
            <span className="text-sm px-2.5 py-1 bg-muted rounded-md">
              {modeLabel} · {baseCondition.name}
            </span>
          </div>
        </div>
      </div>

      {/* Main Experiment Area */}
      <main className="flex-1 flex flex-col items-center justify-center gap-10 px-4">
        {/* Stimulus Display */}
        <div className="relative">
          <motion.div
            key={`${trialCount}-${practiceCount}-${isCurrentlySimple ? currentSymbol : currentDigit}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.1 }}
            className={`w-56 h-56 flex items-center justify-center border-2 rounded-2xl transition-colors duration-75 ${
              showResponseFlash
                ? "bg-slate-300 border-slate-400 shadow-inner"
                : "bg-white border-border shadow-sm"
            }`}
          >
            {(phase === "running" ||
              phase === "feedback" ||
              phase === "practice" ||
              phase === "practice_feedback") &&
              (isCurrentlySimple ? (
                <span className="text-9xl leading-none">{currentSymbol}</span>
              ) : (
                <span className="font-mono text-9xl font-bold text-foreground">
                  {currentDigit}
                </span>
              ))}
          </motion.div>
        </div>

        {/* Feedback */}
        <div className="h-12">
          <AnimatePresence mode="wait">
            {feedback &&
              (phase === "feedback" || phase === "practice_feedback") && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`flex items-center gap-2.5 text-lg font-semibold ${
                    feedback.isCorrect ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {feedback.isCorrect ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <XCircle className="w-5 h-5" />
                  )}
                  <span>
                    {feedback.isCorrect ? "正解" : "不正解"}
                    {config.showReactionTime && ` — ${feedback.rt}ms`}
                  </span>
                </motion.div>
              )}
          </AnimatePresence>
        </div>

        <p className="text-2xl font-semibold text-slate-600">
          {isCurrentlySimple
            ? "表示された記号に対応する数字キーを押してください"
            : "表示された数字に対応する記号のキーを押してください"}
        </p>
      </main>
    </div>
  );
}
