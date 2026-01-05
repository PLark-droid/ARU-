#!/usr/bin/env npx tsx
/**
 * DocuGenius設計書のデータをLark Baseに登録
 * スプレッドシートの全データを漏れなく登録
 */

import XLSX from 'xlsx';

const LARK_APP_ID = 'cli_a98f344fd6f8de1b';
const LARK_APP_SECRET = 'YiFmIRV7nc5cLwtfZOR2orPQ4uCqhJAf';
const BASE_URL = 'https://open.larksuite.com/open-apis';
const APP_TOKEN = 'W6NFbiGheaX2SLs7bxpjzvkSpc8';

const FIELD_TYPES = {
  TEXT: 1,
  NUMBER: 2,
  SINGLE_SELECT: 3,
  DATE: 5,
  URL: 15,
} as const;

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

async function createTable(token: string, name: string, fields: Array<{ field_name: string; type: number; property?: unknown }>): Promise<string> {
  const res = await fetch(`${BASE_URL}/bitable/v1/apps/${APP_TOKEN}/tables`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ table: { name, default_view_name: 'Grid View', fields } }),
  });
  const data = await res.json();
  if (data.code !== 0) throw new Error(`Create table error: ${data.msg}`);
  return data.data.table_id;
}

async function addField(token: string, tableId: string, fieldName: string, fieldType: number, property?: unknown): Promise<void> {
  const body: Record<string, unknown> = { field_name: fieldName, type: fieldType };
  if (property) body.property = property;
  await fetch(`${BASE_URL}/bitable/v1/apps/${APP_TOKEN}/tables/${tableId}/fields`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function batchCreateRecords(token: string, tableId: string, records: Array<Record<string, unknown>>): Promise<number> {
  const larkRecords = records.map(r => ({ fields: r }));
  const res = await fetch(`${BASE_URL}/bitable/v1/apps/${APP_TOKEN}/tables/${tableId}/records/batch_create`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ records: larkRecords }),
  });
  const data = await res.json();
  if (data.code !== 0) {
    console.error('Batch create error:', data.msg);
    return 0;
  }
  return data.data?.records?.length || 0;
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 DocuGenius設計書データをLark Baseに登録');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // スプレッドシート読み込み
  console.log('📄 スプレッドシートを読み込み中...');
  const workbook = XLSX.readFile('/tmp/docugenius_design.xlsx');
  console.log(`✅ ${workbook.SheetNames.length}シート読み込み完了\n`);

  // トークン取得
  console.log('🔐 Lark API 認証中...');
  const token = await getAccessToken();
  console.log('✅ 認証成功\n');

  // ========================================
  // 1. 概要_テーブル一覧 テーブル作成
  // ========================================
  console.log('📋 「概要_テーブル一覧」テーブルを作成中...');
  const tableListFields = [
    { field_name: 'No', type: FIELD_TYPES.NUMBER },
    { field_name: 'テーブル名', type: FIELD_TYPES.TEXT },
  ];
  const tableListId = await createTable(token, '概要_テーブル一覧', tableListFields);
  await addField(token, tableListId, '報告書種別', FIELD_TYPES.TEXT);
  await addField(token, tableListId, '提出時期', FIELD_TYPES.TEXT);
  await addField(token, tableListId, '提出先', FIELD_TYPES.TEXT);
  await addField(token, tableListId, '作成頻度', FIELD_TYPES.TEXT);
  console.log(`   テーブルID: ${tableListId}`);

  // 概要シートからテーブル一覧を抽出
  const overviewSheet = workbook.Sheets['概要'];
  const overviewData = XLSX.utils.sheet_to_json(overviewSheet, { header: 1 }) as string[][];

  const tableListRecords: Array<Record<string, unknown>> = [];
  for (let i = 7; i <= 15; i++) {
    const row = overviewData[i - 1];
    if (row && row[0] && !isNaN(Number(row[0]))) {
      tableListRecords.push({
        'No': Number(row[0]),
        'テーブル名': row[1] || '',
        '報告書種別': row[2] || '',
        '提出時期': row[3] || '',
        '提出先': row[4] || '',
        '作成頻度': row[5] || '',
      });
    }
  }
  const tableListCount = await batchCreateRecords(token, tableListId, tableListRecords);
  console.log(`   ✅ ${tableListCount}件登録完了\n`);

  // ========================================
  // 2. 概要_参照元テーブル一覧 テーブル作成
  // ========================================
  console.log('📋 「概要_参照元テーブル一覧」テーブルを作成中...');
  const refTableFields = [
    { field_name: '参照元テーブル', type: FIELD_TYPES.TEXT },
    { field_name: 'データ種別', type: FIELD_TYPES.TEXT },
  ];
  const refTableId = await createTable(token, '概要_参照元テーブル一覧', refTableFields);
  await addField(token, refTableId, '管理場所', FIELD_TYPES.TEXT);
  await addField(token, refTableId, '更新頻度', FIELD_TYPES.TEXT);
  console.log(`   テーブルID: ${refTableId}`);

  const refTableRecords: Array<Record<string, unknown>> = [];
  for (let i = 20; i <= 35; i++) {
    const row = overviewData[i - 1];
    if (row && row[0] && row[0] !== '参照元テーブル') {
      refTableRecords.push({
        '参照元テーブル': row[0] || '',
        'データ種別': row[1] || '',
        '管理場所': row[2] || '',
        '更新頻度': row[3] || '',
      });
    }
  }
  const refTableCount = await batchCreateRecords(token, refTableId, refTableRecords);
  console.log(`   ✅ ${refTableCount}件登録完了\n`);

  // ========================================
  // 3. 各データシートのフィールド設計情報を登録
  // ========================================
  const dataSheets = [
    '処遇改善実績報告データ',
    '工賃実績報告データ',
    '事業報告データ',
    '変更届データ',
    '加算届データ',
    '事故報告データ',
    '個別支援計画データ',
    'モニタリング報告データ',
  ];

  console.log('📋 「フィールド設計情報」テーブルを作成中...');
  const fieldDesignFields = [
    { field_name: 'テーブル名', type: FIELD_TYPES.TEXT },
    { field_name: 'セクション', type: FIELD_TYPES.TEXT },
  ];
  const fieldDesignId = await createTable(token, 'フィールド設計情報', fieldDesignFields);
  await addField(token, fieldDesignId, 'No', FIELD_TYPES.NUMBER);
  await addField(token, fieldDesignId, 'データ項目', FIELD_TYPES.TEXT);
  await addField(token, fieldDesignId, 'フィールドタイプ', FIELD_TYPES.TEXT);
  await addField(token, fieldDesignId, '参照元テーブル', FIELD_TYPES.TEXT);
  await addField(token, fieldDesignId, '参照フィールド', FIELD_TYPES.TEXT);
  await addField(token, fieldDesignId, 'データ取得方法', FIELD_TYPES.SINGLE_SELECT, {
    options: [{ name: '自動参照' }, { name: '手入力' }, { name: '自動計算' }]
  });
  await addField(token, fieldDesignId, '備考', FIELD_TYPES.TEXT);
  console.log(`   テーブルID: ${fieldDesignId}`);

  let totalFieldRecords = 0;
  const allFieldRecords: Array<Record<string, unknown>> = [];

  for (const sheetName of dataSheets) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as string[][];
    let currentSection = '';

    for (let i = 4; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;

      // セクションヘッダーを検出（■で始まる行）
      if (row[0] && String(row[0]).startsWith('■')) {
        currentSection = String(row[0]).replace('■ ', '').replace('■', '');
        continue;
      }

      // 凡例・運用メモはスキップ
      if (row[0] && (String(row[0]).includes('凡例') || String(row[0]).includes('運用メモ'))) {
        break;
      }

      // データ行
      const no = Number(row[0]);
      if (!isNaN(no) && row[1]) {
        allFieldRecords.push({
          'テーブル名': sheetName,
          'セクション': currentSection,
          'No': no,
          'データ項目': row[1] || '',
          'フィールドタイプ': row[2] || '',
          '参照元テーブル': row[3] || '',
          '参照フィールド': row[4] || '',
          'データ取得方法': row[5] || '',
          '備考': row[6] || '',
        });
      }
    }
  }

  // バッチ登録（500件ずつ）
  for (let i = 0; i < allFieldRecords.length; i += 500) {
    const batch = allFieldRecords.slice(i, i + 500);
    const count = await batchCreateRecords(token, fieldDesignId, batch);
    totalFieldRecords += count;
  }
  console.log(`   ✅ ${totalFieldRecords}件登録完了\n`);

  // ========================================
  // 4. 凡例テーブル作成
  // ========================================
  console.log('📋 「凡例」テーブルを作成中...');
  const legendFields = [
    { field_name: '記号', type: FIELD_TYPES.TEXT },
    { field_name: '説明', type: FIELD_TYPES.TEXT },
  ];
  const legendId = await createTable(token, '凡例', legendFields);
  console.log(`   テーブルID: ${legendId}`);

  const legendRecords = [
    { '記号': '自動参照', '説明': '他テーブルから自動的に値を取得' },
    { '記号': '手入力', '説明': '報告書作成時に手動で入力' },
    { '記号': '自動計算', '説明': '数式で自動計算' },
  ];
  const legendCount = await batchCreateRecords(token, legendId, legendRecords);
  console.log(`   ✅ ${legendCount}件登録完了\n`);

  // ========================================
  // 5. DocuGenius連携ポイント テーブル作成
  // ========================================
  console.log('📋 「DocuGenius連携ポイント」テーブルを作成中...');
  const tipsFields = [
    { field_name: 'No', type: FIELD_TYPES.NUMBER },
    { field_name: '連携ポイント', type: FIELD_TYPES.TEXT },
  ];
  const tipsId = await createTable(token, 'DocuGenius連携ポイント', tipsFields);
  console.log(`   テーブルID: ${tipsId}`);

  const tipsRecords = [
    { 'No': 1, '連携ポイント': '各報告書データテーブルを作成し、参照元テーブルとリンクで接続' },
    { 'No': 2, '連携ポイント': '可能な限り「自動参照」で値を取得し、手入力項目を最小化' },
    { 'No': 3, '連携ポイント': '報告書作成時は該当テーブルに新規レコード作成→DocuGeniusで出力' },
    { 'No': 4, '連携ポイント': '出力した報告書はPDFで保存、Bitableの添付ファイルに保管' },
  ];
  const tipsCount = await batchCreateRecords(token, tipsId, tipsRecords);
  console.log(`   ✅ ${tipsCount}件登録完了\n`);

  // ========================================
  // 結果出力
  // ========================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 スプレッドシートデータの登録完了！');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('📝 作成されたテーブル:');
  console.log(`   - 概要_テーブル一覧: ${tableListId} (${tableListCount}件)`);
  console.log(`   - 概要_参照元テーブル一覧: ${refTableId} (${refTableCount}件)`);
  console.log(`   - フィールド設計情報: ${fieldDesignId} (${totalFieldRecords}件)`);
  console.log(`   - 凡例: ${legendId} (${legendCount}件)`);
  console.log(`   - DocuGenius連携ポイント: ${tipsId} (${tipsCount}件)`);

  const totalRecords = tableListCount + refTableCount + totalFieldRecords + legendCount + tipsCount;
  console.log(`\n📊 合計: ${totalRecords}レコード登録完了`);
  console.log(`\n🔗 Base URL: https://sjpfkixxkhe8.jp.larksuite.com/base/${APP_TOKEN}`);
}

main().catch(e => {
  console.error('❌ エラー:', e.message);
  process.exit(1);
});
