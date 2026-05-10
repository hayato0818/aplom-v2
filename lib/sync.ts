/**
 * lib/sync.ts
 * Shopify → Supabase 同期オーケストレーター
 *
 * 流れ:
 *   1. 商品・バリアント・仕入れコストを取得 → products テーブルに upsert
 *   2. 注文を取得（差分同期対応）
 *   3. 注文から顧客データを抽出 → customers テーブルに upsert
 *   4. 注文を orders テーブルに upsert
 *   5. 注文明細を order_items テーブルに upsert
 *   6. 全顧客の RFM スコア・LTV を再計算 → customers テーブルに反映
 *   7. 商品のリピート率を再計算 → products テーブルに反映
 *   8. 同期ログを sync_logs テーブルに記録
 */

import { createClient } from '@supabase/supabase-js'
import {
  fetchOrders, fetchProducts, fetchInventoryCosts,
  parseUtm, parseDevice,
  type ShopifyOrder, type ShopifyProduct,
} from './shopify'
import {
  calculateRFM, calculateLtv, calculateRepeatRate,
  calcProfit, calcMargin,
  type RfmInput, type OrderForLtv, type OrderItemForRepeat,
} from './analytics'

// ─── Supabase クライアント ───────────────────────────────────────────────────

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ─── 同期結果の型 ────────────────────────────────────────────────────────────

export type SyncResult = {
  success: boolean
  mode: 'full' | 'incremental'
  duration_ms: number
  stats: {
    products_upserted: number
    orders_upserted: number
    customers_upserted: number
    order_items_upserted: number
    customers_rfm_updated: number
  }
  error?: string
  synced_at: string
}

// ─── メイン同期関数 ──────────────────────────────────────────────────────────

/**
 * Shopify → Supabase 同期を実行
 * @param mode 'full' = 全件, 'incremental' = 前回同期以降の差分
 */
export async function runSync(mode: 'full' | 'incremental' = 'incremental'): Promise<SyncResult> {
  const supabase = getSupabase()
  const startedAt = Date.now()
  const synced_at = new Date().toISOString()

  const stats = {
    products_upserted: 0,
    orders_upserted: 0,
    customers_upserted: 0,
    order_items_upserted: 0,
    customers_rfm_updated: 0,
  }

  try {
    // ── 差分同期の基準日時を取得 ─────────────────────────────────────────────
    let updatedAtMin: string | undefined
    if (mode === 'incremental') {
      const { data: lastSync } = await supabase
        .from('sync_logs')
        .select('synced_at')
        .eq('status', 'success')
        .order('synced_at', { ascending: false })
        .limit(1)
        .single()
      updatedAtMin = lastSync?.synced_at ?? undefined
    }

    // ── STEP 1: 商品同期 ──────────────────────────────────────────────────────
    const products = await fetchProducts()
    const variantInventoryIds = products
      .flatMap(p => p.variants.map(v => v.inventory_item_id))
    const costMap = await fetchInventoryCosts(variantInventoryIds)

    for (const product of products) {
      // 代表バリアントのコストで商品原価を決定（最初のバリアントを使用）
      const firstVariant = product.variants[0]
      const cost = firstVariant ? (costMap.get(firstVariant.inventory_item_id) ?? null) : null
      const price = firstVariant ? parseFloat(firstVariant.price) : 0
      const margin = calcMargin(price, cost)

      const { error } = await supabase.from('products').upsert({
        shopify_product_id: String(product.id),
        title: product.title,
        category: product.product_type || null,
        price,
        cost,
        margin,
        inventory: product.variants.reduce((sum, v) => sum + v.inventory_quantity, 0),
      }, { onConflict: 'shopify_product_id' })

      if (!error) stats.products_upserted++
    }

    // 商品ID → Supabase UUID のマップを取得
    const { data: productRows } = await supabase
      .from('products')
      .select('id, shopify_product_id')
    const productIdMap = new Map<string, string>(
      (productRows ?? []).map(r => [r.shopify_product_id, r.id])
    )

    // バリアントID → コスト のマップ（order_items の profit 計算用）
    const variantCostMap = new Map<string, number>()
    for (const product of products) {
      for (const variant of product.variants) {
        const cost = costMap.get(variant.inventory_item_id)
        if (cost != null) {
          variantCostMap.set(String(variant.id), cost)
        }
      }
    }

    // ── STEP 2: 注文取得 ──────────────────────────────────────────────────────
    const orders = await fetchOrders(updatedAtMin)
    if (orders.length === 0) {
      await logSync(supabase, mode, 'success', stats, synced_at, Date.now() - startedAt)
      return { success: true, mode, duration_ms: Date.now() - startedAt, stats, synced_at }
    }

    // ── STEP 3: 顧客 upsert ───────────────────────────────────────────────────
    const customerOrderCounts = new Map<string, number>()
    const customerTotalSpent  = new Map<string, number>()
    const customerFirstOrder  = new Map<string, Date>()
    const customerLastOrder   = new Map<string, Date>()
    const customerNames       = new Map<string, { name: string; email: string }>()

    for (const order of orders) {
      if (!order.customer) continue
      const cid = String(order.customer.id)
      const orderedAt = new Date(order.created_at)
      const total = parseFloat(order.total_price)

      customerOrderCounts.set(cid, (customerOrderCounts.get(cid) ?? 0) + 1)
      customerTotalSpent.set(cid,  (customerTotalSpent.get(cid)  ?? 0) + total)
      if (!customerFirstOrder.has(cid) || orderedAt < customerFirstOrder.get(cid)!) {
        customerFirstOrder.set(cid, orderedAt)
      }
      if (!customerLastOrder.has(cid) || orderedAt > customerLastOrder.get(cid)!) {
        customerLastOrder.set(cid, orderedAt)
      }
      if (!customerNames.has(cid)) {
        customerNames.set(cid, {
          name: [order.customer.first_name, order.customer.last_name].filter(Boolean).join(' '),
          email: order.customer.email,
        })
      }
    }

    for (const [shopifyCustomerId, info] of customerNames) {
      const { error } = await supabase.from('customers').upsert({
        shopify_customer_id: shopifyCustomerId,
        name:  info.name,
        email: info.email,
        total_orders: customerOrderCounts.get(shopifyCustomerId) ?? 0,
        total_spent:  customerTotalSpent.get(shopifyCustomerId)  ?? 0,
        first_order_at: customerFirstOrder.get(shopifyCustomerId)?.toISOString(),
        last_order_at:  customerLastOrder.get(shopifyCustomerId)?.toISOString(),
      }, { onConflict: 'shopify_customer_id', ignoreDuplicates: false })

      if (!error) stats.customers_upserted++
    }

    // 顧客ID → Supabase UUID のマップを取得
    const { data: customerRows } = await supabase
      .from('customers')
      .select('id, shopify_customer_id')
    const customerIdMap = new Map<string, string>(
      (customerRows ?? []).map(r => [r.shopify_customer_id, r.id])
    )

    // ── STEP 4: 注文 upsert ───────────────────────────────────────────────────
    for (const order of orders) {
      const customerId     = order.customer ? customerIdMap.get(String(order.customer.id)) : null
      const { utm_source, utm_campaign, channel } = parseUtm(order.landing_site)
      const device         = parseDevice(order.client_details?.user_agent ?? null)
      const subtotal       = parseFloat(order.subtotal_price)
      const discount       = parseFloat(order.total_discounts)
      const shipping       = parseFloat(order.total_shipping_price_set?.shop_money?.amount ?? '0')
      const tax            = parseFloat(order.total_tax)
      const total          = parseFloat(order.total_price)

      const { data: existingOrders } = await supabase
        .from('orders')
        .select('id')
        .eq('shopify_order_id', String(order.id))
        .single()

      const isFirstOrder = existingOrders == null &&
        customerOrderCounts.get(String(order.customer?.id)) === 1

      const { data: insertedOrder, error } = await supabase
        .from('orders')
        .upsert({
          shopify_order_id: String(order.id),
          customer_id:      customerId,
          order_number:     String(order.order_number),
          subtotal,
          discount,
          shipping,
          tax,
          total,
          source:           channel,
          utm_source,
          utm_campaign,
          device,
          is_first_order:   isFirstOrder,
          ordered_at:       new Date(order.created_at).toISOString(),
        }, { onConflict: 'shopify_order_id' })
        .select('id')
        .single()

      if (!error && insertedOrder) stats.orders_upserted++

      // ── STEP 5: 注文明細 upsert ──────────────────────────────────────────────
      if (insertedOrder) {
        for (const item of order.line_items) {
          const productId   = item.product_id ? productIdMap.get(String(item.product_id)) : null
          const itemRevenue = parseFloat(item.price) * item.quantity
          const itemCost    = item.variant_id
            ? (variantCostMap.get(String(item.variant_id)) ?? null)
            : null
          const itemProfit  = calcProfit(itemRevenue, itemCost)

          const { error: itemError } = await supabase.from('order_items').upsert({
            order_id:   insertedOrder.id,
            product_id: productId,
            variant_id: item.variant_id ? String(item.variant_id) : null,
            quantity:   item.quantity,
            price:      itemRevenue,
            cost:       itemCost ? itemCost * item.quantity : null,
            profit:     itemProfit,
          }, { onConflict: 'order_id,variant_id' })

          if (!itemError) stats.order_items_upserted++
        }
      }
    }

    // ── STEP 6: RFM・LTV 再計算（全顧客） ────────────────────────────────────
    const { data: allOrders } = await supabase
      .from('orders')
      .select('customer_id, total, ordered_at')

    if (allOrders) {
      // LTV 計算
      const ltvInputs: OrderForLtv[] = allOrders
        .filter(o => o.customer_id)
        .map(o => ({
          customer_id: o.customer_id,
          total: parseFloat(o.total),
          ordered_at: new Date(o.ordered_at),
        }))
      const ltvMap = calculateLtv(ltvInputs, 90)

      // RFM 計算用データを顧客テーブルから取得
      const { data: allCustomers } = await supabase
        .from('customers')
        .select('id, shopify_customer_id, total_orders, total_spent, last_order_at')

      if (allCustomers) {
        const rfmInputs: RfmInput[] = allCustomers.map(c => ({
          shopify_customer_id: c.shopify_customer_id,
          total_orders: c.total_orders,
          total_spent:  c.total_spent,
          days_since_last_order: c.last_order_at
            ? Math.floor((Date.now() - new Date(c.last_order_at).getTime()) / 86400000)
            : 9999,
        }))

        const rfmResults = calculateRFM(rfmInputs)

        // 一括更新
        for (const rfm of rfmResults) {
          const customerId = allCustomers.find(
            c => c.shopify_customer_id === rfm.shopify_customer_id
          )?.id
          if (!customerId) continue

          const ltv = ltvMap.get(customerId) ?? 0

          const { error } = await supabase
            .from('customers')
            .update({ segment: rfm.segment, ltv })
            .eq('id', customerId)

          if (!error) stats.customers_rfm_updated++
        }
      }
    }

    // ── STEP 7: 商品リピート率を再計算 ────────────────────────────────────────
    const { data: allOrderItems } = await supabase
      .from('order_items')
      .select('product_id, order_id, orders(customer_id, ordered_at)')

    if (allOrderItems) {
      const repeatInputs: OrderItemForRepeat[] = allOrderItems
        .filter(i => i.product_id && i.orders)
        .map(i => ({
          customer_id: (i.orders as any).customer_id,
          product_id:  i.product_id,
          ordered_at:  new Date((i.orders as any).ordered_at),
        }))
        .filter(i => i.customer_id)

      const repeatMap = calculateRepeatRate(repeatInputs)

      for (const [shopifyProductId, repeatRate] of repeatMap) {
        await supabase
          .from('products')
          .update({ repeat_rate: repeatRate })
          .eq('shopify_product_id', shopifyProductId)
      }
    }

    // ── STEP 8: 同期ログ記録 ─────────────────────────────────────────────────
    await logSync(supabase, mode, 'success', stats, synced_at, Date.now() - startedAt)

    return {
      success: true,
      mode,
      duration_ms: Date.now() - startedAt,
      stats,
      synced_at,
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    await logSync(supabase, mode, 'error', stats, synced_at, Date.now() - startedAt, errorMessage)
    return {
      success: false,
      mode,
      duration_ms: Date.now() - startedAt,
      stats,
      error: errorMessage,
      synced_at,
    }
  }
}

// ─── ログ記録 ────────────────────────────────────────────────────────────────

async function logSync(
  supabase: ReturnType<typeof createClient>,
  mode: string,
  status: 'success' | 'error',
  stats: Record<string, number>,
  synced_at: string,
  duration_ms: number,
  error?: string
) {
  await supabase.from('sync_logs').insert({
    mode,
    status,
    stats,
    error: error ?? null,
    synced_at,
    duration_ms,
  })
}
