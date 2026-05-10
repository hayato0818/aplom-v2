
create extension if not exists pgcrypto;

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  shopify_customer_id text unique,
  name text,
  email text,
  total_orders int default 0,
  total_spent numeric default 0,
  ltv numeric default 0,
  segment text,
  first_order_at timestamp,
  last_order_at timestamp,
  created_at timestamp default now()
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  shopify_order_id text unique,
  customer_id uuid references customers(id),
  order_number text,
  subtotal numeric default 0,
  discount numeric default 0,
  shipping numeric default 0,
  tax numeric default 0,
  total numeric default 0,
  profit numeric default 0,
  source text,
  utm_source text,
  utm_campaign text,
  device text,
  is_first_order boolean default false,
  ordered_at timestamp,
  created_at timestamp default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  shopify_product_id text unique,
  title text,
  category text,
  price numeric default 0,
  cost numeric default 0,
  margin numeric default 0,
  inventory int default 0,
  repeat_rate numeric default 0,
  ltv_contribution numeric default 0,
  created_at timestamp default now()
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id),
  product_id uuid references products(id),
  variant_id text,
  quantity int default 1,
  price numeric default 0,
  cost numeric default 0,
  profit numeric default 0,
  created_at timestamp default now()
);

create table if not exists ad_metrics (
  id uuid primary key default gen_random_uuid(),
  platform text,
  campaign_name text,
  date date,
  impressions int default 0,
  clicks int default 0,
  spend numeric default 0,
  revenue numeric default 0,
  roas numeric default 0,
  cpa numeric default 0,
  ctr numeric default 0,
  cvr numeric default 0,
  created_at timestamp default now()
);

create table if not exists insight_logs (
  id uuid primary key default gen_random_uuid(),
  title text,
  description text,
  confidence_score numeric,
  impact_score numeric,
  priority text,
  supporting_data jsonb,
  recommendation text,
  created_at timestamp default now()
);

create table if not exists hypothesis_tests (
  id uuid primary key default gen_random_uuid(),
  hypothesis text,
  confidence_score numeric,
  verdict text,
  supporting_data jsonb,
  recommendation text,
  created_at timestamp default now()
);
