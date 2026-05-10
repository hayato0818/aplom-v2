/**
 * app/api/shopify/sync/route.ts
 * Shopifyのデータ取得してSupabaseに保存するエンドポイント
 *
 * 使い方：
 *   POST /api/shopify/sync         → 差分同期（前回以降の更新分のみ）
 *   POST /api/shopify/sync?mode=full → 全件同期
 */
import { NextRequest, NextResponse } from 'next/server'
import { runSync } from '@/lib/sync'

export const maxDuration = 300

export async function POST(req: NextRequest) {
  // 認証チェック
  const secret = process.env.SYNC_SECRET
  if (secret) {
    const auth = req.headers.get('Authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: '認証エラー' }, { status: 401 })
    }
  }

  // 環境変数チェック
  const missing = ['SHOPIFY_STORE_DOMAIN', 'SHOPIFY_ADMIN_ACCESS_TOKEN',
    'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'].filter(k => !process.env[k])
  if (missing.length) {
    return NextResponse.json({ error: `環境変数が未設定: ${missing.join(', ')}` }, { status: 500 })
  }

  const url   = new URL(req.url)
  const mode  = url.searchParams.get('mode') === 'full' ? 'full' : 'incremental'
  const result = await runSync(mode)

  return NextResponse.json(result, { status: result.success ? 200 : 500 })
}

// 同期ログを確認
export async function GET() {
  const { createClient } = await import('@supabase/supabase-js')
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data } = await sb.from('sync_logs').select('*').order('synced_at', { ascending: false }).limit(10)
  return NextResponse.json({ logs: data ?? [] })
}
