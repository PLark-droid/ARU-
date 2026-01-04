#!/usr/bin/env node
/**
 * Miyabi Review Agent
 * 生成されたコードの品質チェックとレビューを実行
 */

import { execSync } from 'child_process';
import { log, fetchIssue, parseArgs, ensureDirectories, commentOnIssue } from './utils.js';

interface ReviewResult {
  category: string;
  passed: boolean;
  score: number;
  details: string;
}

interface ReviewReport {
  overallScore: number;
  passed: boolean;
  results: ReviewResult[];
  summary: string;
}

async function runTypeCheck(): Promise<ReviewResult> {
  try {
    execSync('npm run typecheck 2>&1', { encoding: 'utf-8' });
    return {
      category: 'TypeScript',
      passed: true,
      score: 100,
      details: 'No type errors found',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const errorCount = (message.match(/error TS/g) || []).length;
    return {
      category: 'TypeScript',
      passed: false,
      score: Math.max(0, 100 - errorCount * 10),
      details: `${errorCount} type error(s) found`,
    };
  }
}

async function runLint(): Promise<ReviewResult> {
  try {
    execSync('npm run lint 2>&1', { encoding: 'utf-8' });
    return {
      category: 'ESLint',
      passed: true,
      score: 100,
      details: 'No linting errors found',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const errorCount = (message.match(/error/gi) || []).length;
    const warningCount = (message.match(/warning/gi) || []).length;
    return {
      category: 'ESLint',
      passed: errorCount === 0,
      score: Math.max(0, 100 - errorCount * 15 - warningCount * 5),
      details: `${errorCount} error(s), ${warningCount} warning(s)`,
    };
  }
}

async function runTests(): Promise<ReviewResult> {
  try {
    execSync('npm run test -- --run 2>&1', { encoding: 'utf-8' });
    return {
      category: 'Tests',
      passed: true,
      score: 100,
      details: 'All tests passed',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const failedMatch = message.match(/(\d+) failed/);
    const failedCount = failedMatch ? parseInt(failedMatch[1], 10) : 1;
    return {
      category: 'Tests',
      passed: false,
      score: Math.max(0, 100 - failedCount * 20),
      details: `${failedCount} test(s) failed`,
    };
  }
}

async function checkSecurityVulnerabilities(): Promise<ReviewResult> {
  try {
    // 簡易的なセキュリティチェック
    const dangerousPatterns = [
      'eval\\(',
      'Function\\(',
      'innerHTML\\s*=',
      'dangerouslySetInnerHTML',
      'exec\\(',
      'execSync\\(',
    ];

    let vulnerabilities = 0;
    try {
      const result = execSync(
        `grep -rE "${dangerousPatterns.join('|')}" src/ --include="*.ts" 2>/dev/null || true`,
        { encoding: 'utf-8' }
      );
      vulnerabilities = result.split('\n').filter((l) => l.trim()).length;
    } catch {
      // grep が何も見つからない場合はエラーになる
    }

    return {
      category: 'Security',
      passed: vulnerabilities === 0,
      score: Math.max(0, 100 - vulnerabilities * 25),
      details:
        vulnerabilities === 0
          ? 'No obvious vulnerabilities detected'
          : `${vulnerabilities} potential vulnerability pattern(s) found`,
    };
  } catch {
    return {
      category: 'Security',
      passed: true,
      score: 80,
      details: 'Security check completed with warnings',
    };
  }
}

async function performReview(): Promise<ReviewReport> {
  const results: ReviewResult[] = [];

  log('info', 'Running TypeScript check...');
  results.push(await runTypeCheck());

  log('info', 'Running ESLint...');
  results.push(await runLint());

  log('info', 'Running tests...');
  results.push(await runTests());

  log('info', 'Running security scan...');
  results.push(await checkSecurityVulnerabilities());

  const overallScore = Math.round(
    results.reduce((acc, r) => acc + r.score, 0) / results.length
  );
  const passed = overallScore >= 80 && results.every((r) => r.category !== 'Security' || r.passed);

  const summary = results
    .map((r) => `${r.passed ? '✅' : '❌'} ${r.category}: ${r.details} (${r.score}/100)`)
    .join('\n');

  return {
    overallScore,
    passed,
    results,
    summary,
  };
}

function formatReviewComment(report: ReviewReport, issueNumber: number): string {
  const statusEmoji = report.passed ? '✅' : '❌';
  const statusText = report.passed ? 'Passed' : 'Failed';

  return `## ${statusEmoji} Code Review Report

**Issue**: #${issueNumber}
**Status**: ${statusText}
**Overall Score**: ${report.overallScore}/100

### Results

${report.results
  .map(
    (r) => `| ${r.passed ? '✅' : '❌'} | **${r.category}** | ${r.details} | ${r.score}/100 |`
  )
  .join('\n')}

### Summary

${report.passed ? '🎉 All quality checks passed!' : '⚠️ Some quality checks failed. Please review the issues above.'}

---

🤖 Generated by Miyabi Review Agent`;
}

async function main(): Promise<void> {
  ensureDirectories();
  const { issueNumber } = parseArgs();

  if (!issueNumber) {
    log('error', 'Issue number is required. Use --issue <number>');
    process.exit(1);
  }

  log('info', `👀 Review Agent started for issue #${issueNumber}`);

  try {
    const issue = await fetchIssue(issueNumber);
    log('info', `Reviewing code for: ${issue.title}`);

    const report = await performReview();
    log('info', 'Review completed', {
      overallScore: report.overallScore,
      passed: report.passed,
    });

    // Issueにコメントを追加
    const comment = formatReviewComment(report, issueNumber);
    await commentOnIssue(issueNumber, comment);

    log('info', '✅ Review Agent completed', {
      issueNumber,
      overallScore: report.overallScore,
      passed: report.passed,
    });

    if (!report.passed) {
      process.exit(1);
    }
  } catch (error) {
    log('error', 'Review Agent failed', error);
    process.exit(1);
  }
}

main();
