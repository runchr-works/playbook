import { describe, expect, it } from "vitest";
import { AGENTS, agentConfig, findAgent } from "./agents.js";

describe("agent integrations", () => {
  it("resolves common aliases including corrected Reasonix names", () => {
    expect(findAgent("openmcode")?.id).toBe("opencode");
    expect(findAgent("resonix")?.id).toBe("reasonix");
    expect(findAgent("deepseek-reasonix")?.name).toBe("Reasonix");
  });

  it("generates direct MCP connections", () => {
    const codex = findAgent("codex");
    expect(codex).toBeDefined();
    const config = agentConfig(codex!, "/repo");
    const parsed = JSON.parse(config);
    expect(parsed.mcpServers.hindsight).toBeDefined();
    expect(parsed.mcpServers.codegraph).toBeDefined();
    expect(parsed.mcpServers["context-mode"]).toBeDefined();

    const pi = findAgent("pi");
    expect(pi).toBeDefined();
    const piConfig = agentConfig(pi!, "/repo");
    const piParsed = JSON.parse(piConfig);
    expect(piParsed.mcpServers.hindsight).toBeDefined();
    expect(piParsed.mcpServers.codegraph).toEqual({ command: "codegraph" });
  });

  it("uses unique canonical identifiers", () => {
    expect(new Set(AGENTS.map((agent) => agent.id)).size).toBe(AGENTS.length);
  });

  it("tracks upstream support independently", () => {
    expect(findAgent("codex")).toMatchObject({
      hindsightSupport: "dedicated",
      codegraphSupport: "documented",
    });
    expect(findAgent("reasonix")).toMatchObject({
      hindsightSupport: "mcp-compatible",
      codegraphSupport: "not-documented",
    });
  });
});
