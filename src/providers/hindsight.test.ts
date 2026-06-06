import { afterEach, describe, expect, it, vi } from "vitest";
import { HindsightProvider } from "./hindsight.js";

const identity = {
  orgId: "org",
  projectId: "project",
  workspaceId: "workspace",
  repositoryId: "repository",
  agentId: "agent",
  sessionId: "session",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("HindsightProvider document lifecycle", () => {
  it("retains a stable source document with normalized metadata", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const provider = new HindsightProvider({
      baseUrl: "http://hindsight.test",
      tenant: "default",
      timeoutMs: 1_000,
    });

    const result = await provider.retain({
      identity,
      content: "The API uses PostgreSQL for durable application state.",
      metadata: {
        confidence: 0.9,
        freshness: "2026-06-07T00:00:00.000Z",
        evidenceRefs: ["commit:abc"],
        createdByAgent: "agent",
        policyVersion: "policy-v1",
        repositoryRevision: "abc",
      },
    });

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(String(request.body)) as {
      items: Array<{ document_id: string; metadata: Record<string, string> }>;
    };
    expect(body.items[0]?.document_id).toBe(result.sourceId);
    expect(body.items[0]?.metadata).toMatchObject({
      confidence: "0.9",
      evidence_refs: "[\"commit:abc\"]",
      repository_revision: "abc",
    });
  });

  it("reviews documents with original content", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        items: [{ id: "source-1", memory_unit_count: 2 }],
        total: 1,
        limit: 20,
        offset: 0,
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: "source-1",
        original_text: "Verified project decision",
        memory_unit_count: 2,
      }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const provider = new HindsightProvider({
      baseUrl: "http://hindsight.test",
      tenant: "default",
      timeoutMs: 1_000,
    });

    const result = await provider.review({
      identity,
      scope: "project-shared",
      limit: 20,
    }) as { results: Array<{ items: Array<{ sourceId: string; content: string }> }> };

    expect(result.results[0]?.items[0]).toMatchObject({
      sourceId: "source-1",
      content: "Verified project decision",
    });
  });

  it("deletes the source document from private and shared banks", async () => {
    const fetchMock = vi.fn().mockImplementation(async () =>
      new Response(JSON.stringify({
        success: true,
        memory_units_deleted: 2,
      }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const provider = new HindsightProvider({
      baseUrl: "http://hindsight.test",
      tenant: "default",
      timeoutMs: 1_000,
    });

    const result = await provider.forget({
      identity,
      sourceId: "source-1",
      scope: "all",
    }) as { results: Array<{ deleted: boolean }> };

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls.every((call) =>
      String(call[0]).endsWith("/documents/source-1"))).toBe(true);
    expect(result.results.every((item) => item.deleted)).toBe(true);
  });
});
