import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createMcpServer } from "../dist/server.js";

const config = {
  identity: {
    orgId: "smoke-org",
    projectId: "smoke-project",
    workspaceId: "smoke-workspace",
    repositoryId: "smoke-repository",
    agentId: "smoke-agent",
  },
};
const notCalled = async () => {
  throw new Error("Smoke test should only discover tools");
};
const gateway = {
  context: notCalled,
  recall: notCalled,
  retain: notCalled,
  promote: notCalled,
  review: notCalled,
  forget: notCalled,
  codeSearch: notCalled,
  codeCallers: notCalled,
  codeCallees: notCalled,
  codeDependencies: notCalled,
  health: notCalled,
};

const server = createMcpServer(config, gateway);
const client = new Client({ name: "intentir-smoke", version: "0.1.0" });
const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

try {
  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);
  const { tools } = await client.listTools();
  const names = tools.map((tool) => tool.name).sort();
  if (
    !names.includes("intent_context") ||
    !names.includes("memory_review") ||
    !names.includes("memory_forget") ||
    !names.includes("code_dependencies")
  ) {
    throw new Error(`Expected Intentir tools, received: ${names.join(", ")}`);
  }
  console.log(names.join("\n"));
} finally {
  await Promise.all([client.close(), server.close()]);
}
