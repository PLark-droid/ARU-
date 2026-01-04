#!/usr/bin/env node
/**
 * Miyabi Coordinator Agent
 * タスクを分析し、適切なAgentにディスパッチする
 */

import type { IssueContext } from './types.js';
import { log, fetchIssue, updateIssueLabels, parseArgs, ensureDirectories } from './utils.js';

interface TaskPlan {
  priority: 'high' | 'medium' | 'low';
  complexity: 'simple' | 'moderate' | 'complex';
  estimatedAgents: string[];
  requirements: string[];
}

function analyzeIssue(issue: IssueContext): TaskPlan {
  const body = issue.body.toLowerCase();
  const title = issue.title.toLowerCase();
  const content = `${title} ${body}`;

  // 優先度判定
  let priority: TaskPlan['priority'] = 'medium';
  if (issue.labels.some((l) => l.includes('high') || l.includes('P1'))) {
    priority = 'high';
  } else if (issue.labels.some((l) => l.includes('low') || l.includes('P3'))) {
    priority = 'low';
  }

  // 複雑度判定
  let complexity: TaskPlan['complexity'] = 'moderate';
  const requirementCount = (body.match(/- \[ \]/g) || []).length;
  if (requirementCount <= 2) {
    complexity = 'simple';
  } else if (requirementCount >= 5) {
    complexity = 'complex';
  }

  // 必要なAgentを決定
  const estimatedAgents: string[] = ['issue'];

  if (
    content.includes('実装') ||
    content.includes('作成') ||
    content.includes('構築') ||
    content.includes('feature')
  ) {
    estimatedAgents.push('codegen');
  }

  if (
    content.includes('レビュー') ||
    content.includes('テスト') ||
    content.includes('品質')
  ) {
    estimatedAgents.push('review');
  }

  // デフォルトでcodegen と review を追加
  if (!estimatedAgents.includes('codegen')) {
    estimatedAgents.push('codegen');
  }
  if (!estimatedAgents.includes('review')) {
    estimatedAgents.push('review');
  }

  // 要件抽出
  const requirements: string[] = [];
  const lines = issue.body.split('\n');
  for (const line of lines) {
    if (line.trim().startsWith('- [ ]')) {
      requirements.push(line.replace('- [ ]', '').trim());
    }
  }

  return {
    priority,
    complexity,
    estimatedAgents,
    requirements,
  };
}

async function main(): Promise<void> {
  ensureDirectories();
  const { issueNumber } = parseArgs();

  if (!issueNumber) {
    log('error', 'Issue number is required. Use --issue <number>');
    process.exit(1);
  }

  log('info', `🎯 Coordinator Agent started for issue #${issueNumber}`);

  try {
    const issue = await fetchIssue(issueNumber);
    log('info', `Analyzing issue: ${issue.title}`);

    const plan = analyzeIssue(issue);
    log('info', 'Task plan created', plan);

    // ラベル更新
    const labelsToAdd: string[] = ['🎯 phase:planning'];
    if (plan.priority === 'high') {
      labelsToAdd.push('⚠️ priority:P1-High');
    } else if (plan.priority === 'low') {
      labelsToAdd.push('🟢 priority:P3-Low');
    } else {
      labelsToAdd.push('🟡 priority:P2-Medium');
    }

    await updateIssueLabels(issueNumber, labelsToAdd, []);

    log('info', '✅ Coordinator Agent completed', {
      issueNumber,
      plan,
    });
  } catch (error) {
    log('error', 'Coordinator Agent failed', error);
    process.exit(1);
  }
}

main();
