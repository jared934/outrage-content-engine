import { Metadata } from 'next'
import { TrendDetailClient } from './TrendDetailClient'

export const metadata: Metadata = { title: 'Trend Detail' }

export default function TrendDetailPage({ params }: { params: { id: string } }) {
  return <TrendDetailClient id={params.id} />
}
