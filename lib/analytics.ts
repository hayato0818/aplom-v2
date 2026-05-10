/**
 * lib/analytics.ts
 * RFM スコア・LTV・リピート率・コホートの計算ロジック
 */

// ─── RFM スコアリング ────────────────────────────────────────────────────────

export type RfmInput = {
  shopify_customer_id: string
  total_orders: number
  total_spent: number
  days_since_last_order: number
}

export type RfmResult = RfmInput & {
  r: number
  f: number
  m: number
  rfm_score: number
  segment: string
}

/** Recency スコア（最近 = 高スコア） */
function scoreR(days: number): number {
  if (days <= 7)  return 5
  if (days <= 30) return 4
  if (days <= 60) return 3
  if (days <= 90) return 2
  return 1
}

/** Frequency スコア（多い = 高スコア） */
function scoreF(orders: number): number {
  if (orders >= 10) return 5
  if (orders >= 5)  return 4
  if (orders >= 3)  return 3
  if (orders >= 2)  return 2
  return 1
}

/** Monetary スコア（高額 = 高スコア、JPY基準） */
function scoreM(spent: number): number {
  if (spent >= 100000) return 5
  if (spent >= 50000)  return 4
  if (spent >= 20000)  return 3
  if (spent >= 10000)  return 2
  return 1
}

/** セグメント分類 */
function segment(r: number, f: number, m: number, score: number): string {
  if (score >= 12 && f >= 4)          return 'VIP'
  if (score >= 9)                     return 'Loyal'
  if (r <= 2 && f >= 3)              return 'Churn Risk'
  if (f === 1 && r >= 4)             return 'New'
  return 'Normal'
}

/** 顧客リストに RFM スコアを付与 */
export function calculateRFM(customers: RfmInput[]): RfmResult[] {
  return customers.map(c => {
    const r = scoreR(c.days_since_last_order)
    const f = scoreF(c.total_orders)
    const m = scoreM(c.total_spent)
    const rfm_score = r + f + m
    return {
      ...c,
      r, f, m,
      rfm_score,
      segment: segment(r, f, m, rfm_score),
    })
  })
}

// ─── LTV 計算 ────────────────────────────────────────────────────────────────

export type OrderForLtv = {
  customer_id: string
  total: number
  ordered_at: Date
}

/**
 * 顧客ごとの N 日間 LTV を計算
 * @param orders 全注文リスト
 * @param days   集計期間（デフォルト 90 日）
 */
export function calculateLtv(
  orders: OrderForLtv[],
  days = 90
): Map<string, number> {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  const ltvMap = new Map<string, number>()

  for (const order of orders) {
    if (order.ordered_at < cutoff) continue
    const cur = ltvMap.get(order.customer_id) ?? 0
    ltvMap.set(order.customer_id, cur + order.total)
  })

  return ltvMap
}

// ─── リピート率（商品別） ───────────────────────────────────────────────────

export type OrderItemForRepeat = {
  customer_id: string
  product_id: string
  ordered_at: Date
}

/**
 * 商品ごとのリピート購入率（%）を計算
 * 「その商品を1回以上購入した顧客のうち、2回以上購入した割合」
 */
export function calculateRepeatRate(
  items: OrderItemForRepeat[]
): Map<string, number> {
  // 商品 → 顧客 → 購入回数
  const map = new Map<string, Map<string, number>>()

  for (const item of items) {
    if (!map.has(item.product_id)) map.set(item.product_id, new Map())
    const cmap = map.get(item.product_id)!
    cmap.set(item.customer_id, (cmap.get(item.customer_id) ?? 0) + 1)
  })

  const repeatRates = new Map<string, number>()
  Array.from(map.entries()).forEach(([productId, customerMap]) => {
    const total   = customerMap.size
    const repeat  = [...customerMap.values()].filter(n => n >= 2).length
    repeatRates.set(productId, total > 0 ? Math.round((repeat / total) * 100) : 0)
  })

  return repeatRates
}

// ─── コホート分析 ────────────────────────────────────────────────────────────

export type CohortOrder = {
  customer_id: string
  ordered_at: Date
  first_order_at: Date
}

export type CohortRow = {
  cohort: string        // "2025-01" 形式
  month_index: number   // 0, 1, 2, ...
  retention: number     // %（小数なし）
  customer_count: number
}

/**
 * 月次コホートリテンション率を計算
 * @param orders first_order_at を含む注文リスト
 */
export function calculateCohort(orders: CohortOrder[]): CohortRow[] {
  // コホート（初回購入月）ごとに顧客セットを構築
  const cohortCustomers = new Map<string, Set<string>>()
  const cohortOrders    = new Map<string, Map<number, Set<string>>>() // cohort → month_index → customers

  for (const order of orders) {
    const cohortKey = toYearMonth(order.first_order_at)
    const monthIdx  = monthDiff(order.first_order_at, order.ordered_at)

    // コホートの顧客セット
    if (!cohortCustomers.has(cohortKey)) cohortCustomers.set(cohortKey, new Set())
    cohortCustomers.get(cohortKey)!.add(order.customer_id)

    // 月ごとの購入顧客セット
    if (!cohortOrders.has(cohortKey))   cohortOrders.set(cohortKey, new Map())
    const byMonth = cohortOrders.get(cohortKey)!
    if (!byMonth.has(monthIdx))         byMonth.set(monthIdx, new Set())
    byMonth.get(monthIdx)!.add(order.customer_id)
  })

  const rows: CohortRow[] = []
  for (const [cohort, customers] of cohortCustomers) {
    const baseCount = customers.size
    const byMonth   = cohortOrders.get(cohort) ?? new Map()

    // 最大 6 ヶ月分
    for (let m = 0; m <= 5; m++) {
      const monthCustomers = byMonth.get(m)?.size ?? 0
      rows.push({
        cohort,
        month_index: m,
        retention: m === 0 ? 100 : Math.round((monthCustomers / baseCount) * 100),
        customer_count: m === 0 ? baseCount : monthCustomers,
      })
    })
  })

  return rows.sort((a, b) => a.cohort.localeCompare(b.cohort) || a.month_index - b.month_index)
}

// ─── ユーティリティ ──────────────────────────────────────────────────────────

function toYearMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function monthDiff(from: Date, to: Date): number {
  return (
    (to.getFullYear() - from.getFullYear()) * 12 +
    (to.getMonth() - from.getMonth())
  )
}

/** 粗利額を計算（原価が不明な場合は 0 を返す） */
export function calcProfit(revenue: number, cost: number | null): number {
  if (cost == null) return 0
  return revenue - cost
}

/** 粗利率 % */
export function calcMargin(revenue: number, cost: number | null): number {
  if (!cost || revenue === 0) return 0
  return Math.round(((revenue - cost) / revenue) * 100)
}
