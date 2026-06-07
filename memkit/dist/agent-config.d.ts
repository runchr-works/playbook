import { type AgentDescriptor } from "./agents.js";
export interface McpConnections {
    hindsightUrl?: string;
    codegraphCommand: string;
    codegraphArgs: string[];
}
export interface AgentConfigResult {
    agentId: string;
    path?: string;
    configured: boolean;
    detail: string;
}
export declare function renderCodexConfig(connections: McpConnections): string;
export declare function configureGlobalContextMode(agentId: string, home?: string): AgentConfigResult;
export declare function projectConfigPath(agentId: string, repositoryRoot: string): string | undefined;
export declare function configureProjectAgent(agentId: string, repositoryRoot: string, connections: McpConnections): AgentConfigResult;
export declare function renderAgentConfig(agent: AgentDescriptor, repositoryRoot: string, connections: McpConnections): string;
export declare function normalizeAgentIds(values: string[]): string[];
export declare function supportedAutomaticAgents(): AgentDescriptor[];
