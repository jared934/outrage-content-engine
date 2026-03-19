import { Metadata } from 'next'
import { SourcesClient } from './SourcesClient'

export const metadata: Metadata = { title: 'Sources' }

export default function SourcesPage() {
  return <SourcesClient />
}
