export declare const WORKSPACE_CONFIG_RELATIVE_PATH: string;
export declare const CODEGRAPH_DATABASE_RELATIVE_PATH: string;
export interface WorkspaceConfig {
    bankId: string;
}
export interface WorkspaceState {
    initialized: boolean;
    intentirInitialized: boolean;
    memkitInitialized: boolean;
    codegraphInitialized: boolean;
    repositoryRoot: string;
    configPath: string;
    codegraphDatabasePath: string;
    config?: WorkspaceConfig;
    reasons: string[];
}
export declare function workspaceState(repositoryRoot: string): WorkspaceState;
export declare function writeWorkspaceConfig(repositoryRoot: string, input: Pick<WorkspaceConfig, "bankId">): WorkspaceConfig;
export declare const MCP_JSON_RELATIVE_PATH = ".mcp.json";
export interface McpJson {
    mcpServers: Record<string, {
        command: string;
        args?: string[];
        env?: Record<string, string>;
    } | {
        url: string;
    }>;
}
export declare function writeMcpJson(repositoryRoot: string, bankId: string, hindsightBaseUrl?: string, codegraphCommand?: string, codegraphArgs?: string[]): McpJson;
export declare function removeWorkspaceState(repositoryRoot: string, purgeGraph: boolean): void;
