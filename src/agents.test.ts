import { describe, expect, it } from "vitest";
import { AGENTS, agentConfig, findAgent } from "./agents.js";

describe("agent integrations", () => {
  it("resolves common aliases including corrected Reasonix names", () => {
    expect(findAgent("openmcode")?.id).toBe("opencode");
    expect(findAgent("resonix")?.id).toBe("reasonix");
    expect(findAgent("deepseek-reasonix")?.name).toBe("Reasonix");
  });

  it("generates clean stdio MCP configs without env", () => {
    const codex = findAgent("codex");
    expect(codex).toBeDefined();
    const config = agentConfig(codex!, "/repo");
    expect(config).toContain('command = "intentir"');
    expect(config).not.toContain('INTENTIR_REPOSITORY_ROOT');

    const pi = findAgent("pi");
    expect(pi).toBeDefined();
    const piConfig = agentConfig(pi!, "/repo");
    const parsed = JSON.parse(piConfig);
    expect(parsed.mcpServers.intentir.command).toBe("intentir");
    expect(parsed.mcpServers.intentir.env).toBeUndefined();
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
      intentirTransport: "native-stdio",
    });
  });
});
