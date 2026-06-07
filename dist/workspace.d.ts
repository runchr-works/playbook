export declare const WORKSPACE_CONFIG_RELATIVE_PATH: string;
export declare const CODEGRAPH_DATABASE_RELATIVE_PATH: string;
export interface WorkspaceConfig {
    bankId: string;
}
export interface WorkspaceState {
    initialized: boolean;
    intentirInitialized: boolean;
    codegraphInitialized: boolean;
    repositoryRoot: string;
    configPath: string;
    codegraphDatabasePath: string;
    config?: WorkspaceConfig;
    reasons: string[];
}
export declare function workspaceState(repositoryRoot: string): WorkspaceState;
export declare function writeWorkspaceConfig(repositoryRoot: string, input: Pick<WorkspaceConfig, "bankId">): WorkspaceConfig;
export declare function removeWorkspaceState(repositoryRoot: string, purgeGraph: boolean): void;
