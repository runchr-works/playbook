import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { IntentirConfig } from "./config.js";
import type { IntentirGateway } from "./gateway.js";
export declare function createMcpServer(config: IntentirConfig, gateway: IntentirGateway): McpServer;
export declare function startMcpServer(config: IntentirConfig, gateway: IntentirGateway): Promise<McpServer>;
