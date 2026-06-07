export type UpstreamSupport = "dedicated" | "mcp-compatible" | "documented" | "not-documented";
export interface AgentDescriptor {
    id: string;
    aliases: string[];
    name: string;
    hindsightSupport: UpstreamSupport;
    codegraphSupport: UpstreamSupport;
    configLocation: string;
    notes: string;
    officialUrl: string;
}
export declare const AGENTS: AgentDescriptor[];
export declare function findAgent(value: string): AgentDescriptor | undefined;
