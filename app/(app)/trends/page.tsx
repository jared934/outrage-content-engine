import { Metadata } from 'next'
import { TrendsClient } from './TrendsClient'

export const metadata: Metadata = { title: 'Trends' }

export default function TrendsPage() {
  return <TrendsClient />
}
