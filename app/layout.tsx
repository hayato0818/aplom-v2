import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'APLOM AI Dashboard',
  description: 'EC経営AIダッシュボード',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}
