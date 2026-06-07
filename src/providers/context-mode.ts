import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { ContextModeProvider, SessionEvent, SessionSummary } from "../types.js";

interface ContextModeDetection {
  adapter: string;
  sessionsDir: string;
}

function navigateCaseInsensitive(base: string, segment: string): string | null {
  if (!existsSync(base)) return null;
  try {
    for (const entry of readdirSync(base)) {
      if (entry.toLowerCase() === segment.toLowerCase()) {
        return join(base, entry);
      }
    }
  } catch {
    // permission denied or not a directory
  }
  return null;
}

function commandInstalled(command: string): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn(command, ["--version"], { stdio: "ignore" });
    child.on("error", () => resolve(false));
    child.on("close", (code) => resolve(code === 0));
  });
}

function detectContextMode(env: NodeJS.ProcessEnv): ContextModeDetection | null {
  const overridden = env.CONTEXT_MODE_DIR?.trim();
  if (overridden && overridden !== "") {
    const sessionsDir = join(overridden, "sessions");
    if (existsSync(sessionsDir)) {
      return { adapter: "env", sessionsDir };
    }
  }

  const home = homedir();

  const adapters = [
    { adapter: "pi", segments: [".pi", "context-mode", "sessions"] },
    { adapter: "omp", segments: [".omp", "context-mode", "sessions"] },
    { adapter: "claude-code", segments: [".claude", "context-mode", "sessions"] },
    { adapter: "codex", segments: [".codex", "context-mode", "sessions"] },
    { adapter: "cursor", segments: [".cursor", "context-mode", "sessions"] },
    { adapter: "gemini-cli", segments: [".gemini", "context-mode", "sessions"] },
    { adapter: "opencode", segments: [".config", "opencode", "context-mode", "sessions"] },
    { adapter: "kiro", segments: [".kiro", "context-mode", "sessions"] },
    { adapter: "vscode-copilot", segments: [".vscode", "context-mode", "sessions"] },
    { adapter: "jetbrains-copilot", segments: [".jetbrains", "context-mode", "sessions"] },
  ];

  for (const { adapter, segments } of adapters) {
    let current = home;
    for (const segment of segments) {
      const next = join(current, segment);
      if (existsSync(next)) {
        current = next;
      } else {
        const alt = navigateCaseInsensitive(current, segment);
        if (!alt) {
          current = "";
          break;
        }
        current = alt;
      }
    }
    if (current && existsSync(current)) {
      return { adapter, sessionsDir: current };
    }
  }

  return null;
}

function hashProjectDir(repositoryRoot: string): string {
  const normalized = repositoryRoot.replace(/\\/g, "/").replace(/\/+$/, "");
  const key =
    process.platform === "darwin" || process.platform === "win32"
      ? normalized.toLowerCase()
      : normalized;
  return createHash("sha256").update(key).digest("hex").slice(0, 16);
}

/**
 * Find the session DB path for this project.
 * Matches context-mode's resolveSessionDbPath logic:
 * `<sessionsDir>/<sha256_16_of_project><suffix>.db`
 */
function findSessionDb(sessionsDir: string, repositoryRoot: string): string | null {
  if (!existsSync(sessionsDir)) return null;

  const projectHash = hashProjectDir(repositoryRoot);

  // Try exact match first
  const exactPath = join(sessionsDir, `${projectHash}.db`);
  if (existsSync(exactPath)) return exactPath;

  // Try with suffix (git worktree suffix or env CONTEXT_MODE_SESSION_SUFFIX)
  try {
    for (const entry of readdirSync(sessionsDir)) {
      if (entry.startsWith(projectHash) && entry.endsWith(".db")) {
        return join(sessionsDir, entry);
      }
    }
  } catch {
    // can't read directory
  }

  return null;
}

/**
 * Lazy-load node:sqlite only when needed.
 * This avoids import errors on Node < 22.5.
 */
async function openSessionReadonly(dbPath: string): Promise<SessionReader | null> {
  try {
    const { DatabaseSync } = await import("node:sqlite");
    const db = new DatabaseSync(dbPath, { readOnly: true });
    return new SessionReader(db);
  } catch {
    return null;
  }
}

interface SessionRow {
  session_id: string;
  type: string;
  category: string;
  priority: number;
  data: string;
  created_at: string;
}

interface SessionMetaRow {
  session_id: string;
  started_at: string | null;
  event_count: number;
}

class SessionReader {
  constructor(private readonly db: { close(): void; prepare(sql: string): { all(...args: unknown[]): unknown[]; get(...args: unknown[]): unknown } }) {}

  latestSessionId(): string | null {
    const row = this.db
      .prepare("SELECT session_id FROM session_meta ORDER BY started_at DESC LIMIT 1")
      .get() as { session_id: string } | undefined;
    return row?.session_id ?? null;
  }

  sessionMeta(sessionId: string): SessionMetaRow | null {
    const row = this.db
      .prepare(
        "SELECT session_id, started_at, event_count FROM session_meta WHERE session_id = ?",
      )
      .get(sessionId) as SessionMetaRow | undefined;
    return row ?? null;
  }

  /**
   * Extract events by type from the session.
   * Categories roughly map to context-mode's event taxonomy:
   *   file, task, plan, rule      → category = "file" / "task" / "plan" / "rule"
   *   user_prompt, user_decision   → category = "user"
   *   git_checkout, git_commit, ... → type starts with "git_"
   *   error                        → category = "error"
   *   constraint, blocker          → category = "constraint" / "blocker"
   */
  eventsByCategory(sessionId: string, category: string, limit = 500): SessionEvent[] {
    const rows = this.db
      .prepare(
        `SELECT type, category, priority, data, created_at
         FROM session_events
         WHERE session_id = ? AND category = ?
         ORDER BY id ASC
         LIMIT ?`,
      )
      .all(sessionId, category, limit) as SessionRow[];
    return rows.map(parseEvent);
  }

  keyFiles(sessionId: string): string[] {
    const rows = this.db
      .prepare(
        `SELECT DISTINCT data
         FROM session_events
         WHERE session_id = ? AND category = 'file'
         LIMIT 20`,
      )
      .all(sessionId) as { data: string }[];
    return rows.map((r) => {
      try {
        const parsed = JSON.parse(r.data) as Record<string, unknown>;
        return String(parsed.path ?? parsed.file ?? "");
      } catch {
        return String(r.data);
      }
    }).filter(Boolean);
  }

  errors(sessionId: string): Array<{ error: string; fix: string | null }> {
    const rows = this.db
      .prepare(
        `SELECT type, data, created_at
         FROM session_events
         WHERE session_id = ? AND category = 'error'
         ORDER BY id ASC
         LIMIT 50`,
      )
      .all(sessionId) as SessionRow[];

    const errors: Array<{ error: string; fix: string | null }> = [];
    for (const row of rows) {
      try {
        const parsed = JSON.parse(row.data) as Record<string, unknown>;
        const detail = String(parsed.message ?? parsed.error ?? parsed.data ?? "");
        const fix = parsed.resolution ? String(parsed.resolution) : null;
        errors.push({ error: detail, fix });
      } catch {
        errors.push({ error: String(row.data), fix: null });
      }
    }
    return errors;
  }

  userEvents(sessionId: string): SessionEvent[] {
    const rows = this.db
      .prepare(
        `SELECT type, category, priority, data, created_at
         FROM session_events
         WHERE session_id = ? AND category = 'user'
         ORDER BY id ASC
         LIMIT 100`,
      )
      .all(sessionId) as SessionRow[];
    return rows.map(parseEvent);
  }

  lastUserPrompt(sessionId: string): string | null {
    const row = this.db
      .prepare(
        `SELECT data
         FROM session_events
         WHERE session_id = ? AND type = 'user_prompt'
         ORDER BY id DESC
         LIMIT 1`,
      )
      .get(sessionId) as { data: string } | undefined;
    if (!row) return null;
    try {
      const parsed = JSON.parse(row.data) as Record<string, unknown>;
      return String(parsed.text ?? parsed.content ?? parsed.prompt ?? "");
    } catch {
      return String(row.data);
    }
  }

  close(): void {
    try {
      this.db.close();
    } catch {
      // ignore close errors on read-only DB
    }
  }
}

function parseEvent(row: SessionRow): SessionEvent {
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(row.data) as Record<string, unknown>;
  } catch {
    parsed = { value: row.data };
  }
  return {
    type: row.type,
    category: row.category,
    priority: Number(row.priority) || 0,
    data: parsed,
    createdAt: row.created_at,
  };
}

export class ContextModeReader implements ContextModeProvider {
  private readonly env: NodeJS.ProcessEnv;

  constructor(env: NodeJS.ProcessEnv = process.env) {
    this.env = env;
  }

  async detect(): Promise<{ detected: boolean; adapter: string; dir: string; commandInstalled: boolean }> {
    const result = detectContextMode(this.env);
    if (result) {
      return { detected: true, adapter: result.adapter, dir: result.sessionsDir, commandInstalled: true };
    }
    const installed = await commandInstalled("context-mode");
    return { detected: false, adapter: "", dir: "", commandInstalled: installed };
  }

  async lastSession(repositoryRoot: string): Promise<SessionSummary | null> {
    const detection = detectContextMode(this.env);
    if (!detection) return null;

    const dbPath = findSessionDb(detection.sessionsDir, repositoryRoot);
    if (!dbPath) return null;

    const reader = await openSessionReadonly(dbPath);
    if (!reader) return null;

    try {
      const sessionId = reader.latestSessionId();
      if (!sessionId) return null;

      const meta = reader.sessionMeta(sessionId);
      const errors = reader.errors(sessionId);
      const files = reader.keyFiles(sessionId);
      const userEvents = reader.userEvents(sessionId);
      const lastPrompt = reader.lastUserPrompt(sessionId);

      // Extract decisions: user events where the user corrected or chose something
      const decisions = userEvents
        .filter((e) => e.type === "user_decision" || e.type === "user_correction")
        .map((e) => {
          const text = String(e.data.text ?? e.data.content ?? JSON.stringify(e.data));
          return text.slice(0, 500);
        })
        .filter((t) => t.length > 0);

      // Extract conventions from user decisions and patterns
      const conventions = detectConventions(userEvents, errors);

      return {
        sessionId,
        startedAt: meta?.started_at ?? null,
        eventCount: meta?.event_count ?? 0,
        decisions,
        conventions,
        errors: errors.slice(0, 20),
        keyFiles: files,
        lastPrompt,
      };
    } finally {
      reader.close();
    }
  }
}

/**
 * Heuristic-based convention detection from user decisions and error-fix pairs.
 * Looks for patterns like "use X", "always Y", "every Z must W", "never V".
 */
function detectConventions(
  userEvents: SessionEvent[],
  errors: Array<{ error: string; fix: string | null }>,
): string[] {
  const conventions: string[] = [];

  const allText = [
    ...userEvents.map((e) => String(e.data.text ?? e.data.content ?? "")),
    ...errors.filter((e) => e.fix).map((e) => `${e.error} → ${e.fix}`),
  ];

  for (const text of allText) {
    if (!text) continue;
    const lower = text.toLowerCase();

    // Heuristic patterns
    if (lower.match(/\b(?:always|every|must|should|never|don't|do not)\b.*\b(?:use|run|call|check|add|write|prefix|suffix|follow|avoid|keep)\b/)) {
      conventions.push(text.slice(0, 300));
    }

    // Error-fix pairs are conventions
    if (text.includes(" → ") && text.length > 20) {
      conventions.push(text.slice(0, 300));
    }
  }

  // Deduplicate by first 80 chars
  const seen = new Set<string>();
  return conventions.filter((c) => {
    const key = c.slice(0, 80).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
