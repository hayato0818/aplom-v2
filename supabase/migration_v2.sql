-- supabase/migration_v2.sql
-- 同期ログテーブル + パフォーマンス改善インデックス

-- ─── sync_logs テーブル ────────────────────────────────────────────────────────
create table if not exists sync_logs (
  id           uuid primary key default gen_random_uuid(),
  mode         text not null,                        -- 'full' | 'incremental'
  status       text not null,                        -- 'success' | 'error'
  stats        jsonb default '{}',                   -- 各エンティティの件数
  error        text,                                 -- エラーメッセージ（失敗時）
  duration_ms  int default 0,                        -- 処理時間（ミリ秒）
  synced_at    timestamp not null,                   -- 同期開始日時
  created_at   timestamp default now()
);

-- 差分同期用に直近の成功ログを高速に取得するインデックス
create index if not exists idx_sync_logs_status_synced
  on sync_logs (status, synced_at desc);

-- ─── order_items: 一意制約 ────────────────────────────────────────────────────
-- Webhook 経由の upsert で使用する複合ユニーク制約
-- （既存テーブルへの追加）
alter table order_items
  drop constraint if exists uq_order_items_order_variant;

alter table order_items
  add constraint uq_order_items_order_variant
  unique (order_id, variant_id);

-- ─── パフォーマンス インデックス ────────────────────────────────────────────────

-- 注文：顧客ごとの集計に使用
create index if not exists idx_orders_customer_id
  on orders (customer_id);

-- 注文：日付範囲での絞り込みに使用
create index if not exists idx_orders_ordered_at
  on orders (ordered_at desc);

-- 注文：流入チャネル別の集計に使用
create index if not exists idx_orders_source
  on orders (source);

-- 注文明細：商品ごとの集計に使用
create index if not exists idx_order_items_product_id
  on order_items (product_id);

-- 顧客：セグメント別の絞り込みに使用
create index if not exists idx_customers_segment
  on customers (segment);

-- 顧客：LTV 降順ランキングに使用
create index if not exists idx_customers_ltv
  on customers (ltv desc);

-- ─── コホート用ビュー（省略可能） ────────────────────────────────────────────
create or replace view v_customer_orders as
select
  o.id            as order_id,
  o.customer_id,
  o.total,
  o.ordered_at,
  c.first_order_at,
  c.segment,
  c.ltv
from orders o
join customers c on c.id = o.customer_id;

-- ─── 利用統計ビュー（ダッシュボードの概要カードで使用） ──────────────────────
create or replace view v_daily_stats as
select
  date_trunc('day', ordered_at)::date as date,
  count(*)                            as order_count,
  sum(total)                          as revenue,
  sum(profit)                         as profit,
  count(distinct customer_id)         as unique_customers
from orders
where ordered_at >= now() - interval '90 days'
group by 1
order by 1 desc;
