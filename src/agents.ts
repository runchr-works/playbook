export type UpstreamSupport = "dedicated" | "mcp-compatible" | "documented" | "not-documented";
export type IntentirTransport = "native-stdio" | "adapter" | "experimental";

export interface AgentDescriptor {
  id: string;
  aliases: string[];
  name: string;
  hindsightSupport: UpstreamSupport;
  codegraphSupport: UpstreamSupport;
  intentirTransport: IntentirTransport;
  configLocation: string;
  notes: string;
  officialUrl: string;
}

export const AGENTS: AgentDescriptor[] = [
  {
    id: "codex",
    aliases: ["openai-codex"],
    name: "OpenAI Codex",
    hindsightSupport: "dedicated",
    codegraphSupport: "documented",
    intentirTransport: "native-stdio",
    configLocation: "~/.codex/config.toml or project .codex/config.toml",
    notes: "Native stdio MCP through Codex configuration.",
    officialUrl: "https://developers.openai.com/codex/",
  },
  {
    id: "claude-code",
    aliases: ["claude"],
    name: "Claude Code",
    hindsightSupport: "dedicated",
    codegraphSupport: "documented",
    intentirTransport: "native-stdio",
    configLocation: "claude mcp add-json or project .mcp.json",
    notes: "Native stdio MCP with user, project, or local scope.",
    officialUrl: "https://docs.anthropic.com/en/docs/claude-code/mcp",
  },
  {
    id: "cursor",
    aliases: ["cursor-agent"],
    name: "Cursor",
    hindsightSupport: "mcp-compatible",
    codegraphSupport: "documented",
    intentirTransport: "native-stdio",
    configLocation: "~/.cursor/mcp.json or project .cursor/mcp.json",
    notes: "Native stdio MCP in the editor and Cursor CLI.",
    officialUrl: "https://docs.cursor.com/context/model-context-protocol",
  },
  {
    id: "opencode",
    aliases: ["openmcode"],
    name: "OpenCode",
    hindsightSupport: "mcp-compatible",
    codegraphSupport: "documented",
    intentirTransport: "native-stdio",
    configLocation: "opencode.json or opencode.jsonc",
    notes: "Native local MCP server configuration.",
    officialUrl: "https://opencode.ai/docs/mcp-servers/",
  },
  {
    id: "reasonix",
    aliases: ["resonix", "deepseek-reasonix"],
    name: "Reasonix",
    hindsightSupport: "mcp-compatible",
    codegraphSupport: "not-documented",
    intentirTransport: "native-stdio",
    configLocation: "~/.reasonix/config.json or project .reasonix/",
    notes: "DeepSeek-native terminal agent with native stdio MCP.",
    officialUrl: "https://api-docs.deepseek.com/quick_start/agent_integrations/reasonix",
  },
  {
    id: "pi",
    aliases: ["pi-coding-agent"],
    name: "Pi coding agent",
    hindsightSupport: "not-documented",
    codegraphSupport: "not-documented",
    intentirTransport: "adapter",
    configLocation: "project .mcp.json (pi-mcp-adapter) or .pi/mcp.json",
    notes: "Install pi-mcp-adapter (pi install npm:pi-mcp-adapter), then configure through the adapter's standard .mcp.json file.",
    officialUrl: "https://github.com/badlogic/pi-mono",
  },
  {
    id: "antigravity",
    aliases: ["google-antigravity"],
    name: "Google Antigravity",
    hindsightSupport: "mcp-compatible",
    codegraphSupport: "documented",
    intentirTransport: "experimental",
    configLocation: "MCP Store > Manage MCP Servers > View raw config",
    notes: "Use the product's raw MCP configuration UI; configuration behavior may change.",
    officialUrl: "https://antigravity.google/",
  },
  {
    id: "gemini-cli",
    aliases: ["gemini"],
    name: "Gemini CLI",
    hindsightSupport: "mcp-compatible",
    codegraphSupport: "documented",
    intentirTransport: "native-stdio",
    configLocation: "~/.gemini/settings.json or project .gemini/settings.json",
    notes: "CodeGraph documents Gemini support; Hindsight supports generic MCP clients.",
    officialUrl: "https://github.com/google-gemini/gemini-cli",
  },
  {
    id: "kiro",
    aliases: [],
    name: "Kiro",
    hindsightSupport: "mcp-compatible",
    codegraphSupport: "documented",
    intentirTransport: "native-stdio",
    configLocation: "Kiro MCP configuration",
    notes: "CodeGraph documents Kiro support; Hindsight supports generic MCP clients.",
    officialUrl: "https://kiro.dev/",
  },
  {
    id: "hermes",
    aliases: ["hermes-agent"],
    name: "Hermes Agent",
    hindsightSupport: "mcp-compatible",
    codegraphSupport: "documented",
    intentirTransport: "native-stdio",
    configLocation: "Hermes MCP configuration",
    notes: "Hindsight lists a Hermes community integration and CodeGraph documents Hermes support.",
    officialUrl: "https://github.com/NousResearch/hermes-agent",
  },
];

export function findAgent(value: string): AgentDescriptor | undefined {
  const normalized = value.toLowerCase();
  return AGENTS.find((agent) => agent.id === normalized || agent.aliases.includes(normalized));
}

export function agentConfig(
  agent: AgentDescriptor,
  repositoryRoot: string,
): string {
  const env = {
    INTENTIR_REPOSITORY_ROOT: repositoryRoot,
  };
  const stdio = {
    command: "intentir",
    env,
  };

  if (agent.id === "codex") {
    return [
      "[mcp_servers.intentir]",
      'command = "intentir"',
      "",
      "[mcp_servers.intentir.env]",
      `INTENTIR_REPOSITORY_ROOT = ${JSON.stringify(repositoryRoot)}`,
    ].join("\n");
  }
  if (agent.id === "opencode") {
    return JSON.stringify({
      $schema: "https://opencode.ai/config.json",
      mcp: {
        intentir: {
          type: "local",
          command: ["intentir"],
          enabled: true,
          environment: env,
        },
      },
    }, null, 2);
  }
  if (agent.id === "reasonix") {
    return JSON.stringify({ mcpServers: { intentir: stdio } }, null, 2);
  }
  if (agent.id === "pi") {
    return [
      "# Install the adapter:",
      "#   pi install npm:pi-mcp-adapter",
      "#",
      "# Then save as project .mcp.json:",
      JSON.stringify({ mcpServers: { intentir: stdio } }, null, 2),
    ].join("\n");
  }
  return JSON.stringify({ mcpServers: { intentir: stdio } }, null, 2);
}
