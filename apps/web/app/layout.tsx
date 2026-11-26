import './style.css'
import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'KarsaHQ — Dashboard HR', description: 'Ruang kerja untuk operasional HR' }
export default function Layout({children}: Readonly<{children: React.ReactNode}>) {
  return <html lang="id"><body>{children}</body></html>
}
