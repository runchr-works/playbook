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
export declare const AGENTS: AgentDescriptor[];
export declare function findAgent(value: string): AgentDescriptor | undefined;
export declare function agentConfig(agent: AgentDescriptor, _repositoryRoot: string): string;
