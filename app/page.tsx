'use client'
/**
 * app/page.tsx
 * APLOM AI ダッシュボード メインページ
 */
import { useState, useEffect, useRef } from 'react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts'
import {
  LayoutDashboard, Users, Package, TrendingUp, Zap,
  FlaskConical, Settings, ArrowUpRight, ArrowDownRight,
  Loader2, Sparkles, ChevronRight, CheckCircle, Play,
  AlertCircle, HelpCircle, Brain, Search, X, ArrowRight,
  TrendingDown, Minus, RefreshCw, Lightbulb, BarChart2,
} from 'lucide-react'

// ─── モックデータ ─────────────────────────────────────────────────────────────
const REV_DATA = [
  { m: '11月', rev: 2840, profit: 920 }, { m: '12月', rev: 3120, profit: 1040 },
  { m: '1月',  rev: 2650, profit: 830  }, { m: '2月',  rev: 3380, profit: 1150 },
  { m: '3月',  rev: 3710, profit: 1290 }, { m: '4月',  rev: 3820, profit: 1340 },
]
const PLATFORM_DATA = [
  { name: 'LINE', roas: 6.4, ltv: 26800, spend: 280 },
  { name: 'Google', roas: 5.8, ltv: 15300, spend: 610 },
  { name: 'Meta', roas: 4.2, ltv: 18400, spend: 820 },
  { name: 'TikTok', roas: 3.1, ltv: 22100, spend: 340 },
]
const LTV_DATA = [
  { ch: 'Organic', ltv: 31200 }, { ch: 'LINE', ltv: 26800 },
  { ch: 'TikTok', ltv: 22100 }, { ch: 'Meta', ltv: 18400 }, { ch: 'Google', ltv: 15300 },
]
const PRODUCTS = [
  { name: 'プレミアムセット A',  rev: 1240, margin: 68, repeat: 72 },
  { name: 'デイリーケアキット', rev: 840,  margin: 54, repeat: 61 },
  { name: 'ナイトセラム 30ml',  rev: 620,  margin: 71, repeat: 58 },
  { name: 'モイスチャーミスト', rev: 480,  margin: 62, repeat: 44 },
  { name: 'SPFクリーム SPF50',  rev: 380,  margin: 49, repeat: 38 },
  { name: 'クレンジングオイル', rev: 290,  margin: 57, repeat: 52 },
]
const SEGMENTS = [
  { seg: 'VIP', count: 124, ltv: 248000, color: '#f59e0b' },
  { seg: 'Loyal', count: 387, ltv: 124000, color: '#a78bfa' },
  { seg: 'Normal', count: 1240, ltv: 48000, color: '#60a5fa' },
  { seg: 'New', count: 2180, ltv: 12000, color: '#34d399' },
  { seg: 'Churn Risk', count: 318, ltv: 84000, color: '#f87171' },
]
const TOP_CUSTOMERS = [
  { name: '山田 太郎', ltv: 248000, orders: 12, last: '2日前',  seg: 'VIP'   },
  { name: '田中 花子', ltv: 184000, orders: 8,  last: '5日前',  seg: 'VIP'   },
  { name: '佐藤 健',   ltv: 156000, orders: 11, last: '1日前',  seg: 'VIP'   },
  { name: '鈴木 あい', ltv: 142000, orders: 7,  last: '3日前',  seg: 'Loyal' },
  { name: '伊藤 誠',   ltv: 128000, orders: 9,  last: '8日前',  seg: 'Loyal' },
  { name: '渡辺 奈々', ltv: 98000,  orders: 6,  last: '12日前', seg: 'Loyal' },
]
const INSIGHTS = [
  { p: 'S', conf: 94, impact: 95, ease: 80, urgency: 90,
    title: 'LINE登録者のLTVが2.1倍',
    body: '購入後3日以内のLINE登録顧客の90日LTVは¥31,200。非登録者¥14,800比で2.1倍高い。',
    action: '全注文サンクスページにLINE登録CTAを実装。目標：登録率28%→60%。' },
  { p: 'A', conf: 84, impact: 78, ease: 65, urgency: 72,
    title: 'TikTok流入はLTV換算でMeta超え',
    body: 'TikTok初回ROAS 3.1はMeta 4.2を下回るが、90日リピート率38%はMeta 22%を大幅に上回る。',
    action: 'TikTok予算を¥340K→¥500Kへ増額。2回目購入促進施策と連動。' },
  { p: 'A', conf: 88, impact: 70, ease: 85, urgency: 68,
    title: '水曜夜のカゴ落ち率が突出',
    body: 'カゴ落ち平均67%に対し水曜21〜23時は78%。この時間帯の流入は全体の12%を占める。',
    action: '水曜夜のリターゲ広告＋カゴ落ちメール（1時間後送信）を実装。' },
  { p: 'B', conf: 77, impact: 60, ease: 70, urgency: 55,
    title: 'ナイトセラム単品購入者のリピート余地',
    body: 'ナイトセラム単品のリピート率28%。デイリーケアキットとの同時購入者は61%と2倍超。',
    action: 'ナイトセラム購入者へのキット同梱オファー（¥500 OFF）を設計。' },
]
const COHORT = [
  { label: '1月', vals: [100, 38, 28, 22, 19]    },
  { label: '2月', vals: [100, 41, 31, 25, null]   },
  { label: '3月', vals: [100, 44, 33, null, null]  },
  { label: '4月', vals: [100, 47, null, null, null] },
]
const MOCK_CONTEXT = `
APLOMのEC店舗データ（直近90日）:
・月次売上: ¥3,820,000（前月比+11.2%） ・顧客数: 4,249（VIP 124 / Loyal 387 / Normal 1,240 / New 2,180 / Churn Risk 318）
・ROAS: Meta 4.2 / TikTok 3.1 / Google 5.8 / LINE 6.4
・90日LTV: Meta ¥18,400 / TikTok ¥22,100 / Google ¥15,300 / LINE ¥26,800 / Organic ¥31,200
・LINE登録者LTV: ¥31,200（非登録者¥14,800の2.1倍） ・カゴ落ち率: 平均67%（水曜21〜23時は78%）
・TikTok 90日リピート率: 38%、Meta: 22%、Google: 18% ・平均注文単価: ¥12,800
`
const VERIFY_STEPS = ['注文データを照合中', 'セグメント別推移を分析中', '前月比較を実行中', '改善トレンドを算出中']

// ─── ユーティリティ ───────────────────────────────────────────────────────────
const yen = (n: number) => `¥${Number(n).toLocaleString()}`

async function callClaude(prompt: string, maxTokens = 1000): Promise<any> {
  // APIキーはサーバー側（/api/claude）で管理するので安全
  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, maxTokens }),
  })
  const { text } = await res.json()
  return JSON.parse(text.replace(/```json\n?|```/g, '').trim())
}

// ─── スタイル ─────────────────────────────────────────────────────────────────
const SEG_STYLE: Record<string, { color: string; bg: string }> = {
  VIP:          { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
  Loyal:        { color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  Normal:       { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)'  },
  New:          { color: '#34d399', bg: 'rgba(52,211,153,0.12)'  },
  'Churn Risk': { color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
}
const PRI_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  S: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.3)'  },
  A: { color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.3)' },
  B: { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.3)'  },
  C: { color: '#6b7280', bg: 'rgba(107,114,128,0.12)', border: 'rgba(107,114,128,0.2)' },
}

// ─── 共通コンポーネント ───────────────────────────────────────────────────────
function Badge({ seg }: { seg: string }) {
  const s = SEG_STYLE[seg] || { color: '#9ca3af', bg: 'rgba(156,163,175,0.1)' }
  return <span className="text-xs px-2 py-0.5 rounded-full font-mono"
    style={{ color: s.color, backgroundColor: s.bg, border: `1px solid ${s.color}30` }}>{seg}</span>
}
function PBadge({ p }: { p: string }) {
  const s = PRI_STYLE[p] || PRI_STYLE.C
  return <span className="text-sm font-mono font-bold px-2.5 py-1 rounded-lg"
    style={{ color: s.color, backgroundColor: s.bg, border: `1px solid ${s.border}` }}>{p}</span>
}
function Kpi({ label, value, delta, pos, sub }: { label: string; value: string; delta?: string; pos?: boolean; sub?: string }) {
  const up = pos !== undefined ? pos : delta && !delta.startsWith('-')
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <p className="text-xs text-zinc-500 mb-3 tracking-widest uppercase">{label}</p>
      <p className="text-3xl font-bold text-zinc-100" style={{ fontFamily: 'Space Mono, monospace' }}>{value}</p>
      <div className="flex items-center gap-2 mt-2">
        {delta && <span className="text-xs font-mono flex items-center gap-0.5"
          style={{ color: up ? '#34d399' : '#f87171' }}>
          {up ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>}{delta}
        </span>}
        {sub && <p className="text-xs text-zinc-500">{sub}</p>}
      </div>
    </div>
  )
}
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-zinc-800 bg-zinc-900 p-6 ${className}`}>{children}</div>
}
function CardTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-base font-semibold text-zinc-100 mb-4">{children}</h2>
}
function SectionHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-7">
      <h1 className="text-3xl font-bold text-zinc-100" style={{ fontFamily: 'Syne, sans-serif' }}>{title}</h1>
      <p className="text-sm text-zinc-500 mt-1">{sub}</p>
    </div>
  )
}
function TT({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-xs" style={{ fontFamily: 'Space Mono, monospace' }}>
    <p className="text-zinc-500 mb-2">{label}</p>
    {payload.map((p: any, i: number) => <p key={i} style={{ color: p.color }}>{p.name}: {p.value}</p>)}
  </div>
}
function MiniBar({ label, val, color }: { label: string; val: number; color: string }) {
  return <div>
    <div className="flex justify-between text-xs text-zinc-500 mb-1">
      <span>{label}</span><span className="text-zinc-300" style={{ fontFamily: 'Space Mono, monospace' }}>{val}%</span>
    </div>
    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${val}%`, backgroundColor: color }}/>
    </div>
  </div>
}

// ─── 検索バー ─────────────────────────────────────────────────────────────────
function SearchBar({ setPage }: { setPage: (p: string) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]|null>(null)
  const [loading, setLoading] = useState(false)
  const PAGE_ICON: Record<string, React.ReactNode> = {
    overview: <LayoutDashboard size={13}/>, customers: <Users size={13}/>,
    products: <Package size={13}/>, marketing: <TrendingUp size={13}/>,
    insights: <Zap size={13}/>, 'hypothesis-lab': <FlaskConical size={13}/>,
  }
  const search = async () => {
    if (!query.trim()) return
    setLoading(true); setResults(null)
    try {
      const parsed = await callClaude(`APLOMのECダッシュボードで「${query}」に関する情報を探しています。どのページのどの指標を見ればよいかを提案してください。

ページ構成: overview（概要）, customers（顧客分析）, products（商品分析）, marketing（マーケティング）, insights（インサイト）, hypothesis-lab（仮説ラボ）

データ: ${MOCK_CONTEXT}

JSONのみで回答（最大3件）:
{"results":[{"pageId":"ページID","pageName":"日本語ページ名","metric":"指標名","description":"1文で説明","currentValue":"現在値（あれば）"}]}`, 500)
      setResults(parsed.results || [])
    } catch { setResults([]) }
    setLoading(false)
  }
  const clear = () => { setQuery(''); setResults(null) }
  return (
    <div className="mb-7">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600"/>
          <input type="text" value={query} onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
            placeholder="知りたい指標をキーワードで検索…　例：リピート率、TikTokのLTV、カゴ落ち"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 pl-9 pr-9 py-2.5 text-sm text-zinc-200 outline-none placeholder:text-zinc-600"
            style={{ fontFamily: 'inherit' }}/>
          {query && <button onClick={clear} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400"><X size={13}/></button>}
        </div>
        <button onClick={search} disabled={loading || !query.trim()}
          className="rounded-xl px-4 text-sm font-semibold text-white flex items-center gap-1.5 disabled:opacity-40"
          style={{ backgroundColor: '#3b82f6' }}>
          {loading ? <Loader2 size={13} className="animate-spin"/> : <Search size={13}/>} 検索
        </button>
      </div>
      {loading && <div className="mt-2.5 flex items-center gap-2 text-xs text-zinc-500"><Loader2 size={11} className="animate-spin text-blue-400"/>調べています…</div>}
      {results && results.length === 0 && <p className="mt-2.5 text-xs text-zinc-600">見つかりませんでした。別のキーワードをお試しください。</p>}
      {results && results.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {results.map((r, i) => (
            <button key={i} onClick={() => { setPage(r.pageId); clear() }}
              className="flex items-start gap-3 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-left transition-all group max-w-sm hover:border-blue-500/50">
              <span className="text-blue-400 mt-0.5 flex-shrink-0">{PAGE_ICON[r.pageId] || <BarChart2 size={13}/>}</span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-xs font-semibold text-zinc-200">{r.pageName}</span>
                  <span className="text-zinc-600 text-xs">›</span>
                  <span className="text-xs text-blue-400 font-mono">{r.metric}</span>
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed">{r.description}</p>
                {r.currentValue && <p className="text-xs font-mono text-amber-400 mt-1">{r.currentValue}</p>}
              </div>
              <ArrowRight size={12} className="text-zinc-700 group-hover:text-blue-400 flex-shrink-0 mt-0.5 transition-colors"/>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── インサイト検証パネル ─────────────────────────────────────────────────────
function InsightVerifyPanel({ ins, idx, state, onStart }: any) {
  const st = state[idx]; const step = st?.step ?? -1; const status = st?.status; const result = st?.result
  const tC = (t: string) => t === 'improving' ? '#34d399' : t === 'declining' ? '#f87171' : '#f59e0b'
  const tL = (t: string) => t === 'improving' ? '改善中' : t === 'declining' ? '悪化' : '横ばい'
  const TIcon = ({ t }: { t: string }) => t === 'improving' ? <TrendingUp size={14} style={{ color: '#34d399' }}/> : t === 'declining' ? <TrendingDown size={14} style={{ color: '#f87171' }}/> : <Minus size={14} style={{ color: '#f59e0b' }}/>
  return (
    <div className="mt-4 pt-4 border-t border-zinc-800">
      {!status && (
        <button onClick={() => onStart(ins, idx)} className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
          style={{ backgroundColor: 'rgba(96,165,250,0.1)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.3)' }}>
          <Play size={12}/> 検証開始
        </button>
      )}
      {status === 'running' && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-zinc-300">データ検証中...</span>
            <Loader2 size={12} className="animate-spin text-blue-400"/>
          </div>
          <div className="space-y-2 mb-3">
            {VERIFY_STEPS.map((s, i) => {
              const done = i < step; const active = i === step
              return (
                <div key={i} className="flex items-center gap-2.5">
                  <div className="w-3.5 h-3.5 rounded-full flex-shrink-0 flex items-center justify-center"
                    style={{ backgroundColor: done ? '#34d399' : active ? 'rgba(96,165,250,0.25)' : 'rgba(63,63,70,0.5)', border: active ? '1px solid rgba(96,165,250,0.6)' : 'none' }}>
                    {done && <CheckCircle size={9} style={{ color: '#18181b' }}/>}
                    {active && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: '#60a5fa' }}/>}
                  </div>
                  <span className="text-xs" style={{ color: done ? '#34d399' : active ? '#93c5fd' : '#3f3f46' }}>{s}</span>
                </div>
              )
            })}
          </div>
          <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(step / VERIFY_STEPS.length) * 100}%`, backgroundColor: '#3b82f6' }}/>
          </div>
        </div>
      )}
      {status === 'done' && result && (
        <div className="rounded-xl border bg-zinc-950 p-4"
          style={{ borderColor: result.trend === 'improving' ? 'rgba(52,211,153,0.3)' : result.trend === 'declining' ? 'rgba(248,113,113,0.3)' : 'rgba(245,158,11,0.3)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TIcon t={result.trend}/><span className="text-sm font-bold" style={{ color: tC(result.trend) }}>{tL(result.trend)}</span>
              {result.changeRate && <span className="text-sm font-mono font-bold" style={{ color: tC(result.trend), fontFamily: 'Space Mono' }}>{result.changeRate}</span>}
            </div>
            <button onClick={() => onStart(ins, idx)} className="text-zinc-600 hover:text-zinc-400"><RefreshCw size={12}/></button>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed mb-3">{result.currentStatus}</p>
          <div className="space-y-1.5 mb-3">
            {result.evidence?.map((e: string, i: number) => (
              <div key={i} className="flex gap-2 text-xs text-zinc-500"><ChevronRight size={11} className="text-zinc-600 flex-shrink-0 mt-0.5"/>{e}</div>
            ))}
          </div>
          {result.progressNote && <p className="text-xs text-zinc-600 italic border-t border-zinc-800 pt-3">{result.progressNote}</p>}
        </div>
      )}
      {status === 'error' && <p className="text-xs text-red-400">検証に失敗しました。</p>}
    </div>
  )
}

// ─── 各ページ ─────────────────────────────────────────────────────────────────
function PageOverview({ setPage }: { setPage: (p: string) => void }) {
  return (
    <div>
      <SectionHeader title="概要" sub="APLOM · リアルタイム経営ダッシュボード"/>
      <SearchBar setPage={setPage}/>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Kpi label="今日の売上" value="¥128,000" delta="+18.4%" sub="vs 昨日"/>
        <Kpi label="月次売上" value="¥3,820,000" delta="+11.2%" sub="vs 先月"/>
        <Kpi label="ROAS（総合）" value="4.8x" delta="+0.7"/>
        <Kpi label="平均 LTV（90日）" value="¥22,400" delta="+8.3%"/>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        <Card className="xl:col-span-2">
          <CardTitle>売上・利益推移（万円）</CardTitle>
          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={REV_DATA} margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
              <defs>
                <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3}/><stop offset="95%" stopColor="#60a5fa" stopOpacity={0}/></linearGradient>
                <linearGradient id="gPro" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#34d399" stopOpacity={0.3}/><stop offset="95%" stopColor="#34d399" stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false}/>
              <XAxis dataKey="m" tick={{ fill: '#71717a', fontSize: 11, fontFamily: 'Space Mono' }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fill: '#71717a', fontSize: 11, fontFamily: 'Space Mono' }} axisLine={false} tickLine={false} width={38}/>
              <Tooltip content={<TT/>}/>
              <Area type="monotone" dataKey="rev" name="売上" stroke="#60a5fa" fill="url(#gRev)" strokeWidth={2} dot={false}/>
              <Area type="monotone" dataKey="profit" name="利益" stroke="#34d399" fill="url(#gPro)" strokeWidth={2} dot={false}/>
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <CardTitle>AI 優先インサイト</CardTitle>
          <div className="space-y-3">
            {INSIGHTS.slice(0, 3).map((ins, i) => (
              <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-xs font-semibold text-zinc-200 leading-snug">{ins.title}</span>
                  <PBadge p={ins.p}/>
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2">{ins.body}</p>
                <div className="flex justify-between mt-2">
                  <span className="text-xs text-zinc-600 font-mono">確度</span>
                  <span className="text-xs font-mono" style={{ color: '#34d399' }}>{ins.conf}%</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi label="新規率" value="62%" delta="-4.1%" pos={false} sub="vs 先月"/>
        <Kpi label="カゴ落ち率" value="67%" delta="+2.1%" pos={false}/>
        <Kpi label="VIP 顧客数" value="124" delta="+12" sub="今月"/>
        <Kpi label="Churn Risk" value="318" delta="+28" pos={false} sub="要注意"/>
      </div>
    </div>
  )
}

function PageCustomers() {
  const total = SEGMENTS.reduce((a, s) => a + s.count, 0)
  return (
    <div>
      <SectionHeader title="顧客分析" sub="RFM セグメント · LTV · コホート"/>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        {SEGMENTS.map(s => (
          <div key={s.seg} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <div className="flex items-center justify-between mb-2"><Badge seg={s.seg}/><span className="text-xs text-zinc-500 font-mono">{((s.count/total)*100).toFixed(0)}%</span></div>
            <p className="text-2xl font-bold text-zinc-100" style={{ fontFamily: 'Space Mono' }}>{s.count.toLocaleString()}</p>
            <p className="text-xs text-zinc-500 mt-1">LTV {yen(s.ltv)}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardTitle>セグメント別 顧客数</CardTitle>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={SEGMENTS} layout="vertical" margin={{ left: 5, right: 20 }}>
              <XAxis type="number" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false}/>
              <YAxis dataKey="seg" type="category" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} width={68}/>
              <Tooltip content={<TT/>}/>
              <Bar dataKey="count" name="顧客数" radius={[0, 4, 4, 0]}>
                {SEGMENTS.map((s, i) => <Cell key={i} fill={s.color} fillOpacity={0.85}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <CardTitle>コホート リテンション率</CardTitle>
          <table className="w-full text-xs" style={{ fontFamily: 'Space Mono, monospace' }}>
            <thead><tr className="text-zinc-600 border-b border-zinc-800">
              <th className="text-left pb-3 pr-2">コホート</th>
              {['M0','M1','M2','M3','M4'].map(m => <th key={m} className="pb-3 px-2 text-center">{m}</th>)}
            </tr></thead>
            <tbody>
              {COHORT.map(row => (
                <tr key={row.label} className="border-b border-zinc-800/50 last:border-0">
                  <td className="py-2 pr-2 text-zinc-500">{row.label}</td>
                  {row.vals.map((v, i) => (
                    <td key={i} className="py-2 px-2 text-center">
                      {v !== null ? <span className="px-2 py-0.5 rounded text-xs"
                        style={{ backgroundColor: v===100?'rgba(96,165,250,0.15)':v>=30?'rgba(52,211,153,0.15)':'rgba(113,113,122,0.15)', color: v===100?'#60a5fa':v>=30?'#34d399':'#a1a1aa' }}>{v}%</span>
                        : <span className="text-zinc-700">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
      <Card>
        <CardTitle>LTV ランキング 上位顧客</CardTitle>
        <table className="w-full text-sm">
          <thead><tr className="text-xs text-zinc-500 font-mono border-b border-zinc-800">
            {['#','顧客名','LTV','注文数','最終購入','セグメント'].map((h,i) => <th key={h} className={`pb-3 ${i<=1?'text-left':'text-right'}`}>{h}</th>)}
          </tr></thead>
          <tbody>
            {TOP_CUSTOMERS.map((c, i) => (
              <tr key={i} className="border-b border-zinc-800/40 last:border-0">
                <td className="py-3 text-zinc-600 font-mono text-xs">{i+1}</td>
                <td className="py-3 text-zinc-200">{c.name}</td>
                <td className="py-3 text-right font-mono text-zinc-100" style={{ fontFamily: 'Space Mono' }}>{yen(c.ltv)}</td>
                <td className="py-3 text-right font-mono text-zinc-500">{c.orders}回</td>
                <td className="py-3 text-right text-zinc-500 text-xs">{c.last}</td>
                <td className="py-3 text-right"><Badge seg={c.seg}/></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

function PageProducts() {
  return (
    <div>
      <SectionHeader title="商品分析" sub="売上ランキング · 粗利率 · リピート率"/>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Kpi label="商品数" value="6" sub="アクティブ"/>
        <Kpi label="平均粗利率" value="60.2%" delta="+2.1%"/>
        <Kpi label="最高リピート率" value="72%" sub="セット A"/>
        <Kpi label="月商トップ" value="¥1,240万" sub="セット A"/>
      </div>
      <Card>
        <CardTitle>商品別パフォーマンス</CardTitle>
        <div className="space-y-3">
          {PRODUCTS.map((p, i) => (
            <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-600 font-mono w-4">{i+1}</span>
                  <span className="text-sm font-medium text-zinc-200">{p.name}</span>
                </div>
                <span className="text-sm font-mono text-zinc-100" style={{ fontFamily: 'Space Mono' }}>¥{p.rev.toLocaleString()}万</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <MiniBar label="粗利率" val={p.margin} color="#f59e0b"/>
                <MiniBar label="リピート率" val={p.repeat} color="#a78bfa"/>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function PageMarketing() {
  return (
    <div>
      <SectionHeader title="マーケティング" sub="流入別 ROAS · LTV · 広告効果分析"/>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Kpi label="総広告費" value="¥2,050,000" delta="+8.4%"/>
        <Kpi label="総合 ROAS" value="4.8x" delta="+0.7"/>
        <Kpi label="最高 ROAS" value="6.4x" sub="LINE"/>
        <Kpi label="最高 LTV ch" value="Organic" sub="¥31,200"/>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardTitle>プラットフォーム別 ROAS</CardTitle>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={PLATFORM_DATA} margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false}/>
              <XAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} width={35}/>
              <Tooltip content={<TT/>}/>
              <Bar dataKey="roas" name="ROAS" radius={[4,4,0,0]}>
                {PLATFORM_DATA.map((_,i) => <Cell key={i} fill={['#f59e0b','#60a5fa','#a78bfa','#34d399'][i]} fillOpacity={0.85}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <CardTitle>流入別 90日 LTV</CardTitle>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={LTV_DATA} layout="vertical" margin={{ left: 5, right: 20 }}>
              <XAxis type="number" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/10000).toFixed(0)}万`}/>
              <YAxis dataKey="ch" type="category" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} width={55}/>
              <Tooltip content={<TT/>} formatter={v => yen(Number(v))}/>
              <Bar dataKey="ltv" name="LTV" radius={[0,4,4,0]} fill="#60a5fa" fillOpacity={0.8}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  )
}

function PageInsights() {
  const [verifyState, setVerifyState] = useState<Record<number, any>>({})
  const startVerify = async (ins: any, idx: number) => {
    if (verifyState[idx]?.status === 'running') return
    setVerifyState(prev => ({ ...prev, [idx]: { status: 'running', step: 0, result: null } }))
    const apiPromise = callClaude(`あなたはECデータアナリストです。インサイト「${ins.title}」の改善状況をデータから検証してください。データ: ${MOCK_CONTEXT}
JSONのみ: {"trend":"improving"|"stable"|"declining","changeRate":"+XX%","currentStatus":"2文以内","evidence":["根拠1","根拠2","根拠3"],"progressNote":"1文"}`, 600).catch(() => null)
    for (let i = 1; i <= VERIFY_STEPS.length; i++) {
      await new Promise(r => setTimeout(r, 680))
      setVerifyState(prev => ({ ...prev, [idx]: { ...prev[idx], step: i } }))
    }
    const result = await apiPromise
    setVerifyState(prev => ({ ...prev, [idx]: { status: result ? 'done' : 'error', step: VERIFY_STEPS.length, result } }))
  }
  return (
    <div>
      <SectionHeader title="インサイト" sub="優先度付き施策レコメンデーション · 進捗検証"/>
      <div className="grid grid-cols-4 gap-4 mb-6">
        {['S','A','B','C'].map(p => {
          const count = INSIGHTS.filter(i => i.p === p).length; const s = PRI_STYLE[p]
          return <div key={p} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-center">
            <p className="text-3xl font-bold" style={{ color: s.color, fontFamily: 'Space Mono' }}>{p}</p>
            <p className="text-2xl font-bold text-zinc-100 mt-1" style={{ fontFamily: 'Space Mono' }}>{count}</p>
            <p className="text-xs text-zinc-500 mt-1">施策</p>
          </div>
        })}
      </div>
      <div className="space-y-4">
        {INSIGHTS.map((ins, i) => (
          <Card key={i}>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3"><PBadge p={ins.p}/><h3 className="text-base font-semibold text-zinc-100">{ins.title}</h3></div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-zinc-500 font-mono">確度</p>
                <p className="text-3xl font-bold" style={{ color: '#34d399', fontFamily: 'Space Mono' }}>{ins.conf}%</p>
              </div>
            </div>
            <p className="text-sm text-zinc-400 leading-relaxed mb-4">{ins.body}</p>
            <div className="grid grid-cols-4 gap-3 mb-4">
              {[['Impact',ins.impact],['Ease',ins.ease],['Urgency',ins.urgency],['Confidence',ins.conf]].map(([l,v]) => (
                <div key={String(l)} className="rounded-xl bg-zinc-950 border border-zinc-800 p-3">
                  <p className="text-xs text-zinc-500 mb-1.5 font-mono">{l}</p>
                  <div className="h-1 bg-zinc-800 rounded-full mb-1.5"><div className="h-full rounded-full bg-blue-500" style={{ width: `${v}%` }}/></div>
                  <p className="text-xs font-mono text-zinc-300">{v}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-zinc-700 bg-zinc-950 p-4">
              <p className="text-xs text-zinc-500 mb-1 font-mono uppercase tracking-wider">推奨施策</p>
              <p className="text-sm text-zinc-200">{ins.action}</p>
            </div>
            <InsightVerifyPanel ins={ins} idx={i} state={verifyState} onStart={startVerify}/>
          </Card>
        ))}
      </div>
    </div>
  )
}

function PageHypothesisLab() {
  const [hypothesis, setHypothesis] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string|null>(null)
  const analyze = async () => {
    if (!hypothesis.trim()) return
    setLoading(true); setError(null); setResult(null)
    try {
      const parsed = await callClaude(`ECデータアナリストとして仮説を検証してください。データ: ${MOCK_CONTEXT}
仮説: 「${hypothesis}」
JSONのみ: {"confidence":0〜100,"verdict":"confirmed"|"partially_confirmed"|"refuted"|"insufficient_data","keyFindings":["発見1","発見2","発見3"],"supportingData":[{"label":"指標名","value":"値"}],"recommendation":"推奨施策","caveat":"留意点","alternativeHypotheses":["より確度が高まる仮説1","仮説2","仮説3"]}`)
      setResult(parsed)
    } catch { setError('分析に失敗しました。') }
    setLoading(false)
  }
  const VERDICT: Record<string, any> = {
    confirmed: { label: '仮説：支持', Icon: CheckCircle, color: '#34d399' },
    partially_confirmed: { label: '仮説：部分的に支持', Icon: AlertCircle, color: '#f59e0b' },
    refuted: { label: '仮説：否定', Icon: AlertCircle, color: '#f87171' },
    insufficient_data: { label: 'データ不足', Icon: HelpCircle, color: '#71717a' },
  }
  const isLowConf = result && result.confidence < 65
  return (
    <div>
      <SectionHeader title="仮説ラボ" sub="データ根拠から仮説の確度を自動算出"/>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Card>
            <CardTitle>仮説を入力</CardTitle>
            <p className="text-xs text-zinc-500 mb-4">例：TikTok流入顧客はLTVが高い / LINE登録者は2回目購入率が高い</p>
            <textarea className="w-full min-h-40 rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-100 outline-none resize-none placeholder:text-zinc-700"
              style={{ fontFamily: 'inherit' }} placeholder="仮説を入力してください..." value={hypothesis} onChange={e => setHypothesis(e.target.value)}/>
            <button onClick={analyze} disabled={loading || !hypothesis.trim()}
              className="mt-4 w-full rounded-xl py-3 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 text-white"
              style={{ backgroundColor: '#3b82f6' }}>
              {loading ? <><Loader2 size={14} className="animate-spin"/> 分析中...</> : <><Sparkles size={14}/> 仮説を検証する</>}
            </button>
            {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
          </Card>
          {isLowConf && result.alternativeHypotheses?.length > 0 && (
            <Card>
              <div className="flex items-center gap-2 mb-1"><Lightbulb size={14} style={{ color: '#f59e0b' }}/><h2 className="text-base font-semibold text-zinc-100">確度を高める言い換え</h2></div>
              <p className="text-xs text-zinc-500 mb-4">確度 <span className="font-mono text-amber-400">{result.confidence}%</span> — 以下に言い換えると精度が上がります</p>
              <div className="space-y-2">
                {result.alternativeHypotheses.map((h: string, i: number) => (
                  <button key={i} onClick={() => { setHypothesis(h); setResult(null) }}
                    className="w-full text-left rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-sm text-zinc-300 transition-all group hover:border-amber-500/40 flex items-start gap-2">
                    <ChevronRight size={12} className="text-amber-500 flex-shrink-0 mt-0.5"/>{h}
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>
        <Card>
          <CardTitle>分析結果</CardTitle>
          {!result && !loading && <div className="flex flex-col items-center justify-center h-52 text-center"><Brain size={36} className="text-zinc-800 mb-3"/><p className="text-sm text-zinc-600">仮説を入力して分析を実行してください</p></div>}
          {loading && <div className="flex flex-col items-center justify-center h-52"><Loader2 size={32} className="text-blue-400 animate-spin mb-3"/><p className="text-sm text-zinc-500">データと照合中...</p></div>}
          {result && (() => {
            const v = VERDICT[result.verdict] || VERDICT.insufficient_data; const { Icon } = v
            return <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-sm font-medium" style={{ color: v.color }}><Icon size={14}/>{v.label}</span>
                <div className="text-right">
                  <p className="text-xs text-zinc-500 font-mono">確度</p>
                  <p className="text-4xl font-bold" style={{ fontFamily: 'Space Mono', color: result.confidence >= 70 ? '#34d399' : result.confidence >= 40 ? '#f59e0b' : '#f87171' }}>{result.confidence}%</p>
                </div>
              </div>
              {isLowConf && <div className="rounded-xl border p-3 flex items-center gap-2" style={{ borderColor: 'rgba(245,158,11,0.3)', backgroundColor: 'rgba(245,158,11,0.07)' }}><Lightbulb size={12} style={{ color: '#f59e0b' }}/><p className="text-xs text-amber-400">確度が低めです。左の言い換え仮説を参考にしてください。</p></div>}
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2 font-mono">Key Findings</p>
                <div className="space-y-1.5">{result.keyFindings?.map((f: string, i: number) => <p key={i} className="text-sm text-zinc-400 flex gap-2"><ChevronRight size={13} className="text-blue-400 flex-shrink-0 mt-0.5"/>{f}</p>)}</div>
              </div>
              {result.supportingData?.length > 0 && <div className="grid grid-cols-2 gap-2">{result.supportingData.map((d: any, i: number) => <div key={i} className="rounded-xl bg-zinc-950 border border-zinc-800 p-3"><p className="text-xs text-zinc-500 font-mono">{d.label}</p><p className="text-sm font-bold text-zinc-100 mt-0.5">{d.value}</p></div>)}</div>}
              <div className="rounded-xl p-4" style={{ border: '1px solid rgba(59,130,246,0.3)', backgroundColor: 'rgba(59,130,246,0.05)' }}>
                <p className="text-xs text-zinc-500 mb-1 font-mono uppercase tracking-wider">推奨施策</p>
                <p className="text-sm text-zinc-200">{result.recommendation}</p>
              </div>
              {result.caveat && <p className="text-xs text-zinc-600 italic">{result.caveat}</p>}
            </div>
          })()}
        </Card>
      </div>
    </div>
  )
}

function PageSettings() {
  const [syncLoading, setSyncLoading] = useState(false)
  const [syncResult, setSyncResult] = useState<any>(null)
  const runSync = async (mode: 'full' | 'incremental') => {
    setSyncLoading(true); setSyncResult(null)
    try {
      const res = await fetch(`/api/shopify/sync?mode=${mode}`, { method: 'POST' })
      const data = await res.json()
      setSyncResult(data)
    } catch { setSyncResult({ success: false, error: '通信エラー' }) }
    setSyncLoading(false)
  }
  return (
    <div>
      <SectionHeader title="設定" sub="API連携 · データ同期"/>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardTitle>環境変数の確認</CardTitle>
          <p className="text-xs text-zinc-500 mb-4">以下はVercelの環境変数で設定します。ここでは入力できません（セキュリティのため）</p>
          <div className="space-y-3">
            {['SHOPIFY_STORE_DOMAIN', 'SHOPIFY_ADMIN_ACCESS_TOKEN', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ANTHROPIC_API_KEY'].map(k => (
              <div key={k} className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3">
                <p className="text-xs font-mono text-zinc-400">{k}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardTitle>Shopifyデータ同期</CardTitle>
          <p className="text-xs text-zinc-500 mb-4">Shopifyの受注データをSupabaseに取り込みます</p>
          <div className="space-y-3">
            <button onClick={() => runSync('incremental')} disabled={syncLoading}
              className="w-full rounded-xl py-3 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 text-white"
              style={{ backgroundColor: '#3b82f6' }}>
              {syncLoading ? <Loader2 size={14} className="animate-spin"/> : <RefreshCw size={14}/>}
              差分同期（前回以降の更新分）
            </button>
            <button onClick={() => runSync('full')} disabled={syncLoading}
              className="w-full rounded-xl py-3 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 text-zinc-200"
              style={{ border: '1px solid rgba(96,165,250,0.3)', backgroundColor: 'rgba(96,165,250,0.05)' }}>
              全件同期（初回・リセット時）
            </button>
          </div>
          {syncResult && (
            <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
              {syncResult.success ? (
                <div>
                  <p className="text-sm font-semibold text-emerald-400 mb-2">✅ 同期完了</p>
                  <div className="space-y-1 text-xs text-zinc-400 font-mono">
                    <p>商品: {syncResult.stats?.products_upserted ?? 0}件</p>
                    <p>注文: {syncResult.stats?.orders_upserted ?? 0}件</p>
                    <p>顧客: {syncResult.stats?.customers_upserted ?? 0}件</p>
                    <p>処理時間: {((syncResult.duration_ms ?? 0) / 1000).toFixed(1)}秒</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-red-400">❌ エラー: {syncResult.error}</p>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

// ─── メインアプリ ─────────────────────────────────────────────────────────────
const NAV = [
  { id: 'overview',       label: '概要',          Icon: LayoutDashboard },
  { id: 'customers',      label: '顧客分析',      Icon: Users           },
  { id: 'products',       label: '商品分析',      Icon: Package         },
  { id: 'marketing',      label: 'マーケティング', Icon: TrendingUp      },
  { id: 'insights',       label: 'インサイト',    Icon: Zap             },
  { id: 'hypothesis-lab', label: '仮説ラボ',      Icon: FlaskConical, badge: 'AI' },
  { id: 'settings',       label: '設定',          Icon: Settings        },
]

function renderPage(page: string, setPage: (p: string) => void) {
  switch (page) {
    case 'overview':       return <PageOverview setPage={setPage}/>
    case 'customers':      return <PageCustomers/>
    case 'products':       return <PageProducts/>
    case 'marketing':      return <PageMarketing/>
    case 'insights':       return <PageInsights/>
    case 'hypothesis-lab': return <PageHypothesisLab/>
    case 'settings':       return <PageSettings/>
    default:               return <PageOverview setPage={setPage}/>
  }
}

export default function App() {
  const [page, setPage] = useState('overview')
  useEffect(() => {
    const link = document.createElement('link')
    link.href = 'https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=Space+Mono:wght@400;700&display=swap'
    link.rel = 'stylesheet'
    document.head.appendChild(link)
  }, [])
  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
      <aside className="w-52 flex-shrink-0 border-r border-zinc-800 flex flex-col">
        <div className="p-5 border-b border-zinc-800">
          <p className="text-xs text-zinc-600 tracking-widest uppercase mb-1">APLOM</p>
          <p className="text-base font-bold text-zinc-100" style={{ fontFamily: 'Syne, sans-serif' }}>AI Dashboard</p>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {NAV.map(({ id, label, Icon, badge }) => {
            const active = page === id
            return (
              <button key={id} onClick={() => setPage(id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all text-left ${active ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'}`}>
                <Icon size={14} style={{ color: active ? '#60a5fa' : undefined }}/>
                <span className="flex-1">{label}</span>
                {badge && <span className="text-xs px-1.5 py-0.5 rounded font-mono" style={{ backgroundColor: 'rgba(96,165,250,0.15)', color: '#60a5fa' }}>{badge}</span>}
              </button>
            )
          })}
        </nav>
        <div className="p-4 border-t border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"/>
            <p className="text-xs text-zinc-600">Mock Data</p>
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-8 bg-zinc-950">{renderPage(page, setPage)}</main>
    </div>
  )
}
