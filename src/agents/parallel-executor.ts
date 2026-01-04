#!/usr/bin/env node
/**
 * Miyabi Parallel Agent Executor
 * GitHub Actionsから呼び出され、複数のAgentを並列実行する
 */

import type { AgentResult, ExecutionReport } from './types.js';
import {
  log,
  fetchIssue,
  updateIssueLabels,
  runMiyabiAgent,
  saveReport,
  parseArgs,
  ensureDirectories,
} from './utils.js';

const AGENT_PIPELINE = ['issue', 'codegen', 'review'] as const;

async function executeAgentPipeline(
  issueNumber: number,
  concurrency: number
): Promise<AgentResult[]> {
  const results: AgentResult[] = [];

  log('info', `Starting agent pipeline for issue #${issueNumber}`, {
    agents: AGENT_PIPELINE,
    concurrency,
  });

  // フェーズ1: Issue分析 (単独実行)
  log('info', 'Phase 1: Issue Analysis');
  const issueResult = await runMiyabiAgent('issue', issueNumber);
  results.push(issueResult);

  if (!issueResult.success) {
    log('error', 'Issue analysis failed, aborting pipeline');
    return results;
  }

  // フェーズ2: コード生成 (並列実行可能)
  log('info', 'Phase 2: Code Generation');
  await updateIssueLabels(
    issueNumber,
    ['🏗️ state:implementing'],
    ['📥 state:pending', '🎯 phase:planning']
  );

  const codegenResult = await runMiyabiAgent('codegen', issueNumber);
  results.push(codegenResult);

  if (!codegenResult.success) {
    log('error', 'Code generation failed, aborting pipeline');
    return results;
  }

  // フェーズ3: コードレビュー
  log('info', 'Phase 3: Code Review');
  await updateIssueLabels(
    issueNumber,
    ['👀 state:reviewing'],
    ['🏗️ state:implementing']
  );

  const reviewResult = await runMiyabiAgent('review', issueNumber);
  results.push(reviewResult);

  // 完了ラベル更新
  if (reviewResult.success) {
    await updateIssueLabels(
      issueNumber,
      ['✅ state:completed'],
      ['👀 state:reviewing']
    );
  }

  return results;
}

async function main(): Promise<void> {
  const startTime = new Date();
  ensureDirectories();

  const { issueNumber, concurrency, logLevel } = parseArgs();

  if (!issueNumber) {
    log('error', 'Issue number is required. Use --issue <number>');
    process.exit(1);
  }

  log('info', '🚀 Miyabi Parallel Agent Executor started', {
    issueNumber,
    concurrency,
    logLevel,
  });

  try {
    // Issue情報を取得
    const issue = await fetchIssue(issueNumber);
    log('info', `Processing issue: ${issue.title}`, { labels: issue.labels });

    // ラベル更新: 実行中
    await updateIssueLabels(
      issueNumber,
      ['🔄 agent-running'],
      ['🤖agent-execute']
    );

    // Agentパイプライン実行
    const results = await executeAgentPipeline(issueNumber, concurrency);

    const endTime = new Date();
    const allSuccess = results.every((r) => r.success);

    // レポート作成
    const report: ExecutionReport = {
      issueNumber,
      startTime,
      endTime,
      agents: results,
      totalChanges: results.reduce((acc, r) => acc + (r.changes?.length || 0), 0),
      success: allSuccess,
    };

    saveReport(report);

    // 最終ラベル更新
    await updateIssueLabels(
      issueNumber,
      allSuccess ? ['✅ agent-completed'] : ['❌ agent-failed'],
      ['🔄 agent-running']
    );

    log('info', '🎉 Agent pipeline completed', {
      success: allSuccess,
      duration: endTime.getTime() - startTime.getTime(),
      results: results.map((r) => ({ agent: r.agent, success: r.success, duration: r.duration })),
    });

    if (!allSuccess) {
      process.exit(1);
    }
  } catch (error) {
    log('error', 'Agent execution failed', error);

    await updateIssueLabels(
      issueNumber,
      ['❌ agent-failed', '🚨escalated'],
      ['🔄 agent-running', '🤖agent-execute']
    );

    process.exit(1);
  }
}

main();
