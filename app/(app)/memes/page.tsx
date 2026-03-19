import { Metadata } from 'next'
import { MemesClient } from './MemesClient'

export const metadata: Metadata = { title: 'Meme Generator' }

export default function MemesPage() {
  return <MemesClient />
}
