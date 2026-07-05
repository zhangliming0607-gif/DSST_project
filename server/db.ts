import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  experimentConfigs,
  experimentSessions,
  trialLogs,
  type InsertExperimentSession,
  type InsertTrialLog,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============================================================
// Experiment Config Helpers
// ============================================================

export async function getExperimentConfig(userId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(experimentConfigs)
    .where(eq(experimentConfigs.userId, userId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function upsertExperimentConfig(
  userId: number,
  configData: unknown
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getExperimentConfig(userId);
  if (existing) {
    await db
      .update(experimentConfigs)
      .set({ configData })
      .where(eq(experimentConfigs.userId, userId));
  } else {
    await db.insert(experimentConfigs).values({ userId, configData });
  }
}

// ============================================================
// Experiment Session Helpers
// ============================================================

export async function createExperimentSession(
  session: InsertExperimentSession,
  trials: InsertTrialLog[]
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Insert session
  await db.insert(experimentSessions).values(session);

  // Insert trials in batches of 100
  if (trials.length > 0) {
    const batchSize = 100;
    for (let i = 0; i < trials.length; i += batchSize) {
      const batch = trials.slice(i, i + batchSize);
      await db.insert(trialLogs).values(batch);
    }
  }
}

export async function getExperimentSessions(userId?: number) {
  const db = await getDb();
  if (!db) return [];

  if (userId !== undefined) {
    return db
      .select()
      .from(experimentSessions)
      .where(eq(experimentSessions.userId, userId))
      .orderBy(desc(experimentSessions.createdAt));
  }

  return db
    .select()
    .from(experimentSessions)
    .orderBy(desc(experimentSessions.createdAt));
}

export async function getSessionTrials(sessionId: string) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(trialLogs)
    .where(eq(trialLogs.sessionId, sessionId))
    .orderBy(trialLogs.trialNumber);
}

export async function deleteExperimentSession(sessionId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(trialLogs).where(eq(trialLogs.sessionId, sessionId));
  await db
    .delete(experimentSessions)
    .where(eq(experimentSessions.sessionId, sessionId));
}

export async function deleteAllSessions(userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (userId !== undefined) {
    // Get all session IDs for this user
    const sessions = await db
      .select({ sessionId: experimentSessions.sessionId })
      .from(experimentSessions)
      .where(eq(experimentSessions.userId, userId));

    for (const s of sessions) {
      await db.delete(trialLogs).where(eq(trialLogs.sessionId, s.sessionId));
    }
    await db
      .delete(experimentSessions)
      .where(eq(experimentSessions.userId, userId));
  } else {
    await db.delete(trialLogs);
    await db.delete(experimentSessions);
  }
}
