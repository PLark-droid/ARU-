/**
 * Miyabi Agent Utilities
 * Agent実行に必要なユーティリティ関数
 */

import { execSync, spawn } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import type { IssueContext, AgentResult, ExecutionReport } from './types.js';

const LOG_DIR = '.ai/logs';
const REPORT_DIR = '.ai/parallel-reports';

export function ensureDirectories(): void {
  if (!existsSync(LOG_DIR)) {
    mkdirSync(LOG_DIR, { recursive: true });
  }
  if (!existsSync(REPORT_DIR)) {
    mkdirSync(REPORT_DIR, { recursive: true });
  }
}

export function log(level: string, message: string, data?: unknown): void {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

  console.log(logMessage);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }

  // ファイルにも出力
  ensureDirectories();
  const logFile = join(LOG_DIR, `agent-${new Date().toISOString().split('T')[0]}.log`);
  const logEntry = data
    ? `${logMessage}\n${JSON.stringify(data, null, 2)}\n`
    : `${logMessage}\n`;

  try {
    const existing = existsSync(logFile) ? readFileSync(logFile, 'utf-8') : '';
    writeFileSync(logFile, existing + logEntry);
  } catch {
    // ログファイル書き込みエラーは無視
  }
}

export async function fetchIssue(issueNumber: number): Promise<IssueContext> {
  try {
    const result = execSync(
      `gh issue view ${issueNumber} --json number,title,body,labels,state`,
      { encoding: 'utf-8' }
    );
    const data = JSON.parse(result);
    return {
      number: data.number,
      title: data.title,
      body: data.body || '',
      labels: data.labels?.map((l: { name: string }) => l.name) || [],
      state: data.state?.toLowerCase() as 'open' | 'closed',
    };
  } catch (error) {
    log('error', `Failed to fetch issue #${issueNumber}`, error);
    throw error;
  }
}

export async function updateIssueLabels(
  issueNumber: number,
  addLabels: string[],
  removeLabels: string[]
): Promise<void> {
  try {
    if (addLabels.length > 0) {
      execSync(`gh issue edit ${issueNumber} --add-label "${addLabels.join(',')}"`, {
        encoding: 'utf-8',
      });
    }
    if (removeLabels.length > 0) {
      execSync(`gh issue edit ${issueNumber} --remove-label "${removeLabels.join(',')}"`, {
        encoding: 'utf-8',
      });
    }
  } catch (error) {
    log('warn', `Failed to update labels for issue #${issueNumber}`, error);
  }
}

export async function commentOnIssue(issueNumber: number, body: string): Promise<void> {
  try {
    execSync(`gh issue comment ${issueNumber} --body "${body.replace(/"/g, '\\"')}"`, {
      encoding: 'utf-8',
    });
  } catch (error) {
    log('warn', `Failed to comment on issue #${issueNumber}`, error);
  }
}

export function runMiyabiAgent(agentName: string, issueNumber: number): Promise<AgentResult> {
  return new Promise((resolve) => {
    const startTime = Date.now();

    log('info', `Starting ${agentName} for issue #${issueNumber}`);

    const child = spawn('miyabi', ['agent', 'run', agentName, '--issue', String(issueNumber)], {
      stdio: 'pipe',
      shell: true,
    });

    let output = '';
    let errorOutput = '';

    child.stdout?.on('data', (data) => {
      output += data.toString();
    });

    child.stderr?.on('data', (data) => {
      errorOutput += data.toString();
    });

    child.on('close', (code) => {
      const duration = Date.now() - startTime;
      const success = code === 0;

      log(success ? 'info' : 'error', `${agentName} completed`, {
        code,
        duration,
        success,
      });

      resolve({
        agent: agentName,
        success,
        duration,
        output: output || undefined,
        error: errorOutput || undefined,
      });
    });

    child.on('error', (error) => {
      const duration = Date.now() - startTime;
      log('error', `${agentName} failed to start`, error);

      resolve({
        agent: agentName,
        success: false,
        duration,
        error: error.message,
      });
    });
  });
}

export function saveReport(report: ExecutionReport): string {
  ensureDirectories();
  const filename = `report-${report.issueNumber}-${Date.now()}.json`;
  const filepath = join(REPORT_DIR, filename);
  writeFileSync(filepath, JSON.stringify(report, null, 2));
  log('info', `Report saved to ${filepath}`);
  return filepath;
}

export function parseArgs(): { issueNumber: number; concurrency: number; logLevel: string } {
  const args = process.argv.slice(2);
  let issueNumber = 0;
  let concurrency = 3;
  let logLevel = 'info';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--issue' && args[i + 1]) {
      issueNumber = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--concurrency' && args[i + 1]) {
      concurrency = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--log-level' && args[i + 1]) {
      logLevel = args[i + 1];
      i++;
    }
  }

  return { issueNumber, concurrency, logLevel };
}
