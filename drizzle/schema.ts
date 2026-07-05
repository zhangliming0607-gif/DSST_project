import { bigint, boolean, int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Experiment configuration stored per user.
 * Stores the full JSON config for flexibility.
 */
export const experimentConfigs = mysqlTable("experiment_configs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  configData: json("configData").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ExperimentConfigRow = typeof experimentConfigs.$inferSelect;
export type InsertExperimentConfig = typeof experimentConfigs.$inferInsert;

/**
 * Experiment sessions - one row per completed experiment run.
 */
export const experimentSessions = mysqlTable("experiment_sessions", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("sessionId", { length: 128 }).notNull().unique(),
  userId: int("userId"),
  participantId: varchar("participantId", { length: 128 }).notNull(),
  conditionId: varchar("conditionId", { length: 128 }).notNull(),
  conditionName: varchar("conditionName", { length: 256 }).notNull(),
  startTime: bigint("startTime", { mode: "number" }).notNull(),
  endTime: bigint("endTime", { mode: "number" }).notNull(),
  totalTrials: int("totalTrials").notNull(),
  correctCount: int("correctCount").notNull(),
  errorCount: int("errorCount").notNull(),
  accuracyRate: varchar("accuracyRate", { length: 20 }).notNull(),
  meanReactionTimeMs: int("meanReactionTimeMs").notNull(),
  medianReactionTimeMs: int("medianReactionTimeMs").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ExperimentSessionRow = typeof experimentSessions.$inferSelect;
export type InsertExperimentSession = typeof experimentSessions.$inferInsert;

/**
 * Trial logs - one row per trial within a session.
 */
export const trialLogs = mysqlTable("trial_logs", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("sessionId", { length: 128 }).notNull(),
  trialNumber: int("trialNumber").notNull(),
  presentedDigit: int("presentedDigit").notNull(),
  correctSymbol: varchar("correctSymbol", { length: 10 }).notNull(),
  correctKey: varchar("correctKey", { length: 10 }).notNull(),
  respondedKey: varchar("respondedKey", { length: 10 }).notNull(),
  respondedSymbol: varchar("respondedSymbol", { length: 10 }).notNull(),
  isCorrect: boolean("isCorrect").notNull(),
  reactionTimeMs: int("reactionTimeMs").notNull(),
  conditionId: varchar("conditionId", { length: 128 }).notNull(),
  currentDigitSymbolMap: json("currentDigitSymbolMap").notNull(),
  trialTimestamp: bigint("trialTimestamp", { mode: "number" }).notNull(),
});

export type TrialLogRow = typeof trialLogs.$inferSelect;
export type InsertTrialLog = typeof trialLogs.$inferInsert;
