import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({ message: '準備中です' })
}

export async function GET() {
  return NextResponse.json({ logs: [] })
}
