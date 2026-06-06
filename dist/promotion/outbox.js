import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
export class PromotionOutbox {
    db;
    constructor(databasePath) {
        mkdirSync(path.dirname(databasePath), { recursive: true });
        this.db = new DatabaseSync(databasePath);
        this.db.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS promotion_jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        idempotency_key TEXT NOT NULL UNIQUE,
        source_id TEXT NOT NULL,
        payload TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        attempts INTEGER NOT NULL DEFAULT 0,
        available_at INTEGER NOT NULL,
        decision TEXT,
        last_error TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_promotion_jobs_pending
        ON promotion_jobs(status, available_at);
      CREATE TABLE IF NOT EXISTS retained_memories (
        source_id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        repository_id TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        payload TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'private',
        promotion_method TEXT,
        promoted_at INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);
        this.ensureIdentityColumn("workspace_id");
        this.ensureIdentityColumn("repository_id");
    }
    remember(sourceId, payload) {
        const now = Date.now();
        this.db.prepare(`
      INSERT OR IGNORE INTO retained_memories
        (source_id, org_id, project_id, workspace_id, repository_id, agent_id, payload, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(sourceId, payload.identity.orgId, payload.identity.projectId, payload.identity.workspaceId, payload.identity.repositoryId, payload.identity.agentId, JSON.stringify(payload), now, now);
    }
    getMemory(sourceId, identity) {
        const row = this.db.prepare(`
      SELECT source_id, payload, status
      FROM retained_memories
      WHERE source_id = ? AND org_id = ? AND project_id = ?
        AND workspace_id = ? AND repository_id = ? AND agent_id = ?
    `).get(sourceId, identity.orgId, identity.projectId, identity.workspaceId, identity.repositoryId, identity.agentId);
        if (!row)
            return undefined;
        return {
            sourceId: row.source_id,
            payload: JSON.parse(row.payload),
            status: row.status,
        };
    }
    beginPromotion(sourceId) {
        const row = this.db.prepare(`
      SELECT status FROM retained_memories WHERE source_id = ?
    `).get(sourceId);
        if (!row)
            return "not-found";
        if (row.status === "promoted")
            return "promoted";
        if (row.status === "forgotten")
            return "not-found";
        if (row.status === "promoting")
            return "busy";
        const result = this.db.prepare(`
      UPDATE retained_memories SET status = 'promoting', updated_at = ?
      WHERE source_id = ? AND status = 'private'
    `).run(Date.now(), sourceId);
        return result.changes === 1 ? "acquired" : "busy";
    }
    completePromotion(sourceId, method) {
        const now = Date.now();
        this.db.prepare(`
      UPDATE retained_memories
      SET status = 'promoted', promotion_method = ?, promoted_at = ?, updated_at = ?
      WHERE source_id = ?
    `).run(method, now, now, sourceId);
        this.db.prepare(`
      UPDATE promotion_jobs
      SET status = 'completed', decision = COALESCE(decision, ?), updated_at = ?
      WHERE source_id = ? AND status != 'completed'
    `).run(JSON.stringify({ promote: true, method }), now, sourceId);
    }
    releasePromotion(sourceId) {
        this.db.prepare(`
      UPDATE retained_memories SET status = 'private', updated_at = ?
      WHERE source_id = ? AND status = 'promoting'
    `).run(Date.now(), sourceId);
    }
    forget(sourceId) {
        const now = Date.now();
        this.db.prepare(`
      UPDATE retained_memories SET status = 'forgotten', updated_at = ?
      WHERE source_id = ?
    `).run(now, sourceId);
        this.db.prepare(`
      UPDATE promotion_jobs
      SET status = 'completed', decision = ?, updated_at = ?
      WHERE source_id = ? AND status != 'completed'
    `).run(JSON.stringify({ promote: false, reason: "Forgotten by user" }), now, sourceId);
    }
    enqueue(idempotencyKey, sourceId, payload) {
        const now = Date.now();
        this.db.prepare(`
      INSERT OR IGNORE INTO promotion_jobs
        (idempotency_key, source_id, payload, available_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(idempotencyKey, sourceId, JSON.stringify(payload), now, now, now);
    }
    claim() {
        const row = this.db.prepare(`
      SELECT id, idempotency_key, source_id, payload, attempts
      FROM promotion_jobs
      WHERE status = 'pending' AND available_at <= ?
      ORDER BY id
      LIMIT 1
    `).get(Date.now());
        if (!row)
            return undefined;
        this.db.prepare(`
      UPDATE promotion_jobs SET status = 'processing', attempts = attempts + 1, updated_at = ?
      WHERE id = ? AND status = 'pending'
    `).run(Date.now(), row.id);
        return {
            id: row.id,
            idempotencyKey: row.idempotency_key,
            sourceId: row.source_id,
            payload: JSON.parse(row.payload),
            attempts: row.attempts + 1,
        };
    }
    complete(id, decision) {
        this.db.prepare(`
      UPDATE promotion_jobs SET status = 'completed', decision = ?, updated_at = ?
      WHERE id = ? AND status != 'completed'
    `).run(JSON.stringify(decision), Date.now(), id);
    }
    retry(id, attempts, error) {
        const delay = Math.min(60_000, 1_000 * 2 ** Math.min(attempts, 6));
        this.db.prepare(`
      UPDATE promotion_jobs
      SET status = 'pending', available_at = ?, last_error = ?, updated_at = ?
      WHERE id = ?
    `).run(Date.now() + delay, error instanceof Error ? error.message : String(error), Date.now(), id);
    }
    recover() {
        this.db.prepare(`
      UPDATE promotion_jobs SET status = 'pending', available_at = ?, updated_at = ?
      WHERE status = 'processing'
    `).run(Date.now(), Date.now());
        this.db.prepare(`
      UPDATE retained_memories SET status = 'private', updated_at = ?
      WHERE status = 'promoting'
    `).run(Date.now());
    }
    close() {
        this.db.close();
    }
    ensureIdentityColumn(column) {
        const columns = this.db.prepare("PRAGMA table_info(retained_memories)").all();
        if (!columns.some((item) => item.name === column)) {
            this.db.exec(`ALTER TABLE retained_memories ADD COLUMN ${column} TEXT NOT NULL DEFAULT ''`);
        }
    }
}
//# sourceMappingURL=outbox.js.map