import { formatDistanceToNow, format, parseISO, isValid } from 'date-fns'

export function timeAgo(dateString: string | null | undefined): string {
  if (!dateString) return 'Unknown'
  try {
    const date = parseISO(dateString)
    if (!isValid(date)) return 'Unknown'
    return formatDistanceToNow(date, { addSuffix: true })
  } catch {
    return 'Unknown'
  }
}

export function formatDate(dateString: string | null | undefined, fmt = 'MMM d, yyyy'): string {
  if (!dateString) return '—'
  try {
    const date = parseISO(dateString)
    if (!isValid(date)) return '—'
    return format(date, fmt)
  } catch {
    return '—'
  }
}

export function formatDateTime(dateString: string | null | undefined): string {
  return formatDate(dateString, 'MMM d, yyyy h:mm a')
}

export function formatScore(score: number): string {
  return Math.round(score).toString()
}

export function scoreColor(score: number): string {
  if (score >= 80) return 'text-red-400'
  if (score >= 60) return 'text-orange-400'
  if (score >= 40) return 'text-yellow-400'
  return 'text-zinc-500'
}

export function scoreBgColor(score: number): string {
  if (score >= 80) return 'bg-red-500/20 text-red-400 border-red-500/30'
  if (score >= 60) return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
  if (score >= 40) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
  return 'bg-zinc-800 text-zinc-400 border-zinc-700'
}

export function truncate(str: string | null | undefined, maxLen: number): string {
  if (!str) return ''
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen - 3) + '...'
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? `${count} ${singular}` : `${count} ${plural ?? singular + 's'}`
}

export function formatCompact(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
  return num.toString()
}

export function platformLabel(platform: string): string {
  const labels: Record<string, string> = {
    instagram: 'Instagram',
    tiktok: 'TikTok',
    twitter: 'Twitter / X',
    youtube: 'YouTube',
    threads: 'Threads',
    all: 'All Platforms',
  }
  return labels[platform] ?? platform
}

export function categoryLabel(category: string): string {
  const labels: Record<string, string> = {
    celebrity: 'Celebrity',
    politics: 'Politics',
    sports: 'Sports',
    entertainment: 'Entertainment',
    tech: 'Tech',
    meme: 'Meme',
    crime: 'Crime',
    viral: 'Viral',
    other: 'Other',
  }
  return labels[category] ?? category
}

export function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    idea: 'Idea',
    in_progress: 'In Progress',
    review: 'Review',
    approved: 'Approved',
    scheduled: 'Scheduled',
    published: 'Published',
    archived: 'Archived',
    active: 'Active',
    fading: 'Fading',
    dead: 'Dead',
    acted_on: 'Acted On',
  }
  return labels[status] ?? status
}
