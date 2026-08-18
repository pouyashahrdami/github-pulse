import type { Pulse, PulseState } from "./pulse";
import { redis, redisConfigured } from "./redis";

/**
 * Per-user chart history — the card's long-term memory. Persists in Upstash
 * Redis (or Vercel KV, same REST protocol) when UPSTASH_REDIS_REST_URL/TOKEN
 * are set; otherwise falls back to per-instance memory, which survives warm
 * lambda reuse but not cold starts. Opt-in per card via ?record=1.
 */
export interface MedicalRecord {
  firstSeen: string; // YYYY-MM-DD
  flatlines: number;
  revivals: number;
  longestStreak: number;
  lastState: PulseState;
  updatedAt: string;
}

const memory = new Map<string, MedicalRecord>();

async function load(key: string): Promise<MedicalRecord | undefined> {
  if (!redisConfigured()) return memory.get(key);
  const raw = await redis(["GET", key]);
  return typeof raw === "string"
    ? (JSON.parse(raw) as MedicalRecord)
    : undefined;
}

async function save(key: string, rec: MedicalRecord): Promise<void> {
  if (!redisConfigured()) {
    memory.set(key, rec);
    return;
  }
  await redis(["SET", key, JSON.stringify(rec)]);
}

/** Fold this render's vitals into the user's chart and return the updated record. */
export async function touchRecord(pulse: Pulse): Promise<MedicalRecord> {
  const key = `pulse:${pulse.login.toLowerCase()}`;
  const today = new Date().toISOString().slice(0, 10);
  const prev = await load(key);
  const rec: MedicalRecord = prev ?? {
    firstSeen: today,
    flatlines: 0,
    revivals: 0,
    longestStreak: 0,
    lastState: pulse.state,
    updatedAt: today,
  };
  if (prev) {
    if (prev.lastState !== "flatline" && pulse.state === "flatline") {
      rec.flatlines++;
    }
    if (prev.lastState === "flatline" && pulse.state !== "flatline") {
      rec.revivals++;
    }
  }
  rec.longestStreak = Math.max(rec.longestStreak, pulse.streak);
  rec.lastState = pulse.state;
  rec.updatedAt = today;
  await save(key, rec);
  return rec;
}
