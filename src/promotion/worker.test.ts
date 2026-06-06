import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MemoryProvider, PromotionClassifier } from "../types.js";
import { PromotionOutbox } from "./outbox.js";
import { PromotionWorker } from "./worker.js";

const directories: string[] = [];
const identity = {
  orgId: "org",
  projectId: "project",
  workspaceId: "workspace",
  repositoryId: "repository",
  agentId: "agent",
};

function createOutbox(): PromotionOutbox {
  const directory = mkdtempSync(path.join(tmpdir(), "intentir-"));
  directories.push(directory);
  return new PromotionOutbox(path.join(directory, "outbox.db"));
}

function memoryProvider(): MemoryProvider {
  return {
    recall: vi.fn(),
    retain: vi.fn(),
    promote: vi.fn().mockResolvedValue({ bank: "shared", sourceId: "source-1" }),
    review: vi.fn(),
    forget: vi.fn(),
    health: vi.fn(),
  };
}

afterEach(() => {
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe("PromotionWorker", () => {
  it("promotes an approved durable memory", async () => {
    const outbox = createOutbox();
    const memory = memoryProvider();
    const classifier: PromotionClassifier = {
      classify: vi.fn().mockResolvedValue({
        promote: true,
        confidence: 0.95,
        reusable: true,
        factual: true,
        sensitive: false,
        ttl: null,
        reason: "durable project fact",
      }),
    };
    const payload = {
      identity,
      content: "The project API uses PostgreSQL for all persistent application state.",
    };
    outbox.remember("source-1", payload);
    outbox.enqueue("key", "source-1", payload);

    await new PromotionWorker(outbox, memory, classifier, 0.85, 1_000).tick();

    expect(memory.promote).toHaveBeenCalledWith(
      expect.anything(),
      "source-1",
      "automatic",
    );
    outbox.close();
  });

  it("rejects secrets before invoking the classifier", async () => {
    const outbox = createOutbox();
    const memory = memoryProvider();
    const classifier: PromotionClassifier = { classify: vi.fn() };
    const payload = {
      identity,
      content: "Production api_key=sk-secret-value-that-must-never-be-shared",
    };
    outbox.remember("source-1", payload);
    outbox.enqueue("key", "source-1", payload);

    await new PromotionWorker(outbox, memory, classifier, 0.85, 1_000).tick();

    expect(classifier.classify).not.toHaveBeenCalled();
    expect(memory.promote).not.toHaveBeenCalled();
    outbox.close();
  });
});
