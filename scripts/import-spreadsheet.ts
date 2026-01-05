#!/usr/bin/env npx tsx
/**
 * スプレッドシート「大分市提出書類一覧」をLark Baseにインポート
 * 一切の誤記なく完全にデータを移行
 */

import { readFileSync } from 'fs';

const LARK_APP_ID = 'cli_a98f344fd6f8de1b';
const LARK_APP_SECRET = 'YiFmIRV7nc5cLwtfZOR2orPQ4uCqhJAf';
const BASE_URL = 'https://open.larksuite.com/open-apis';
const APP_TOKEN = 'JCXbbCR2baA0tbslCq9jXWkCpFB';

const FIELD_TYPES = {
  TEXT: 1,
  NUMBER: 2,
  SINGLE_SELECT: 3,
  MULTI_SELECT: 4,
  DATE: 5,
  CHECKBOX: 7,
  URL: 15,
} as const;

interface Record {
  カテゴリ: string;
  頻度: string;
  項目名: string;
  提出先: string;
  提出期限: string;
  様式指定: string;
  様式名番号: string;
  ファイル形式: string;
  ダウンロードURL: string;
  根拠法令: string;
  備考: string;
}

async function getAccessToken(): Promise<string> {
  const res = await fetch(`${BASE_URL}/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: LARK_APP_ID, app_secret: LARK_APP_SECRET }),
  });
  const data = await res.json();
  if (data.code !== 0) throw new Error(`Token error: ${data.msg}`);
  return data.tenant_access_token;
}

async function createTable(token: string, tableName: string): Promise<string> {
  // スプレッドシートの構造に完全一致するフィールド定義
  const fields = [
    { field_name: 'カテゴリ', type: FIELD_TYPES.SINGLE_SELECT, property: {
      options: [
        { name: '開業時' },
        { name: '日次' },
        { name: '月次' },
        { name: '6ヶ月毎' },
        { name: '年次' },
        { name: '随時' },
        { name: '6年毎' },
      ]
    }},
    { field_name: '頻度', type: FIELD_TYPES.TEXT },
    { field_name: '項目名', type: FIELD_TYPES.TEXT },
    { field_name: '提出先', type: FIELD_TYPES.SINGLE_SELECT, property: {
      options: [
        { name: '大分市' },
        { name: '大分県' },
        { name: '大分市→大分県' },
        { name: '国保連' },
        { name: '大分市消防局' },
        { name: '内部保管' },
      ]
    }},
    { field_name: '提出期限', type: FIELD_TYPES.TEXT },
    { field_name: '様式指定', type: FIELD_TYPES.SINGLE_SELECT, property: {
      options: [
        { name: '🔴指定' },
        { name: '🟢参考' },
        { name: '⚪任意' },
      ]
    }},
    { field_name: '様式名/番号', type: FIELD_TYPES.TEXT },
    { field_name: 'ファイル形式', type: FIELD_TYPES.SINGLE_SELECT, property: {
      options: [
        { name: 'Excel' },
        { name: 'Word' },
        { name: '電子' },
        { name: '-' },
      ]
    }},
    { field_name: 'ダウンロードURL', type: FIELD_TYPES.URL },
    { field_name: '根拠法令', type: FIELD_TYPES.TEXT },
    { field_name: '備考', type: FIELD_TYPES.TEXT },
  ];

  const res = await fetch(`${BASE_URL}/bitable/v1/apps/${APP_TOKEN}/tables`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      table: {
        name: tableName,
        default_view_name: 'Grid View',
        fields,
      },
    }),
  });

  const data = await res.json();
  if (data.code !== 0) throw new Error(`Create table error: ${data.msg}`);
  return data.data.table_id;
}

function parseCSV(csvContent: string): Record[] {
  const lines = csvContent.split('\n');
  const records: Record[] = [];
  let currentCategory = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // ヘッダー行をスキップ（最初の5行）
    if (i < 5) continue;

    const cols = parseCSVLine(line);

    // カテゴリ行を検出（【xxx】形式）
    if (cols[0].startsWith('【') && cols[0].includes('】')) {
      currentCategory = cols[0].replace(/【|】.*/g, '').replace('【', '');
      continue;
    }

    // データ行
    if (cols[0] && cols[1]) {
      records.push({
        カテゴリ: currentCategory,
        頻度: cols[0] || '',
        項目名: cols[1] || '',
        提出先: cols[2] || '',
        提出期限: cols[3] || '',
        様式指定: cols[4] || '',
        様式名番号: cols[5] || '',
        ファイル形式: cols[6] || '',
        ダウンロードURL: cols[7] || '',
        根拠法令: cols[8] || '',
        備考: cols[9] || '',
      });
    }
  }

  return records;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

async function batchCreateRecords(
  token: string,
  tableId: string,
  records: Record[]
): Promise<{ success: number; failed: number }> {
  const larkRecords = records.map(r => ({
    fields: {
      'カテゴリ': r.カテゴリ || undefined,
      '頻度': r.頻度 || undefined,
      '項目名': r.項目名 || undefined,
      '提出先': r.提出先 || undefined,
      '提出期限': r.提出期限 || undefined,
      '様式指定': r.様式指定 || undefined,
      '様式名/番号': r.様式名番号 || undefined,
      'ファイル形式': r.ファイル形式 || undefined,
      'ダウンロードURL': r.ダウンロードURL && r.ダウンロードURL !== '-' ? { link: r.ダウンロードURL } : undefined,
      '根拠法令': r.根拠法令 || undefined,
      '備考': r.備考 || undefined,
    },
  }));

  // 空のフィールドを削除
  for (const record of larkRecords) {
    for (const key of Object.keys(record.fields)) {
      if (record.fields[key as keyof typeof record.fields] === undefined ||
          record.fields[key as keyof typeof record.fields] === '') {
        delete record.fields[key as keyof typeof record.fields];
      }
    }
  }

  const res = await fetch(
    `${BASE_URL}/bitable/v1/apps/${APP_TOKEN}/tables/${tableId}/records/batch_create`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ records: larkRecords }),
    }
  );

  const data = await res.json();
  if (data.code !== 0) {
    console.error('Batch create error:', data.msg);
    console.error('First record sample:', JSON.stringify(larkRecords[0], null, 2));
    return { success: 0, failed: records.length };
  }

  return { success: data.data?.records?.length || 0, failed: 0 };
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 大分市提出書類一覧 → Lark Base インポート');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // 1. CSVを読み込み
    console.log('📄 CSVファイルを読み込み中...');
    const csvContent = readFileSync('/tmp/oita_documents.csv', 'utf-8');
    const records = parseCSV(csvContent);
    console.log(`✅ ${records.length} 件のレコードを解析\n`);

    // レコード確認
    console.log('📋 解析結果（カテゴリ別件数）:');
    const categoryCount: { [key: string]: number } = {};
    for (const r of records) {
      categoryCount[r.カテゴリ] = (categoryCount[r.カテゴリ] || 0) + 1;
    }
    for (const [cat, count] of Object.entries(categoryCount)) {
      console.log(`   ${cat}: ${count}件`);
    }
    console.log('');

    // 2. トークン取得
    console.log('🔐 Lark API 認証中...');
    const token = await getAccessToken();
    console.log('✅ 認証成功\n');

    // 3. 新しいテーブルを作成
    console.log('📊 新しいテーブル「大分市提出書類一覧_完全版」を作成中...');
    const tableId = await createTable(token, '大分市提出書類一覧_完全版');
    console.log(`✅ テーブル作成完了: ${tableId}\n`);

    // 4. レコードを登録
    console.log('📝 レコードを登録中...');
    const result = await batchCreateRecords(token, tableId, records);
    console.log(`✅ 登録完了: ${result.success}件成功, ${result.failed}件失敗\n`);

    // 5. 結果出力
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 インポート完了！');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`\n📊 テーブルID: ${tableId}`);
    console.log(`📝 登録レコード数: ${result.success}件`);
    console.log(`\n🔗 Lark Base URL: https://sjpfkixxkhe8.jp.larksuite.com/base/${APP_TOKEN}`);

    // .env に追記
    console.log(`\n# .env に追加:\nARU_LARK_TABLE_OITA_DOCUMENTS=${tableId}`);

  } catch (error) {
    console.error('❌ エラー:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
