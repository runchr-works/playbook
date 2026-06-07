import { findAgent } from "../dist/agents.js";
import { renderAgentConfig } from "../dist/agent-config.js";

const connections = {
  hindsightUrl: "http://localhost:8888/mcp/smoke/",
  codegraphCommand: "codegraph",
  codegraphArgs: ["serve", "--mcp"],
};

const codex = renderAgentConfig(findAgent("codex"), "/tmp/memkit-smoke", connections);
if (
  !codex.includes("[mcp_servers.hindsight]") ||
  !codex.includes("[mcp_servers.codegraph]")
) {
  throw new Error(`Unexpected Codex configuration:\n${codex}`);
}

const opencode = JSON.parse(
  renderAgentConfig(findAgent("opencode"), "/tmp/memkit-smoke", connections),
);
if (
  opencode.mcp?.codegraph?.type !== "local" ||
  opencode.mcp?.hindsight?.type !== "remote"
) {
  throw new Error(`Unexpected OpenCode configuration:\n${JSON.stringify(opencode)}`);
}

console.log("memkit agent configuration smoke test passed");
