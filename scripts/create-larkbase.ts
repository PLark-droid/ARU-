#!/usr/bin/env npx tsx
/**
 * ARU内部監査運用 - Lark Base 新規作成スクリプト
 * 大分市提出書類一覧テーブルを含むBaseを作成
 */

// Lark API設定
const LARK_APP_ID = 'cli_a98f344fd6f8de1b';
const LARK_APP_SECRET = 'YiFmIRV7nc5cLwtfZOR2orPQ4uCqhJAf';
const BASE_URL = 'https://open.larksuite.com/open-apis';

// フィールドタイプ定義
const FIELD_TYPES = {
  TEXT: 1,
  NUMBER: 2,
  SINGLE_SELECT: 3,
  MULTI_SELECT: 4,
  DATE: 5,
  CHECKBOX: 7,
  PERSON: 11,
  URL: 15,
  ATTACHMENT: 17,
  CREATED_TIME: 1001,
  MODIFIED_TIME: 1002,
} as const;

interface TokenResponse {
  code: number;
  msg: string;
  tenant_access_token?: string;
  expire?: number;
}

interface CreateAppResponse {
  code: number;
  msg: string;
  data?: {
    app: {
      app_token: string;
      name: string;
      folder_token: string;
      url: string;
    };
  };
}

interface CreateTableResponse {
  code: number;
  msg: string;
  data?: {
    table_id: string;
  };
}

interface CreateFieldResponse {
  code: number;
  msg: string;
  data?: {
    field: {
      field_id: string;
      field_name: string;
    };
  };
}

// アクセストークンを取得
async function getAccessToken(): Promise<string> {
  const response = await fetch(`${BASE_URL}/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: LARK_APP_ID,
      app_secret: LARK_APP_SECRET,
    }),
  });

  const data: TokenResponse = await response.json();
  if (data.code !== 0 || !data.tenant_access_token) {
    throw new Error(`Failed to get token: ${data.msg}`);
  }
  return data.tenant_access_token;
}

// 新規Baseアプリを作成
async function createBaseApp(token: string, name: string): Promise<{ appToken: string; url: string }> {
  const response = await fetch(`${BASE_URL}/bitable/v1/apps`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      folder_token: '', // ルートフォルダに作成
    }),
  });

  const data: CreateAppResponse = await response.json();
  if (data.code !== 0 || !data.data?.app) {
    throw new Error(`Failed to create Base app: ${data.msg}`);
  }

  return {
    appToken: data.data.app.app_token,
    url: data.data.app.url,
  };
}

// テーブルを作成
async function createTable(
  token: string,
  appToken: string,
  tableName: string,
  fields: Array<{ field_name: string; type: number; property?: unknown }>
): Promise<string> {
  const response = await fetch(`${BASE_URL}/bitable/v1/apps/${appToken}/tables`, {
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

  const data: CreateTableResponse = await response.json();
  if (data.code !== 0 || !data.data?.table_id) {
    throw new Error(`Failed to create table: ${data.msg}`);
  }

  return data.data.table_id;
}

// フィールドを追加
async function addField(
  token: string,
  appToken: string,
  tableId: string,
  fieldName: string,
  fieldType: number,
  property?: unknown
): Promise<string> {
  const body: Record<string, unknown> = {
    field_name: fieldName,
    type: fieldType,
  };
  if (property) {
    body.property = property;
  }

  const response = await fetch(
    `${BASE_URL}/bitable/v1/apps/${appToken}/tables/${tableId}/fields`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  const data: CreateFieldResponse = await response.json();
  if (data.code !== 0) {
    console.warn(`Warning: Failed to add field "${fieldName}": ${data.msg}`);
    return '';
  }

  return data.data?.field.field_id || '';
}

async function main() {
  console.log('🚀 ARU内部監査運用 - Lark Base 作成開始\n');

  try {
    // 1. アクセストークン取得
    console.log('📡 Lark API 認証中...');
    const token = await getAccessToken();
    console.log('✅ 認証成功\n');

    // 2. 新規Base作成
    console.log('📊 新規 Lark Base を作成中...');
    const { appToken, url } = await createBaseApp(token, 'ARU内部監査運用');
    console.log(`✅ Base作成完了`);
    console.log(`   App Token: ${appToken}`);
    console.log(`   URL: ${url}\n`);

    // 3. 大分市提出書類一覧テーブルを作成
    console.log('📋 「大分市提出書類一覧」テーブルを作成中...');

    // 初期フィールド定義（テーブル作成時に指定）
    const initialFields = [
      { field_name: '書類名', type: FIELD_TYPES.TEXT },
      { field_name: '書類番号', type: FIELD_TYPES.TEXT },
    ];

    const tableId = await createTable(token, appToken, '大分市提出書類一覧', initialFields);
    console.log(`✅ テーブル作成完了: ${tableId}\n`);

    // 4. 追加フィールドを作成
    console.log('🔧 フィールドを追加中...');

    const additionalFields = [
      { name: '提出先', type: FIELD_TYPES.TEXT },
      { name: '提出期限', type: FIELD_TYPES.DATE },
      { name: '提出頻度', type: FIELD_TYPES.SINGLE_SELECT, property: {
        options: [
          { name: '年次' },
          { name: '半期' },
          { name: '四半期' },
          { name: '月次' },
          { name: '随時' },
          { name: '都度' },
        ]
      }},
      { name: 'ステータス', type: FIELD_TYPES.SINGLE_SELECT, property: {
        options: [
          { name: '未着手', color: 0 },
          { name: '作成中', color: 1 },
          { name: '確認中', color: 2 },
          { name: '提出済', color: 3 },
          { name: '完了', color: 4 },
        ]
      }},
      { name: '担当者', type: FIELD_TYPES.PERSON },
      { name: '確認者', type: FIELD_TYPES.PERSON },
      { name: '優先度', type: FIELD_TYPES.SINGLE_SELECT, property: {
        options: [
          { name: '高', color: 0 },
          { name: '中', color: 1 },
          { name: '低', color: 2 },
        ]
      }},
      { name: '書類カテゴリ', type: FIELD_TYPES.SINGLE_SELECT, property: {
        options: [
          { name: '監査報告書' },
          { name: '実施計画書' },
          { name: '是正報告書' },
          { name: 'チェックリスト' },
          { name: '証拠資料' },
          { name: 'その他' },
        ]
      }},
      { name: '関連法令', type: FIELD_TYPES.TEXT },
      { name: '備考', type: FIELD_TYPES.TEXT },
      { name: '添付ファイル', type: FIELD_TYPES.ATTACHMENT },
      { name: '提出日', type: FIELD_TYPES.DATE },
      { name: '次回提出予定日', type: FIELD_TYPES.DATE },
    ];

    for (const field of additionalFields) {
      await addField(token, appToken, tableId, field.name, field.type, field.property);
      console.log(`   ✓ ${field.name}`);
    }

    console.log('\n✅ フィールド追加完了\n');

    // 5. 結果をenv形式で出力
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 .env に追加する設定:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`
# ARU内部監査運用 Lark Base
LARK_APP_ID=${LARK_APP_ID}
LARK_APP_SECRET=${LARK_APP_SECRET}
ARU_LARK_BASE_APP_TOKEN=${appToken}
ARU_LARK_BASE_URL=${url}
ARU_LARK_TABLE_DOCUMENTS=${tableId}
`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('🎉 Lark Base 作成完了！');
    console.log(`\n🔗 Base URL: ${url}`);

  } catch (error) {
    console.error('❌ エラー:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
