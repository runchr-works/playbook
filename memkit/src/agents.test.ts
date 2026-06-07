import { describe, expect, it } from "vitest";
import { AGENTS, findAgent } from "./agents.js";
import { renderAgentConfig } from "./agent-config.js";

describe("agent integrations", () => {
  it("resolves common aliases including corrected Reasonix names", () => {
    expect(findAgent("openmcode")?.id).toBe("opencode");
    expect(findAgent("resonix")?.id).toBe("reasonix");
    expect(findAgent("deepseek-reasonix")?.name).toBe("Reasonix");
  });

  it("generates agent-native MCP configurations", () => {
    const codex = findAgent("codex");
    expect(codex).toBeDefined();
    const config = renderAgentConfig(codex!, "/repo", {
      hindsightUrl: "http://localhost:8888/mcp/project/",
      codegraphCommand: "codegraph",
      codegraphArgs: ["serve", "--mcp"],
    });
    expect(config).toContain("[mcp_servers.hindsight]");
    expect(config).toContain("[mcp_servers.codegraph]");
    expect(config).not.toContain("context-mode");

    const pi = findAgent("pi");
    expect(pi).toBeDefined();
    const piConfig = renderAgentConfig(pi!, "/repo", {
      hindsightUrl: "http://localhost:8888/mcp/project/",
      codegraphCommand: "codegraph",
      codegraphArgs: ["serve", "--mcp"],
    });
    const piParsed = JSON.parse(piConfig);
    expect(piParsed.mcpServers.hindsight).toBeDefined();
    expect(piParsed.mcpServers.codegraph).toEqual({
      command: "codegraph",
      args: ["serve", "--mcp"],
    });
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
