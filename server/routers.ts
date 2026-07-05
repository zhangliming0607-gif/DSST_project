import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  getExperimentConfig,
  upsertExperimentConfig,
  createExperimentSession,
  getExperimentSessions,
  getSessionTrials,
  deleteAllSessions,
} from "./db";

// Zod schemas for validation
const trialLogSchema = z.object({
  trialNumber: z.number(),
  presentedDigit: z.number(),
  correctSymbol: z.string(),
  correctKey: z.string(),
  respondedKey: z.string(),
  respondedSymbol: z.string(),
  isCorrect: z.boolean(),
  reactionTimeMs: z.number(),
  conditionId: z.string(),
  currentDigitSymbolMap: z.record(z.string(), z.string()),
  timestamp: z.number(),
  mode: z.enum(["standard", "simple"]).optional(),
});

const sessionInputSchema = z.object({
  sessionId: z.string(),
  participantId: z.string(),
  conditionId: z.string(),
  conditionName: z.string(),
  startTime: z.number(),
  endTime: z.number(),
  trials: z.array(trialLogSchema),
  summary: z.object({
    totalTrials: z.number(),
    correctCount: z.number(),
    errorCount: z.number(),
    accuracyRate: z.number(),
    meanReactionTimeMs: z.number(),
    medianReactionTimeMs: z.number(),
  }),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // Experiment Config
  config: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const config = await getExperimentConfig(ctx.user.id);
      return config?.configData ?? null;
    }),

    save: protectedProcedure
      .input(z.object({ configData: z.unknown() }))
      .mutation(async ({ ctx, input }) => {
        await upsertExperimentConfig(ctx.user.id, input.configData);
        return { success: true };
      }),
  }),

  // Experiment Sessions
  experiment: router({
    saveSession: protectedProcedure
      .input(sessionInputSchema)
      .mutation(async ({ ctx, input }) => {
        // Build session row
        const sessionRow = {
          sessionId: input.sessionId,
          userId: ctx.user.id,
          participantId: input.participantId,
          conditionId: input.conditionId,
          conditionName: input.conditionName,
          startTime: input.startTime,
          endTime: input.endTime,
          totalTrials: input.summary.totalTrials,
          correctCount: input.summary.correctCount,
          errorCount: input.summary.errorCount,
          accuracyRate: input.summary.accuracyRate.toFixed(4),
          meanReactionTimeMs: input.summary.meanReactionTimeMs,
          medianReactionTimeMs: input.summary.medianReactionTimeMs,
        };

        // Build trial rows
        const trialRows = input.trials.map((t) => ({
          sessionId: input.sessionId,
          trialNumber: t.trialNumber,
          presentedDigit: t.presentedDigit,
          correctSymbol: t.correctSymbol,
          correctKey: t.correctKey,
          respondedKey: t.respondedKey,
          respondedSymbol: t.respondedSymbol,
          isCorrect: t.isCorrect,
          reactionTimeMs: t.reactionTimeMs,
          conditionId: t.conditionId,
          currentDigitSymbolMap: t.currentDigitSymbolMap,
          trialTimestamp: t.timestamp,
        }));

        await createExperimentSession(sessionRow, trialRows);
        return { success: true };
      }),

    listSessions: protectedProcedure.query(async ({ ctx }) => {
      return getExperimentSessions(ctx.user.id);
    }),

    getTrials: protectedProcedure
      .input(z.object({ sessionId: z.string() }))
      .query(async ({ ctx, input }) => {
        // Verify session belongs to user
        const sessions = await getExperimentSessions(ctx.user.id);
        const ownsSession = sessions.some(
          (s) => s.sessionId === input.sessionId
        );
        if (!ownsSession) {
          throw new Error("Session not found");
        }
        return getSessionTrials(input.sessionId);
      }),

    clearAll: protectedProcedure.mutation(async ({ ctx }) => {
      await deleteAllSessions(ctx.user.id);
      return { success: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;
