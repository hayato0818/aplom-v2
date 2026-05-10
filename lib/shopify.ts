/**
 * lib/shopify.ts
 * Shopify Admin REST API クライアント
 * - 全ページ自動取得（Link ヘッダーによるカーソルページネーション）
 * - 注文・顧客・商品・在庫コストを取得
 */

const API_VERSION = '2025-01'

// ─── ヘルパー ────────────────────────────────────────────────────────────────

function url(path: string) {
  const domain = process.env.SHOPIFY_STORE_DOMAIN
  if (!domain) throw new Error('SHOPIFY_STORE_DOMAIN が未設定です')
  return `https://${domain}/admin/api/${API_VERSION}${path}`
}

function headers(): HeadersInit {
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN
  if (!token) throw new Error('SHOPIFY_ADMIN_ACCESS_TOKEN が未設定です')
  return {
    'X-Shopify-Access-Token': token,
    'Content-Type': 'application/json',
  }
}

/** Link ヘッダーから次ページの page_info を取得 */
function parseNextPageInfo(link: string | null): string | null {
  if (!link) return null
  const m = link.match(/<[^>]*[?&]page_info=([^&>]+)[^>]*>;\s*rel="next"/)
  return m ? m[1] : null
}

/** 全ページを自動で取得 */
async function fetchAll<T>(
  path: string,
  key: string,
  params: Record<string, string> = {}
): Promise<T[]> {
  const results: T[] = []
  const qs = new URLSearchParams({ limit: '250', ...params }).toString()
  let nextUrl: string | null = `${url(path)}?${qs}`

  while (nextUrl) {
    const res = await fetch(nextUrl, { headers: headers(), cache: 'no-store' })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Shopify API ${res.status}: ${body}`)
    }
    const data = await res.json()
    results.push(...(data[key] ?? []))

    const pageInfo = parseNextPageInfo(res.headers.get('Link'))
    nextUrl = pageInfo ? `${url(path)}?limit=250&page_info=${pageInfo}` : null
  }

  return results
}

// ─── 型定義 ──────────────────────────────────────────────────────────────────

export type ShopifyLineItem = {
  id: number
  product_id: number | null
  variant_id: number | null
  title: string
  quantity: number
  price: string          // "12800.00"
  total_discount: string
  sku: string
}

export type ShopifyOrder = {
  id: number
  order_number: number
  customer: {
    id: number
    email: string
    first_name: string
    last_name: string
  } | null
  line_items: ShopifyLineItem[]
  subtotal_price: string
  total_discounts: string
  total_shipping_price_set: { shop_money: { amount: string } }
  total_tax: string
  total_price: string
  source_name: string           // "web" | "pos" | "iphone" | "android"
  landing_site: string | null   // "/?utm_source=instagram&utm_medium=paid&utm_campaign=summer"
  referring_site: string | null
  client_details: {
    user_agent: string | null
    browser_ip: string | null
  } | null
  financial_status: string      // "paid" | "refunded" | "partially_refunded"
  fulfillment_status: string | null
  cancelled_at: string | null
  created_at: string
  updated_at: string
}

export type ShopifyCustomer = {
  id: number
  email: string
  first_name: string
  last_name: string
  orders_count: number
  total_spent: string
  created_at: string
  updated_at: string
  tags: string
}

export type ShopifyProduct = {
  id: number
  title: string
  product_type: string
  tags: string
  variants: ShopifyVariant[]
  created_at: string
}

export type ShopifyVariant = {
  id: number
  product_id: number
  title: string
  price: string
  sku: string
  inventory_item_id: number
  inventory_quantity: number
}

export type ShopifyInventoryItem = {
  id: number
  cost: string | null   // 仕入れ原価（設定している場合のみ）
  tracked: boolean
}

// ─── API 関数 ────────────────────────────────────────────────────────────────

/** 注文を全件取得（差分同期対応）
 * @param updatedAtMin ISO8601文字列。指定するとその日時以降の更新分のみ取得
 */
export async function fetchOrders(updatedAtMin?: string): Promise<ShopifyOrder[]> {
  const params: Record<string, string> = { status: 'any' }
  if (updatedAtMin) params['updated_at_min'] = updatedAtMin

  return fetchAll<ShopifyOrder>('/orders.json', 'orders', params)
}

/** 顧客を全件取得 */
export async function fetchCustomers(updatedAtMin?: string): Promise<ShopifyCustomer[]> {
  const params: Record<string, string> = {}
  if (updatedAtMin) params['updated_at_min'] = updatedAtMin
  return fetchAll<ShopifyCustomer>('/customers.json', 'customers', params)
}

/** 商品を全件取得（バリアント含む） */
export async function fetchProducts(): Promise<ShopifyProduct[]> {
  return fetchAll<ShopifyProduct>('/products.json', 'products')
}

/** 在庫アイテムのコスト（仕入れ原価）を取得
 * 100件ずつバッチで処理（API 制限対策）
 */
export async function fetchInventoryCosts(
  inventoryItemIds: number[]
): Promise<Map<number, number>> {
  const costMap = new Map<number, number>()
  const BATCH = 100

  for (let i = 0; i < inventoryItemIds.length; i += BATCH) {
    const batch = inventoryItemIds.slice(i, i + BATCH)
    const idsParam = batch.join(',')
    const res = await fetch(
      `${url('/inventory_items.json')}?ids=${idsParam}`,
      { headers: headers(), cache: 'no-store' }
    )
    if (!res.ok) continue

    const data = await res.json()
    for (const item of data.inventory_items ?? []) {
      if (item.cost != null) {
        costMap.set(item.id, parseFloat(item.cost))
      }
    }

    // Shopify API レートリミット対策（2 req/sec）
    if (i + BATCH < inventoryItemIds.length) {
      await new Promise(r => setTimeout(r, 500))
    }
  }

  return costMap
}

// ─── UTM / デバイス パース ───────────────────────────────────────────────────

/** landing_site URL から UTM パラメータを取得 */
export function parseUtm(landingSite: string | null): {
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  channel: string
} {
  const empty = { utm_source: null, utm_medium: null, utm_campaign: null, channel: 'direct' }
  if (!landingSite) return empty

  try {
    // 相対URLの場合はダミードメインを付与してパース
    const fullUrl = landingSite.startsWith('http')
      ? landingSite
      : `https://placeholder.com${landingSite}`
    const params = new URL(fullUrl).searchParams

    const utm_source   = params.get('utm_source')
    const utm_medium   = params.get('utm_medium')
    const utm_campaign = params.get('utm_campaign')

    // チャネル分類
    let channel = 'organic'
    if (utm_source) {
      const src = utm_source.toLowerCase()
      if (['meta', 'facebook', 'instagram'].includes(src))  channel = 'meta'
      else if (src === 'tiktok')                             channel = 'tiktok'
      else if (['google', 'google_ads'].includes(src))       channel = 'google'
      else if (src === 'line')                               channel = 'line'
      else if (utm_medium === 'email')                       channel = 'email'
      else                                                   channel = src
    }

    return { utm_source, utm_medium, utm_campaign, channel }
  } catch {
    return empty
  }
}

/** User-Agent からデバイスタイプを推定 */
export function parseDevice(userAgent: string | null): string {
  if (!userAgent) return 'unknown'
  const ua = userAgent.toLowerCase()
  if (/(iphone|android|mobile)/.test(ua)) return 'mobile'
  if (/(ipad|tablet)/.test(ua)) return 'tablet'
  return 'desktop'
}
