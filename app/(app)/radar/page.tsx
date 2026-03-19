import { Metadata } from 'next'
import { ViralRadarClient } from './ViralRadarClient'

export const metadata: Metadata = { title: 'Viral Radar' }

export default function RadarPage() {
  return <ViralRadarClient />
}
