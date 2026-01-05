#!/usr/bin/env npx tsx
/**
 * DocuGenius用 報告書データテーブル - Lark Base 作成スクリプト
 * B型就労支援事業所の報告書を半自動生成するための完全なデータベース構築
 */

const LARK_APP_ID = 'cli_a98f344fd6f8de1b';
const LARK_APP_SECRET = 'YiFmIRV7nc5cLwtfZOR2orPQ4uCqhJAf';
const BASE_URL = 'https://open.larksuite.com/open-apis';

const FIELD_TYPES = {
  TEXT: 1,
  NUMBER: 2,
  SINGLE_SELECT: 3,
  MULTI_SELECT: 4,
  DATE: 5,
  CHECKBOX: 7,
  PERSON: 11,
  PHONE: 13,
  URL: 15,
  ATTACHMENT: 17,
  LINK: 18,
  FORMULA: 20,
  CURRENCY: 99901,
  PERCENT: 99902,
  DATETIME: 99903,
  LONG_TEXT: 99904,
} as const;

interface FieldDef {
  name: string;
  type: number;
  property?: unknown;
}

interface TableDef {
  name: string;
  description: string;
  fields: FieldDef[];
}

// ===============================
// テーブル定義（スプレッドシート完全準拠）
// ===============================

const TABLES: TableDef[] = [
  // 1. 処遇改善実績報告データ
  {
    name: '処遇改善実績報告データ',
    description: '提出時期：毎年7月末　提出先：都道府県',
    fields: [
      // 事業所基本情報
      { name: '法人名', type: FIELD_TYPES.TEXT },
      { name: '法人住所', type: FIELD_TYPES.TEXT },
      { name: '法人代表者', type: FIELD_TYPES.TEXT },
      { name: '事業所名', type: FIELD_TYPES.TEXT },
      { name: '事業所番号', type: FIELD_TYPES.TEXT },
      { name: '事業所所在地', type: FIELD_TYPES.TEXT },
      { name: '担当者氏名', type: FIELD_TYPES.TEXT },
      // 報告対象期間
      { name: '対象年度', type: FIELD_TYPES.TEXT },
      { name: '算定開始年月', type: FIELD_TYPES.DATE },
      { name: '算定終了年月', type: FIELD_TYPES.DATE },
      // 加算取得状況
      { name: '処遇改善加算区分', type: FIELD_TYPES.SINGLE_SELECT, property: { options: [{ name: 'I' }, { name: 'II' }, { name: 'III' }, { name: 'IV' }, { name: 'なし' }] } },
      { name: '特定処遇改善加算区分', type: FIELD_TYPES.SINGLE_SELECT, property: { options: [{ name: 'I' }, { name: 'II' }, { name: 'なし' }] } },
      { name: 'ベースアップ等加算', type: FIELD_TYPES.SINGLE_SELECT, property: { options: [{ name: 'あり' }, { name: 'なし' }] } },
      // 職員情報
      { name: '対象職員数（常勤）', type: FIELD_TYPES.NUMBER },
      { name: '対象職員数（非常勤）', type: FIELD_TYPES.NUMBER },
      { name: '常勤換算数（年度平均）', type: FIELD_TYPES.NUMBER },
      // 賃金改善実績
      { name: '処遇改善加算総額', type: FIELD_TYPES.NUMBER },
      { name: '特定処遇改善加算総額', type: FIELD_TYPES.NUMBER },
      { name: 'ベースアップ等加算総額', type: FIELD_TYPES.NUMBER },
      { name: '加算総額合計', type: FIELD_TYPES.NUMBER },
      { name: '賃金改善総額', type: FIELD_TYPES.NUMBER },
      { name: '賃金改善額−加算額', type: FIELD_TYPES.NUMBER },
      // キャリアパス要件
      { name: '要件I（賃金体系）充足', type: FIELD_TYPES.SINGLE_SELECT, property: { options: [{ name: '充足' }, { name: '未充足' }] } },
      { name: '要件II（研修）充足', type: FIELD_TYPES.SINGLE_SELECT, property: { options: [{ name: '充足' }, { name: '未充足' }] } },
      { name: '要件III（昇給）充足', type: FIELD_TYPES.SINGLE_SELECT, property: { options: [{ name: '充足' }, { name: '未充足' }] } },
    ],
  },

  // 2. 工賃実績報告データ
  {
    name: '工賃実績報告データ',
    description: '提出時期：年度末　提出先：市町村/都道府県',
    fields: [
      // 事業所基本情報
      { name: '法人名', type: FIELD_TYPES.TEXT },
      { name: '事業所名', type: FIELD_TYPES.TEXT },
      { name: '事業所番号', type: FIELD_TYPES.TEXT },
      // 報告対象期間
      { name: '対象年度', type: FIELD_TYPES.TEXT },
      // 年間工賃実績
      { name: '年度末利用者数', type: FIELD_TYPES.NUMBER },
      { name: '年間延利用者数', type: FIELD_TYPES.NUMBER },
      { name: '年間工賃支払総額', type: FIELD_TYPES.NUMBER },
      { name: '平均工賃月額', type: FIELD_TYPES.NUMBER },
      // 月別工賃実績（4月〜3月）
      { name: '4月_利用者数', type: FIELD_TYPES.NUMBER },
      { name: '4月_工賃支払額', type: FIELD_TYPES.NUMBER },
      { name: '5月_利用者数', type: FIELD_TYPES.NUMBER },
      { name: '5月_工賃支払額', type: FIELD_TYPES.NUMBER },
      { name: '6月_利用者数', type: FIELD_TYPES.NUMBER },
      { name: '6月_工賃支払額', type: FIELD_TYPES.NUMBER },
      { name: '7月_利用者数', type: FIELD_TYPES.NUMBER },
      { name: '7月_工賃支払額', type: FIELD_TYPES.NUMBER },
      { name: '8月_利用者数', type: FIELD_TYPES.NUMBER },
      { name: '8月_工賃支払額', type: FIELD_TYPES.NUMBER },
      { name: '9月_利用者数', type: FIELD_TYPES.NUMBER },
      { name: '9月_工賃支払額', type: FIELD_TYPES.NUMBER },
      { name: '10月_利用者数', type: FIELD_TYPES.NUMBER },
      { name: '10月_工賃支払額', type: FIELD_TYPES.NUMBER },
      { name: '11月_利用者数', type: FIELD_TYPES.NUMBER },
      { name: '11月_工賃支払額', type: FIELD_TYPES.NUMBER },
      { name: '12月_利用者数', type: FIELD_TYPES.NUMBER },
      { name: '12月_工賃支払額', type: FIELD_TYPES.NUMBER },
      { name: '1月_利用者数', type: FIELD_TYPES.NUMBER },
      { name: '1月_工賃支払額', type: FIELD_TYPES.NUMBER },
      { name: '2月_利用者数', type: FIELD_TYPES.NUMBER },
      { name: '2月_工賃支払額', type: FIELD_TYPES.NUMBER },
      { name: '3月_利用者数', type: FIELD_TYPES.NUMBER },
      { name: '3月_工賃支払額', type: FIELD_TYPES.NUMBER },
      // 目標達成状況
      { name: '工賃目標額', type: FIELD_TYPES.NUMBER },
      { name: '達成率', type: FIELD_TYPES.NUMBER },
    ],
  },

  // 3. 事業報告データ
  {
    name: '事業報告データ',
    description: '提出時期：事業年度終了後3ヶ月以内　提出先：所轄庁',
    fields: [
      // 事業所基本情報
      { name: '法人名', type: FIELD_TYPES.TEXT },
      { name: '事業所名', type: FIELD_TYPES.TEXT },
      { name: '事業所番号', type: FIELD_TYPES.TEXT },
      { name: '定員', type: FIELD_TYPES.NUMBER },
      // 利用状況
      { name: '年度末利用者数', type: FIELD_TYPES.NUMBER },
      { name: '年間新規利用者数', type: FIELD_TYPES.NUMBER },
      { name: '年間終了利用者数', type: FIELD_TYPES.NUMBER },
      { name: '年間延利用日数', type: FIELD_TYPES.NUMBER },
      { name: '平均利用率', type: FIELD_TYPES.NUMBER },
      { name: '就労移行者数', type: FIELD_TYPES.NUMBER },
      // 職員状況
      { name: '常勤職員数', type: FIELD_TYPES.NUMBER },
      { name: '非常勤職員数', type: FIELD_TYPES.NUMBER },
      { name: '常勤換算合計', type: FIELD_TYPES.NUMBER },
      // 研修・訓練実施状況
      { name: '内部研修実施回数', type: FIELD_TYPES.NUMBER },
      { name: '外部研修参加延人数', type: FIELD_TYPES.NUMBER },
      { name: '避難訓練実施回数', type: FIELD_TYPES.NUMBER },
      { name: 'BCP訓練実施回数', type: FIELD_TYPES.NUMBER },
      // 安全管理・苦情
      { name: '事故発生件数', type: FIELD_TYPES.NUMBER },
      { name: 'ヒヤリハット件数', type: FIELD_TYPES.NUMBER },
      { name: '苦情受付件数', type: FIELD_TYPES.NUMBER },
    ],
  },

  // 4. 変更届データ
  {
    name: '変更届データ',
    description: '提出時期：変更から10日以内　提出先：都道府県/市町村',
    fields: [
      // 届出基本情報
      { name: '届出日', type: FIELD_TYPES.DATE },
      { name: '届出事由', type: FIELD_TYPES.SINGLE_SELECT, property: { options: [{ name: '管理者変更' }, { name: 'サビ管変更' }, { name: '定員変更' }, { name: '所在地変更' }, { name: 'その他' }] } },
      { name: '変更年月日', type: FIELD_TYPES.DATE },
      // 事業所情報
      { name: '法人名', type: FIELD_TYPES.TEXT },
      { name: '事業所名', type: FIELD_TYPES.TEXT },
      { name: '事業所番号', type: FIELD_TYPES.TEXT },
      // 管理者変更
      { name: '旧管理者氏名', type: FIELD_TYPES.TEXT },
      { name: '新管理者氏名', type: FIELD_TYPES.TEXT },
      { name: '新管理者生年月日', type: FIELD_TYPES.DATE },
      { name: '新管理者住所', type: FIELD_TYPES.TEXT },
      // サビ管変更
      { name: '旧サビ管氏名', type: FIELD_TYPES.TEXT },
      { name: '新サビ管氏名', type: FIELD_TYPES.TEXT },
      { name: '基礎研修修了日', type: FIELD_TYPES.DATE },
      { name: '実践研修修了日', type: FIELD_TYPES.DATE },
      // 定員変更
      { name: '旧定員', type: FIELD_TYPES.NUMBER },
      { name: '新定員', type: FIELD_TYPES.NUMBER },
      { name: '変更理由', type: FIELD_TYPES.TEXT },
    ],
  },

  // 5. 加算届データ
  {
    name: '加算届データ',
    description: '提出時期：算定開始月の前月15日まで　提出先：都道府県',
    fields: [
      // 届出基本情報
      { name: '届出日', type: FIELD_TYPES.DATE },
      { name: '届出区分', type: FIELD_TYPES.SINGLE_SELECT, property: { options: [{ name: '新規' }, { name: '変更' }, { name: '取下' }] } },
      { name: '算定開始年月', type: FIELD_TYPES.DATE },
      { name: '届出加算名', type: FIELD_TYPES.SINGLE_SELECT, property: { options: [{ name: '福祉専門職員配置等加算' }, { name: '目標工賃達成指導員配置加算' }, { name: '処遇改善加算' }, { name: '特定処遇改善加算' }, { name: 'ベースアップ等加算' }, { name: 'その他' }] } },
      // 事業所情報
      { name: '法人名', type: FIELD_TYPES.TEXT },
      { name: '事業所名', type: FIELD_TYPES.TEXT },
      { name: '事業所番号', type: FIELD_TYPES.TEXT },
      // 福祉専門職員配置等加算
      { name: '常勤職員総数', type: FIELD_TYPES.NUMBER },
      { name: '社会福祉士数', type: FIELD_TYPES.NUMBER },
      { name: '介護福祉士数', type: FIELD_TYPES.NUMBER },
      { name: '有資格者割合', type: FIELD_TYPES.NUMBER },
      // 目標工賃達成指導員配置加算
      { name: '配置指導員氏名', type: FIELD_TYPES.TEXT },
      { name: '前年度平均工賃月額', type: FIELD_TYPES.NUMBER },
      { name: '地域最低賃金', type: FIELD_TYPES.NUMBER },
      { name: '工賃÷最低賃金', type: FIELD_TYPES.NUMBER },
    ],
  },

  // 6. 事故報告データ
  {
    name: '事故報告データ',
    description: '提出時期：発生時速やかに　提出先：市町村',
    fields: [
      // 報告基本情報
      { name: '報告日', type: FIELD_TYPES.DATE },
      { name: '報告種別', type: FIELD_TYPES.SINGLE_SELECT, property: { options: [{ name: '第一報' }, { name: '詳細' }, { name: '最終' }] } },
      // 事業所情報
      { name: '法人名', type: FIELD_TYPES.TEXT },
      { name: '事業所名', type: FIELD_TYPES.TEXT },
      { name: '管理者氏名', type: FIELD_TYPES.TEXT },
      { name: '事業所電話番号', type: FIELD_TYPES.TEXT },
      // 事故発生情報
      { name: '発生日', type: FIELD_TYPES.DATE },
      { name: '発生時刻', type: FIELD_TYPES.TEXT },
      { name: '発生場所', type: FIELD_TYPES.TEXT },
      { name: '事故種別', type: FIELD_TYPES.SINGLE_SELECT, property: { options: [{ name: '転倒' }, { name: '転落' }, { name: '誤嚥' }, { name: '異食' }, { name: '離設' }, { name: '送迎事故' }, { name: 'その他' }] } },
      // 対象者情報
      { name: '対象者氏名', type: FIELD_TYPES.TEXT },
      { name: '生年月日', type: FIELD_TYPES.DATE },
      { name: '年齢', type: FIELD_TYPES.NUMBER },
      { name: '性別', type: FIELD_TYPES.SINGLE_SELECT, property: { options: [{ name: '男性' }, { name: '女性' }] } },
      { name: '障害支援区分', type: FIELD_TYPES.SINGLE_SELECT, property: { options: [{ name: '区分1' }, { name: '区分2' }, { name: '区分3' }, { name: '区分4' }, { name: '区分5' }, { name: '区分6' }, { name: '非該当' }] } },
      // 事故内容・対応
      { name: '発生状況', type: FIELD_TYPES.TEXT },
      { name: '対応内容', type: FIELD_TYPES.TEXT },
      { name: '受診の有無', type: FIELD_TYPES.SINGLE_SELECT, property: { options: [{ name: 'あり' }, { name: 'なし' }] } },
      { name: '受診先', type: FIELD_TYPES.TEXT },
      { name: '診断結果', type: FIELD_TYPES.TEXT },
      // 家族連絡
      { name: '連絡先氏名', type: FIELD_TYPES.TEXT },
      { name: '連絡先電話', type: FIELD_TYPES.TEXT },
      { name: '連絡日時', type: FIELD_TYPES.TEXT },
      // 原因分析・再発防止
      { name: '事故原因', type: FIELD_TYPES.TEXT },
      { name: '再発防止策', type: FIELD_TYPES.TEXT },
    ],
  },

  // 7. 個別支援計画データ
  {
    name: '個別支援計画データ',
    description: '作成時期：利用開始時・更新時　対象：全利用者',
    fields: [
      // 計画基本情報
      { name: '計画作成日', type: FIELD_TYPES.DATE },
      { name: '計画開始日', type: FIELD_TYPES.DATE },
      { name: '計画終了日', type: FIELD_TYPES.DATE },
      { name: '計画種別', type: FIELD_TYPES.SINGLE_SELECT, property: { options: [{ name: '新規' }, { name: '更新' }, { name: '変更' }] } },
      // 事業所情報
      { name: '事業所名', type: FIELD_TYPES.TEXT },
      { name: '事業所番号', type: FIELD_TYPES.TEXT },
      // 利用者基本情報
      { name: '氏名', type: FIELD_TYPES.TEXT },
      { name: 'フリガナ', type: FIELD_TYPES.TEXT },
      { name: '生年月日', type: FIELD_TYPES.DATE },
      { name: '住所', type: FIELD_TYPES.TEXT },
      { name: '障害支援区分', type: FIELD_TYPES.SINGLE_SELECT, property: { options: [{ name: '区分1' }, { name: '区分2' }, { name: '区分3' }, { name: '区分4' }, { name: '区分5' }, { name: '区分6' }, { name: '非該当' }] } },
      { name: '受給者証番号', type: FIELD_TYPES.TEXT },
      { name: '相談支援事業所', type: FIELD_TYPES.TEXT },
      { name: '相談支援専門員', type: FIELD_TYPES.TEXT },
      // アセスメント
      { name: '本人の希望する生活', type: FIELD_TYPES.TEXT },
      { name: '現在の生活状況', type: FIELD_TYPES.TEXT },
      { name: '健康状態', type: FIELD_TYPES.TEXT },
      // 支援方針・目標
      { name: '総合的な支援方針', type: FIELD_TYPES.TEXT },
      { name: '長期目標', type: FIELD_TYPES.TEXT },
      { name: '短期目標①', type: FIELD_TYPES.TEXT },
      { name: '短期目標①支援内容', type: FIELD_TYPES.TEXT },
      { name: '短期目標②', type: FIELD_TYPES.TEXT },
      { name: '短期目標②支援内容', type: FIELD_TYPES.TEXT },
      // 作成者・同意
      { name: 'サービス管理責任者', type: FIELD_TYPES.TEXT },
      { name: '担当職員', type: FIELD_TYPES.TEXT },
      { name: '担当者会議実施日', type: FIELD_TYPES.DATE },
      { name: '本人同意日', type: FIELD_TYPES.DATE },
    ],
  },

  // 8. モニタリング報告データ
  {
    name: 'モニタリング報告データ',
    description: '作成時期：6ヶ月毎　対象：全利用者',
    fields: [
      // モニタリング基本情報
      { name: '実施日', type: FIELD_TYPES.DATE },
      { name: '対象計画', type: FIELD_TYPES.TEXT },
      // 事業所・利用者情報
      { name: '事業所名', type: FIELD_TYPES.TEXT },
      { name: '氏名', type: FIELD_TYPES.TEXT },
      // 計画内容（参照）
      { name: '長期目標', type: FIELD_TYPES.TEXT },
      { name: '短期目標①', type: FIELD_TYPES.TEXT },
      { name: '短期目標②', type: FIELD_TYPES.TEXT },
      // 目標達成状況評価
      { name: '短期目標①達成状況', type: FIELD_TYPES.SINGLE_SELECT, property: { options: [{ name: '達成' }, { name: '一部達成' }, { name: '未達成' }] } },
      { name: '短期目標①評価内容', type: FIELD_TYPES.TEXT },
      { name: '短期目標②達成状況', type: FIELD_TYPES.SINGLE_SELECT, property: { options: [{ name: '達成' }, { name: '一部達成' }, { name: '未達成' }] } },
      { name: '短期目標②評価内容', type: FIELD_TYPES.TEXT },
      // 本人の意向
      { name: '本人の満足度', type: FIELD_TYPES.SINGLE_SELECT, property: { options: [{ name: '満足' }, { name: 'やや満足' }, { name: '普通' }, { name: 'やや不満' }, { name: '不満' }] } },
      { name: '本人の意向・希望', type: FIELD_TYPES.TEXT },
      // 今後の方針
      { name: '計画変更要否', type: FIELD_TYPES.SINGLE_SELECT, property: { options: [{ name: '変更必要' }, { name: '変更不要' }] } },
      { name: '変更内容', type: FIELD_TYPES.TEXT },
      { name: '次回モニタリング予定', type: FIELD_TYPES.DATE },
      // 作成者
      { name: '実施者', type: FIELD_TYPES.TEXT },
      { name: 'サビ管確認', type: FIELD_TYPES.SINGLE_SELECT, property: { options: [{ name: '確認済' }, { name: '未確認' }] } },
    ],
  },
];

// ===============================
// API関数
// ===============================

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

async function createBaseApp(token: string, name: string): Promise<{ appToken: string; url: string }> {
  const res = await fetch(`${BASE_URL}/bitable/v1/apps`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, folder_token: '' }),
  });
  const data = await res.json();
  if (data.code !== 0) throw new Error(`Create Base error: ${data.msg}`);
  return { appToken: data.data.app.app_token, url: data.data.app.url };
}

async function createTable(token: string, appToken: string, tableDef: TableDef): Promise<string> {
  // 最初の2フィールドでテーブル作成
  const initialFields = tableDef.fields.slice(0, 2).map(f => ({
    field_name: f.name,
    type: f.type,
    ...(f.property ? { property: f.property } : {}),
  }));

  const res = await fetch(`${BASE_URL}/bitable/v1/apps/${appToken}/tables`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table: { name: tableDef.name, default_view_name: 'Grid View', fields: initialFields },
    }),
  });
  const data = await res.json();
  if (data.code !== 0) throw new Error(`Create table error: ${data.msg}`);
  return data.data.table_id;
}

async function addField(token: string, appToken: string, tableId: string, field: FieldDef): Promise<void> {
  const body: Record<string, unknown> = { field_name: field.name, type: field.type };
  if (field.property) body.property = field.property;

  const res = await fetch(`${BASE_URL}/bitable/v1/apps/${appToken}/tables/${tableId}/fields`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (data.code !== 0) {
    console.log(`   ⚠️ ${field.name}: ${data.msg}`);
  }
}

async function setPublicAccess(token: string, appToken: string): Promise<void> {
  await fetch(`${BASE_URL}/drive/v1/permissions/${appToken}/public?type=bitable`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ external_access_entity: 'open', link_share_entity: 'anyone_editable' }),
  });
}

// ===============================
// メイン処理
// ===============================

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 DocuGenius用 報告書データテーブル - Lark Base 作成');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // 1. 認証
    console.log('🔐 Lark API 認証中...');
    const token = await getAccessToken();
    console.log('✅ 認証成功\n');

    // 2. 新規Base作成
    console.log('📊 新規 Lark Base を作成中...');
    const { appToken, url } = await createBaseApp(token, 'DocuGenius報告書データベース');
    console.log(`✅ Base作成完了: ${appToken}`);
    console.log(`   URL: ${url}\n`);

    // 3. 共有設定
    console.log('🔓 共有設定を適用中...');
    await setPublicAccess(token, appToken);
    console.log('✅ 共有設定完了\n');

    // 4. テーブル作成
    const tableIds: { [key: string]: string } = {};
    let totalFields = 0;

    for (const tableDef of TABLES) {
      console.log(`\n📋 テーブル「${tableDef.name}」を作成中...`);
      console.log(`   ${tableDef.description}`);

      const tableId = await createTable(token, appToken, tableDef);
      tableIds[tableDef.name] = tableId;
      console.log(`   テーブルID: ${tableId}`);

      // 残りのフィールドを追加
      const remainingFields = tableDef.fields.slice(2);
      for (const field of remainingFields) {
        await addField(token, appToken, tableId, field);
      }
      console.log(`   ✅ ${tableDef.fields.length}フィールド作成完了`);
      totalFields += tableDef.fields.length;
    }

    // 5. 結果出力
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 DocuGenius用 Lark Base 作成完了！');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log(`📊 Base App Token: ${appToken}`);
    console.log(`🔗 Base URL: ${url}`);
    console.log(`📋 テーブル数: ${TABLES.length}`);
    console.log(`🔧 総フィールド数: ${totalFields}\n`);

    console.log('📝 作成されたテーブル:');
    for (const [name, id] of Object.entries(tableIds)) {
      console.log(`   - ${name}: ${id}`);
    }

    console.log('\n# .env に追加する設定:');
    console.log(`DOCUGENIUS_LARK_BASE_APP_TOKEN=${appToken}`);
    console.log(`DOCUGENIUS_LARK_BASE_URL=${url}`);
    for (const [name, id] of Object.entries(tableIds)) {
      const envKey = name.replace(/[^a-zA-Z]/g, '_').toUpperCase();
      console.log(`DOCUGENIUS_TABLE_${envKey}=${id}`);
    }

  } catch (error) {
    console.error('❌ エラー:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
