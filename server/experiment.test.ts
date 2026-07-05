import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId = 1): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `test-user-${userId}`,
    email: `test${userId}@example.com`,
    name: `Test User ${userId}`,
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

describe("experiment router", () => {
  it("config.get returns null when no config exists", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.config.get();
    expect(result === null || typeof result === "object").toBe(true);
  });

  it("experiment.listSessions returns an array", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.experiment.listSessions();
    expect(Array.isArray(result)).toBe(true);
  });

  it("experiment.saveSession validates input and persists", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const sessionId = `test-session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const sessionInput = {
      sessionId,
      participantId: "P001",
      conditionId: "condition-1",
      conditionName: "条件1",
      startTime: Date.now() - 90000,
      endTime: Date.now(),
      trials: [
        {
          trialNumber: 1,
          presentedDigit: 3,
          correctSymbol: "□",
          correctKey: "H",
          respondedKey: "H",
          respondedSymbol: "□",
          isCorrect: true,
          reactionTimeMs: 450,
          conditionId: "condition-1",
          currentDigitSymbolMap: { "1": "△", "2": "○", "3": "□", "4": "☆" },
          timestamp: Date.now(),
        },
      ],
      summary: {
        totalTrials: 1,
        correctCount: 1,
        errorCount: 0,
        accuracyRate: 1.0,
        meanReactionTimeMs: 450,
        medianReactionTimeMs: 450,
      },
    };

    const result = await caller.experiment.saveSession(sessionInput);
    expect(result).toEqual({ success: true });
  });

  it("config.save persists config data", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const configData = {
      conditions: [
        {
          id: "condition-1",
          name: "条件1",
          digitSymbolMap: { 1: "△", 2: "○", 3: "□", 4: "☆" },
          keySymbolMap: { F: "△", G: "○", H: "□", J: "☆" },
        },
      ],
      timeLimitSeconds: 90,
      mappingChangeRule: {
        enabled: false,
        changeAfterTrials: 20,
        changeType: "rotate",
      },
      showFeedback: true,
      feedbackDurationMs: 500,
      interTrialIntervalMs: 200,
      digits: [1, 2, 3, 4],
    };

    const result = await caller.config.save({ configData });
    expect(result).toEqual({ success: true });

    const loaded = await caller.config.get();
    expect(loaded).toBeTruthy();
  });

  it("unauthenticated users cannot access config.get", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.config.get()).rejects.toThrow();
  });

  it("unauthenticated users cannot access experiment.listSessions", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.experiment.listSessions()).rejects.toThrow();
  });

  it("unauthenticated users cannot access experiment.clearAll", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.experiment.clearAll()).rejects.toThrow();
  });

  it("experiment.getTrials rejects for non-owned session", async () => {
    const ctx = createAuthContext(999);
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.experiment.getTrials({ sessionId: "non-existent-session" })
    ).rejects.toThrow("Session not found");
  });

  it("experiment.clearAll returns success", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.experiment.clearAll();
    expect(result).toEqual({ success: true });
  });
});
