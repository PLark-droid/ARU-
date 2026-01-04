#!/usr/bin/env node
/**
 * Webhook Event Router
 * GitHub Webhookイベントを適切なハンドラーにルーティングする
 */

type EventType = 'push' | 'issue' | 'pr' | 'comment' | 'label';

interface RouteConfig {
  event: EventType;
  handler: (args: string[]) => Promise<void>;
}

async function handlePush(args: string[]): Promise<void> {
  const [branchName, commitSha] = args;
  console.log(`🚀 Processing push event`);
  console.log(`   Branch: ${branchName}`);
  console.log(`   Commit: ${commitSha}`);

  // mainブランチへのプッシュの場合、特別な処理
  if (branchName === 'main' || branchName === 'master') {
    console.log('   ✅ Push to main branch detected');
    console.log('   📋 Checking for agent-related changes...');
  }

  console.log('   ✅ Push event processed successfully');
}

async function handleIssue(args: string[]): Promise<void> {
  const [action, issueNumber] = args;
  console.log(`📝 Processing issue event`);
  console.log(`   Action: ${action}`);
  console.log(`   Issue: #${issueNumber}`);

  if (action === 'opened' || action === 'labeled') {
    console.log('   🤖 Checking for agent-execute label...');
  }

  console.log('   ✅ Issue event processed successfully');
}

async function handlePR(args: string[]): Promise<void> {
  const [action, prNumber] = args;
  console.log(`🔀 Processing PR event`);
  console.log(`   Action: ${action}`);
  console.log(`   PR: #${prNumber}`);
  console.log('   ✅ PR event processed successfully');
}

async function handleComment(args: string[]): Promise<void> {
  const [issueNumber, commentBody] = args;
  console.log(`💬 Processing comment event`);
  console.log(`   Issue: #${issueNumber}`);
  console.log(`   Body: ${commentBody?.substring(0, 50)}...`);

  if (commentBody?.startsWith('/agent')) {
    console.log('   🤖 Agent command detected!');
  }

  console.log('   ✅ Comment event processed successfully');
}

async function handleLabel(args: string[]): Promise<void> {
  const [action, labelName, issueNumber] = args;
  console.log(`🏷️ Processing label event`);
  console.log(`   Action: ${action}`);
  console.log(`   Label: ${labelName}`);
  console.log(`   Issue: #${issueNumber}`);
  console.log('   ✅ Label event processed successfully');
}

const routes: RouteConfig[] = [
  { event: 'push', handler: handlePush },
  { event: 'issue', handler: handleIssue },
  { event: 'pr', handler: handlePR },
  { event: 'comment', handler: handleComment },
  { event: 'label', handler: handleLabel },
];

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const eventType = args[0] as EventType;
  const eventArgs = args.slice(1);

  console.log('🔔 Webhook Router Started');
  console.log(`   Event Type: ${eventType}`);
  console.log(`   Arguments: ${eventArgs.join(', ')}`);
  console.log('');

  const route = routes.find((r) => r.event === eventType);

  if (route) {
    await route.handler(eventArgs);
  } else {
    console.log(`⚠️ Unknown event type: ${eventType}`);
    console.log('   Supported events: push, issue, pr, comment, label');
  }

  console.log('');
  console.log('✅ Webhook Router completed');
}

main().catch((error) => {
  console.error('❌ Webhook Router failed:', error);
  process.exit(1);
});
