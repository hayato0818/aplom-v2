/**
 * app/api/claude/route.ts
 * Claude AI へのプロキシ
 * APIキーはここ（サーバー側）でだけ使うので外部に漏れない
 */
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { prompt, maxTokens = 1000 } = await req.json()

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY が未設定です' }, { status: 500 })
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  const data = await res.json()
  const text = (data.content || []).map((c: any) => c.text || '').join('')
  return NextResponse.json({ text })
}
