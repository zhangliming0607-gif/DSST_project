// DSST Experiment Context
// Manages global experiment state with DB persistence via tRPC

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  type ReactNode,
} from "react";
import { loadConfig, saveConfig } from "@/lib/config";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import type { ExperimentConfig, ExperimentSession } from "@/lib/types";

interface ExperimentState {
  config: ExperimentConfig;
  sessions: ExperimentSession[];
  currentParticipantId: string;
  currentConditionId: string;
  isDbSynced: boolean;
}

type ExperimentAction =
  | { type: "SET_CONFIG"; payload: ExperimentConfig }
  | { type: "ADD_SESSION"; payload: ExperimentSession }
  | { type: "SET_PARTICIPANT_ID"; payload: string }
  | { type: "SET_CONDITION_ID"; payload: string }
  | { type: "CLEAR_SESSIONS" }
  | { type: "LOAD_SESSIONS"; payload: ExperimentSession[] }
  | { type: "SET_DB_SYNCED"; payload: boolean };

function experimentReducer(
  state: ExperimentState,
  action: ExperimentAction
): ExperimentState {
  switch (action.type) {
    case "SET_CONFIG":
      // Always save to localStorage as fallback
      saveConfig(action.payload);
      return { ...state, config: action.payload };
    case "ADD_SESSION":
      return { ...state, sessions: [...state.sessions, action.payload] };
    case "SET_PARTICIPANT_ID":
      return { ...state, currentParticipantId: action.payload };
    case "SET_CONDITION_ID":
      return { ...state, currentConditionId: action.payload };
    case "CLEAR_SESSIONS":
      return { ...state, sessions: [] };
    case "LOAD_SESSIONS":
      return { ...state, sessions: action.payload };
    case "SET_DB_SYNCED":
      return { ...state, isDbSynced: action.payload };
    default:
      return state;
  }
}

const ExperimentContext = createContext<{
  state: ExperimentState;
  dispatch: React.Dispatch<ExperimentAction>;
  saveSessionToDb: (session: ExperimentSession) => Promise<void>;
  saveConfigToDb: (config: ExperimentConfig) => Promise<void>;
  clearAllSessionsFromDb: () => Promise<void>;
} | null>(null);

export function ExperimentProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(experimentReducer, {
    config: loadConfig(),
    sessions: [],
    currentParticipantId: "",
    currentConditionId: "",
    isDbSynced: false,
  });

  const { isAuthenticated } = useAuth();

  // Load config from DB when authenticated
  const { data: dbConfig } = trpc.config.get.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // Load sessions from DB when authenticated
  const { data: dbSessions } = trpc.experiment.listSessions.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  // Sync config from DB (merge with defaults for migration)
  useEffect(() => {
    if (dbConfig && isAuthenticated) {
      const raw = dbConfig as Record<string, unknown>;
      // Migrate old config: if it has timeLimitSeconds, convert to new format
      const migrated: ExperimentConfig = {
        ...loadConfig(), // defaults as base
        ...(raw as Partial<ExperimentConfig>),
        totalTrials: (raw.totalTrials as number) || loadConfig().totalTrials,
        practiceTrials: (raw.practiceTrials as number) ?? loadConfig().practiceTrials,
        showReactionTime: (raw.showReactionTime as boolean) ?? loadConfig().showReactionTime,
      };
      dispatch({ type: "SET_CONFIG", payload: migrated });
      dispatch({ type: "SET_DB_SYNCED", payload: true });
    }
  }, [dbConfig, isAuthenticated]);

  // Sync sessions from DB
  useEffect(() => {
    if (dbSessions && isAuthenticated) {
      // Convert DB rows to ExperimentSession format
      const sessions: ExperimentSession[] = dbSessions.map((s) => ({
        sessionId: s.sessionId,
        participantId: s.participantId,
        conditionId: s.conditionId,
        conditionName: s.conditionName,
        startTime: s.startTime,
        endTime: s.endTime,
        trials: [], // Trials loaded on demand
        summary: {
          totalTrials: s.totalTrials,
          correctCount: s.correctCount,
          errorCount: s.errorCount,
          accuracyRate: parseFloat(s.accuracyRate),
          meanReactionTimeMs: s.meanReactionTimeMs,
          medianReactionTimeMs: s.medianReactionTimeMs,
        },
      }));
      dispatch({ type: "LOAD_SESSIONS", payload: sessions });
    }
  }, [dbSessions, isAuthenticated]);

  // tRPC mutations
  const saveSessionMutation = trpc.experiment.saveSession.useMutation();
  const saveConfigMutation = trpc.config.save.useMutation();
  const clearAllMutation = trpc.experiment.clearAll.useMutation();
  const utils = trpc.useUtils();

  const saveSessionToDb = async (session: ExperimentSession) => {
    dispatch({ type: "ADD_SESSION", payload: session });

    if (isAuthenticated) {
      try {
        await saveSessionMutation.mutateAsync({
          sessionId: session.sessionId,
          participantId: session.participantId,
          conditionId: session.conditionId,
          conditionName: session.conditionName,
          startTime: session.startTime,
          endTime: session.endTime,
          trials: session.trials.map((t) => ({
            trialNumber: t.trialNumber,
            presentedDigit: t.presentedDigit,
            correctSymbol: t.correctSymbol,
            correctKey: t.correctKey,
            respondedKey: t.respondedKey,
            respondedSymbol: t.respondedSymbol,
            isCorrect: t.isCorrect,
            reactionTimeMs: t.reactionTimeMs,
            conditionId: t.conditionId,
            currentDigitSymbolMap: Object.fromEntries(
              Object.entries(t.currentDigitSymbolMap).map(([k, v]) => [
                String(k),
                String(v),
              ])
            ),
            timestamp: t.timestamp,
            mode: t.mode,
          })),
          summary: session.summary,
        });
        utils.experiment.listSessions.invalidate();
      } catch (err) {
        console.error("Failed to save session to DB:", err);
      }
    }
  };

  const saveConfigToDb = async (config: ExperimentConfig) => {
    dispatch({ type: "SET_CONFIG", payload: config });

    if (isAuthenticated) {
      try {
        await saveConfigMutation.mutateAsync({ configData: config });
        utils.config.get.invalidate();
      } catch (err) {
        console.error("Failed to save config to DB:", err);
      }
    }
  };

  const clearAllSessionsFromDb = async () => {
    dispatch({ type: "CLEAR_SESSIONS" });

    if (isAuthenticated) {
      try {
        await clearAllMutation.mutateAsync();
        utils.experiment.listSessions.invalidate();
      } catch (err) {
        console.error("Failed to clear sessions from DB:", err);
      }
    }
  };

  return (
    <ExperimentContext.Provider
      value={{
        state,
        dispatch,
        saveSessionToDb,
        saveConfigToDb,
        clearAllSessionsFromDb,
      }}
    >
      {children}
    </ExperimentContext.Provider>
  );
}

export function useExperiment() {
  const context = useContext(ExperimentContext);
  if (!context) {
    throw new Error("useExperiment must be used within ExperimentProvider");
  }
  return context;
}
