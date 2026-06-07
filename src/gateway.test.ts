import { describe, expect, it, vi } from "vitest";
import { IntentirGateway } from "./gateway.js";
import type { CodeProvider, MemoryProvider } from "./types.js";

const identity = { bankId: "project" };

function providers() {
  const memory: MemoryProvider = {
    recall: vi.fn().mockResolvedValue([]),
    retain: vi.fn().mockResolvedValue({ bank: "project", sourceId: "source-1" }),
    review: vi.fn().mockResolvedValue({ bank: "project", items: [] }),
    forget: vi.fn().mockResolvedValue({ sourceId: "source-1", deleted: true }),
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
  it("returns partial context when CodeGraph fails", async () => {
    const { memory, code } = providers();
    vi.mocked(code.context).mockRejectedValue(new Error("offline"));
    const result = await new IntentirGateway(memory, code).context(identity, "task");
    expect(result.memory).toBeDefined();
    expect(result.code).toBeUndefined();
    expect(result.errors).toHaveLength(1);
  });

  it("retains directly in the configured bank", async () => {
    const { memory, code } = providers();
    await new IntentirGateway(memory, code).retain({
      identity,
      content: "A durable project fact.",
    });
    expect(memory.retain).toHaveBeenCalledWith({
      identity,
      content: "A durable project fact.",
    });
  });

  it("forgets directly from the configured bank", async () => {
    const { memory, code } = providers();
    await new IntentirGateway(memory, code).forget(identity, "source-1");
    expect(memory.forget).toHaveBeenCalledWith({ identity, sourceId: "source-1" });
  });
});
