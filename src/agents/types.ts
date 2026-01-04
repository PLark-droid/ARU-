/**
 * Miyabi Agent Types
 * Agent実行に必要な型定義
 */

export interface AgentConfig {
  issueNumber: number;
  repository: string;
  concurrency: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export interface AgentResult {
  agent: string;
  success: boolean;
  duration: number;
  output?: string;
  error?: string;
  changes?: FileChange[];
}

export interface FileChange {
  path: string;
  action: 'create' | 'modify' | 'delete';
  content?: string;
}

export interface IssueContext {
  number: number;
  title: string;
  body: string;
  labels: string[];
  state: 'open' | 'closed';
}

export interface ExecutionReport {
  issueNumber: number;
  startTime: Date;
  endTime: Date;
  agents: AgentResult[];
  totalChanges: number;
  success: boolean;
}

export type AgentType = 'coordinator' | 'codegen' | 'review' | 'issue' | 'pr';
