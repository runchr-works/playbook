import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { PromotionOutbox } from "./outbox.js";

const directories: string[] = [];
const identity = {
  orgId: "org",
  projectId: "project",
  workspaceId: "workspace",
  repositoryId: "repository",
  agentId: "agent",
};

function createOutbox(): PromotionOutbox {
  const directory = mkdtempSync(path.join(tmpdir(), "intentir-outbox-"));
  directories.push(directory);
  return new PromotionOutbox(path.join(directory, "outbox.db"));
}

afterEach(() => {
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe("PromotionOutbox retained memories", () => {
  it("isolates lookup by the full durable identity", () => {
    const outbox = createOutbox();
    const payload = { identity, content: "A durable project memory with sufficient detail." };
    outbox.remember("source-1", payload);

    expect(outbox.getMemory("source-1", identity)?.payload).toEqual(payload);
    expect(outbox.getMemory("source-1", { ...identity, workspaceId: "other" })).toBeUndefined();
    expect(outbox.getMemory("source-1", { ...identity, repositoryId: "other" })).toBeUndefined();
    expect(outbox.getMemory("source-1", { ...identity, agentId: "other" })).toBeUndefined();
    outbox.close();
  });

  it("allows only one promotion claim and records completion", () => {
    const outbox = createOutbox();
    outbox.remember("source-1", {
      identity,
      content: "A durable project memory with sufficient detail.",
    });

    expect(outbox.beginPromotion("source-1")).toBe("acquired");
    expect(outbox.beginPromotion("source-1")).toBe("busy");
    outbox.completePromotion("source-1", "explicit");
    expect(outbox.beginPromotion("source-1")).toBe("promoted");
    expect(outbox.getMemory("source-1", identity)?.status).toBe("promoted");
    outbox.close();
  });

  it("cancels promotion after a memory is forgotten", () => {
    const outbox = createOutbox();
    const payload = {
      identity,
      content: "A durable project memory that was later proven incorrect.",
    };
    outbox.remember("source-1", payload);
    outbox.enqueue("key", "source-1", payload);

    outbox.forget("source-1");

    expect(outbox.getMemory("source-1", identity)?.status).toBe("forgotten");
    expect(outbox.beginPromotion("source-1")).toBe("not-found");
    expect(outbox.claim()).toBeUndefined();
    outbox.close();
  });
});
