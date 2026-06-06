import { describe, expect, it, vi } from "vitest";
import { IntentirGateway } from "./gateway.js";
import type { CodeProvider, MemoryProvider } from "./types.js";

const identity = {
  orgId: "org",
  projectId: "project",
  workspaceId: "workspace",
  repositoryId: "repository",
  agentId: "agent",
};

function providers() {
  const memory: MemoryProvider = {
    recall: vi.fn().mockResolvedValue([{
      id: "1",
      text: "fact",
      metadata: {
        provider: "hindsight",
        revision: null,
        confidence: null,
        freshness: null,
        evidenceRefs: [],
        createdByAgent: null,
        policyVersion: null,
      },
    }]),
    retain: vi.fn().mockResolvedValue({ bank: "private", sourceId: "source-1" }),
    promote: vi.fn(),
    review: vi.fn(),
    forget: vi.fn(),
    health: vi.fn().mockResolvedValue({ ok: true }),
  };
  const code: CodeProvider = {
    context: vi.fn().mockResolvedValue({ symbols: [] }),
    search: vi.fn(),
    callers: vi.fn(),
    callees: vi.fn(),
    dependencies: vi.fn(),
    health: vi.fn().mockResolvedValue({ ok: true }),
    close: vi.fn(),
  };
  return { memory, code };
}

describe("IntentirGateway", () => {
  it("returns partial context when one provider fails", async () => {
    const { memory, code } = providers();
    vi.mocked(code.context).mockRejectedValue(new Error("offline"));
    const result = await new IntentirGateway(memory, code).context(identity, "task");
    expect(result.memory).toBeDefined();
    expect(result.code).toBeUndefined();
    expect(result.errors).toHaveLength(1);
  });

  it("retains privately before queueing promotion", async () => {
    const { memory, code } = providers();
    const outbox = { remember: vi.fn(), enqueue: vi.fn() };
    const result = await new IntentirGateway(memory, code, outbox as never, true).retain({
      identity,
      content: "A durable project fact that is long enough.",
    });
    expect(memory.retain).toHaveBeenCalledWith(expect.anything(), "agent-private");
    expect(memory.retain).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          confidence: 0.5,
          evidenceRefs: [],
          createdByAgent: "agent",
          policyVersion: "2026-06-07.v1",
          repositoryRevision: null,
        }),
      }),
      "agent-private",
    );
    expect(outbox.remember).toHaveBeenCalledOnce();
    expect(outbox.enqueue).toHaveBeenCalledOnce();
    expect(result).toMatchObject({ promotionQueued: true });
  });

  it("preserves quality inputs but derives protected metadata", async () => {
    const { memory, code } = providers();
    await new IntentirGateway(memory, code).retain({
      identity,
      content: "A verified architectural decision with durable repository impact.",
      metadata: {
        confidence: 0.92,
        freshness: "2026-06-07T00:00:00.000Z",
        evidenceRefs: ["commit:abc123", "docs/architecture.md"],
        createdByAgent: "spoofed-agent",
        policyVersion: "spoofed-policy",
        repositoryRevision: "caller-revision",
      },
    });

    expect(memory.retain).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: {
          confidence: 0.92,
          freshness: "2026-06-07T00:00:00.000Z",
          evidenceRefs: ["commit:abc123", "docs/architecture.md"],
          createdByAgent: "agent",
          policyVersion: "2026-06-07.v1",
          repositoryRevision: "caller-revision",
        },
      }),
      "agent-private",
    );
  });

  it("explicitly promotes an owned private memory after policy checks", async () => {
    const { memory, code } = providers();
    vi.mocked(memory.promote).mockResolvedValue({ bank: "shared", sourceId: "source-1" });
    const payload = {
      identity,
      content: "The API package uses PostgreSQL for durable application state.",
    };
    const outbox = {
      getMemory: vi.fn().mockReturnValue({ sourceId: "source-1", payload, status: "private" }),
      beginPromotion: vi.fn().mockReturnValue("acquired"),
      completePromotion: vi.fn(),
      releasePromotion: vi.fn(),
    };

    const result = await new IntentirGateway(memory, code, outbox as never).promote(
      identity,
      "source-1",
    );

    expect(memory.promote).toHaveBeenCalledWith(payload, "source-1", "explicit");
    expect(outbox.completePromotion).toHaveBeenCalledWith("source-1", "explicit");
    expect(result).toMatchObject({ promoted: true, alreadyPromoted: false });
  });

  it("does not explicitly promote unsafe memory", async () => {
    const { memory, code } = providers();
    const outbox = {
      getMemory: vi.fn().mockReturnValue({
        sourceId: "source-1",
        payload: {
          identity,
          content: "Production password=do-not-share-this-secret-value",
        },
        status: "private",
      }),
    };

    await expect(
      new IntentirGateway(memory, code, outbox as never).promote(identity, "source-1"),
    ).rejects.toThrow("Explicit promotion rejected");
    expect(memory.promote).not.toHaveBeenCalled();
  });

  it("cannot promote memory owned by another identity", async () => {
    const { memory, code } = providers();
    const outbox = { getMemory: vi.fn().mockReturnValue(undefined) };

    await expect(
      new IntentirGateway(memory, code, outbox as never).promote(identity, "foreign-source"),
    ).rejects.toThrow("Private memory not found for this agent");
    expect(outbox.getMemory).toHaveBeenCalledWith("foreign-source", identity);
  });

  it("forgets provider memory and cancels local promotion", async () => {
    const { memory, code } = providers();
    vi.mocked(memory.forget).mockResolvedValue({ sourceId: "source-1", results: [] });
    const outbox = { forget: vi.fn() };

    await new IntentirGateway(memory, code, outbox as never).forget(
      identity,
      "source-1",
      "all",
    );

    expect(memory.forget).toHaveBeenCalledWith({
      identity,
      sourceId: "source-1",
      scope: "all",
    });
    expect(outbox.forget).toHaveBeenCalledWith("source-1");
  });
});
