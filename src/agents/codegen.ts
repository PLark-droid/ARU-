#!/usr/bin/env node
/**
 * Miyabi CodeGen Agent
 * Issueの要件に基づいてコードを生成する
 */

import { execSync } from 'child_process';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import type { IssueContext, FileChange } from './types.js';
import { log, fetchIssue, parseArgs, ensureDirectories } from './utils.js';

interface GeneratedCode {
  files: FileChange[];
  summary: string;
}

function generateCodeStructure(issue: IssueContext): GeneratedCode {
  const files: FileChange[] = [];
  const title = issue.title;
  const body = issue.body;

  // タイトルからファイル名を推測
  const safeName = title
    .replace(/[^a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, '-')
    .toLowerCase()
    .substring(0, 50);

  // 要件を抽出
  const requirements: string[] = [];
  const lines = body.split('\n');
  for (const line of lines) {
    if (line.trim().startsWith('- [ ]')) {
      requirements.push(line.replace('- [ ]', '').trim());
    }
  }

  // 基本的なコード構造を生成
  const mainCode = `/**
 * ${title}
 *
 * このファイルは Issue #${issue.number} の要件に基づいて生成されました。
 *
 * 要件:
${requirements.map((r) => ` * - ${r}`).join('\n')}
 */

export interface Config {
  // 設定オプション
  debug?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

export class ${toPascalCase(safeName)} {
  private config: Config;

  constructor(config: Config = {}) {
    this.config = {
      debug: false,
      logLevel: 'info',
      ...config,
    };
  }

  /**
   * 初期化処理
   */
  async initialize(): Promise<void> {
    this.log('info', 'Initializing...');
    // TODO: 初期化ロジックを実装
  }

  /**
   * メイン処理を実行
   */
  async execute(): Promise<void> {
    this.log('info', 'Executing main logic...');
    // TODO: メインロジックを実装
${requirements.map((r, i) => `    // TODO: ${r}`).join('\n')}
  }

  /**
   * リソースをクリーンアップ
   */
  async cleanup(): Promise<void> {
    this.log('info', 'Cleaning up...');
    // TODO: クリーンアップロジックを実装
  }

  private log(level: string, message: string): void {
    if (this.config.debug || level !== 'debug') {
      console.log(\`[\${level.toUpperCase()}] \${message}\`);
    }
  }
}

function toPascalCase(str: string): string {
  return str
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

// メインエントリポイント
export async function main(): Promise<void> {
  const instance = new ${toPascalCase(safeName)}({ debug: true });
  await instance.initialize();
  await instance.execute();
  await instance.cleanup();
}
`;

  files.push({
    path: `src/features/${safeName}/index.ts`,
    action: 'create',
    content: mainCode,
  });

  // テストファイルを生成
  const testCode = `/**
 * ${title} - Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ${toPascalCase(safeName)} } from './index.js';

describe('${toPascalCase(safeName)}', () => {
  let instance: ${toPascalCase(safeName)};

  beforeEach(() => {
    instance = new ${toPascalCase(safeName)}({ debug: false });
  });

  it('should initialize successfully', async () => {
    await expect(instance.initialize()).resolves.not.toThrow();
  });

  it('should execute without errors', async () => {
    await instance.initialize();
    await expect(instance.execute()).resolves.not.toThrow();
  });

  it('should cleanup resources', async () => {
    await instance.initialize();
    await instance.execute();
    await expect(instance.cleanup()).resolves.not.toThrow();
  });
});
`;

  files.push({
    path: `src/features/${safeName}/${safeName}.test.ts`,
    action: 'create',
    content: testCode,
  });

  return {
    files,
    summary: `Generated ${files.length} files for "${title}"`,
  };
}

function toPascalCase(str: string): string {
  return str
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

function writeFiles(files: FileChange[]): void {
  for (const file of files) {
    if (file.action === 'create' || file.action === 'modify') {
      const dir = dirname(file.path);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      if (file.content) {
        writeFileSync(file.path, file.content);
        log('info', `Created: ${file.path}`);
      }
    }
  }
}

async function main(): Promise<void> {
  ensureDirectories();
  const { issueNumber } = parseArgs();

  if (!issueNumber) {
    log('error', 'Issue number is required. Use --issue <number>');
    process.exit(1);
  }

  log('info', `🛠️ CodeGen Agent started for issue #${issueNumber}`);

  try {
    const issue = await fetchIssue(issueNumber);
    log('info', `Generating code for: ${issue.title}`);

    const generated = generateCodeStructure(issue);
    log('info', 'Code structure generated', {
      files: generated.files.map((f) => f.path),
    });

    // ファイルを書き込み
    writeFiles(generated.files);

    // Git に追加
    try {
      execSync('git add .', { encoding: 'utf-8' });
      log('info', 'Files staged for commit');
    } catch {
      log('warn', 'Failed to stage files (may not be in a git repo)');
    }

    log('info', '✅ CodeGen Agent completed', {
      issueNumber,
      filesGenerated: generated.files.length,
      summary: generated.summary,
    });
  } catch (error) {
    log('error', 'CodeGen Agent failed', error);
    process.exit(1);
  }
}

main();
