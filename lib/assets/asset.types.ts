export type AssetType = 'image' | 'video' | 'gif' | 'audio' | 'document' | 'template' | 'other'

export type AssetCategory =
  | 'logo'
  | 'overlay'
  | 'watermark'
  | 'meme_template'
  | 'background'
  | 'screenshot'
  | 'canva_export'
  | 'generated'
  | 'source_media'
  | 'other'

export interface Asset {
  id:               string
  org_id:           string
  name:             string
  type:             AssetType
  category:         AssetCategory
  url:              string
  storage_path:     string | null
  mime_type:        string | null
  file_size_bytes:  number | null
  width:            number | null
  height:           number | null
  duration_seconds: number | null
  alt_text:         string | null
  description:      string | null
  tags:             string[]
  metadata:         Record<string, unknown>
  is_archived:      boolean
  created_by:       string | null
  created_at:       string
  updated_at:       string
}

export type CreateAssetInput = Pick<Asset, 'name' | 'type' | 'category' | 'url'> & {
  org_id:           string
  storage_path?:    string | null
  mime_type?:       string | null
  file_size_bytes?: number | null
  width?:           number | null
  height?:          number | null
  alt_text?:        string | null
  description?:     string | null
  tags?:            string[]
  metadata?:        Record<string, unknown>
}

export type UpdateAssetInput = Partial<Pick<
  Asset,
  'name' | 'category' | 'alt_text' | 'description' | 'tags' | 'is_archived' | 'metadata'
>>

export interface AssetUploadProgress {
  file:     File
  name:     string
  progress: number             // 0–100
  status:   'pending' | 'uploading' | 'saving' | 'done' | 'error'
  error?:   string
  asset?:   Asset
}

// ─── Category config ────────────────────────────────────────────────────────

export interface CategoryConfig {
  label:       string
  description: string
  icon:        string
  color:       string
}

export const CATEGORY_CONFIG: Record<AssetCategory, CategoryConfig> = {
  logo: {
    label:       'Logos',
    description: 'Brand logos and wordmarks',
    icon:        '🏷️',
    color:       'text-blue-400',
  },
  overlay: {
    label:       'Overlays',
    description: 'Text overlays and graphic elements',
    icon:        '🔲',
    color:       'text-purple-400',
  },
  watermark: {
    label:       'Watermarks',
    description: 'Watermark files for exports',
    icon:        '💧',
    color:       'text-sky-400',
  },
  meme_template: {
    label:       'Meme Templates',
    description: 'Base images for meme generation',
    icon:        '😂',
    color:       'text-amber-400',
  },
  background: {
    label:       'Backgrounds',
    description: 'Background templates and patterns',
    icon:        '🖼️',
    color:       'text-indigo-400',
  },
  screenshot: {
    label:       'Screenshots',
    description: 'Source screenshots and captures',
    icon:        '📸',
    color:       'text-green-400',
  },
  canva_export: {
    label:       'Canva Exports',
    description: 'Exported designs from Canva',
    icon:        '🎨',
    color:       'text-pink-400',
  },
  generated: {
    label:       'Generated',
    description: 'AI-generated visuals',
    icon:        '✨',
    color:       'text-violet-400',
  },
  source_media: {
    label:       'Source Media',
    description: 'Uploaded source images and video',
    icon:        '📁',
    color:       'text-zinc-400',
  },
  other: {
    label:       'Other',
    description: 'Uncategorized assets',
    icon:        '📎',
    color:       'text-zinc-500',
  },
}

export const ASSET_CATEGORIES = Object.keys(CATEGORY_CONFIG) as AssetCategory[]

// ─── Type helpers ────────────────────────────────────────────────────────────

export function mimeToAssetType(mime: string): AssetType {
  if (mime.startsWith('image/gif'))   return 'gif'
  if (mime.startsWith('image/'))      return 'image'
  if (mime.startsWith('video/'))      return 'video'
  if (mime.startsWith('audio/'))      return 'audio'
  if (mime.includes('pdf') || mime.includes('document')) return 'document'
  return 'other'
}

export function formatBytes(bytes: number | null): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1_048_576).toFixed(1)} MB`
}

export function isImageType(type: AssetType): boolean {
  return type === 'image' || type === 'gif'
}
