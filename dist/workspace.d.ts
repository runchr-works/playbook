export declare const WORKSPACE_CONFIG_RELATIVE_PATH: string;
export declare const CODEGRAPH_DATABASE_RELATIVE_PATH: string;
export interface WorkspaceConfig {
    version: 1;
    repositoryRoot: string;
    orgId: string;
    projectId: string;
    workspaceId: string;
    repositoryId: string;
    createdAt: string;
}
export interface WorkspaceState {
    initialized: boolean;
    repositoryRoot: string;
    configPath: string;
    codegraphDatabasePath: string;
    config?: WorkspaceConfig;
    reasons: string[];
}
export declare function workspaceState(repositoryRoot: string): WorkspaceState;
export declare function writeWorkspaceConfig(repositoryRoot: string, input: Pick<WorkspaceConfig, "orgId" | "projectId" | "workspaceId" | "repositoryId">): WorkspaceConfig;
export declare function removeWorkspaceState(repositoryRoot: string, purgeGraph: boolean): void;
export declare function deriveWorkspaceId(repositoryRoot: string): string;
export declare function deriveRepositoryId(remoteUrl: string | undefined, repositoryRoot: string): string;
