import { Metadata } from 'next'
import { ContentClient } from './ContentClient'

export const metadata: Metadata = { title: 'Content Ideas' }

export default function ContentPage() {
  return <ContentClient />
}
