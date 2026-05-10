# APLOM AI Dashboard

APLOMのShopifyストア向けAIダッシュボードです。

## セットアップ手順

### 1. Vercelにデプロイする
このプロジェクトをGitHubにアップして、Vercelと接続するだけで動きます。
詳しい手順はClaudeに聞きながら進めてください。

### 2. 環境変数を設定する（Vercelの管理画面で）

| 変数名 | 説明 |
|--------|------|
| `SHOPIFY_STORE_DOMAIN` | aplom.myshopify.com |
| `SHOPIFY_ADMIN_ACCESS_TOKEN` | Shopify管理画面で取得 |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabaseのプロジェクトページで確認 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabaseのプロジェクトページで確認 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabaseのプロジェクトページで確認 |
| `ANTHROPIC_API_KEY` | console.anthropic.comで取得 |

### 3. Supabaseにテーブルを作成する
`supabase/migration.sql` と `supabase/migration_v2.sql` をSupabaseのSQL Editorで実行。

### 4. データを同期する
ダッシュボードの「設定」ページから「全件同期」ボタンを押す。
v2
