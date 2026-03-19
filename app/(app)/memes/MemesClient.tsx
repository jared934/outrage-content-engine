'use client'

import { useState } from 'react'
import { Image as ImageIcon, Wand2, Download, RefreshCw } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { EmptyState } from '@/components/ui/EmptyState'
import { toast } from 'sonner'

// Mock templates — replace with imgflip API call when credentials configured
const MOCK_TEMPLATES = [
  { id: '181913649', name: 'Drake Hotline Bling', url: 'https://i.imgflip.com/30b1gx.jpg', box_count: 2 },
  { id: '87743020',  name: 'Two Buttons',        url: 'https://i.imgflip.com/1g8my4.jpg', box_count: 3 },
  { id: '112126428', name: 'Distracted Boyfriend',url: 'https://i.imgflip.com/1ur9b0.jpg', box_count: 3 },
  { id: '131087935', name: 'Running Away Balloon',url: 'https://i.imgflip.com/261o3j.jpg', box_count: 5 },
  { id: '217743513', name: 'UNO Draw 25 Cards',   url: 'https://i.imgflip.com/3lmzyx.jpg', box_count: 2 },
  { id: '124822590', name: 'Left Exit 12',        url: 'https://i.imgflip.com/22bdq6.jpg', box_count: 3 },
]

const schema = z.object({
  template_id: z.string().min(1, 'Select a template'),
  top_text: z.string().min(1, 'Enter top text'),
  bottom_text: z.string(),
})

type FormData = z.infer<typeof schema>

export function MemesClient() {
  const [selectedTemplate, setSelectedTemplate] = useState(MOCK_TEMPLATES[0])
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { template_id: MOCK_TEMPLATES[0].id, top_text: '', bottom_text: '' },
  })

  async function onSubmit(data: FormData) {
    setGenerating(true)
    try {
      // TODO: Wire up to /api/memes/generate which calls imgflip API
      // For now, show the template image as preview
      await new Promise(r => setTimeout(r, 800))
      setGeneratedUrl(selectedTemplate.url)
      toast.success('Meme generated! (Mock mode — configure Imgflip credentials for real generation)')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <ImageIcon className="h-5 w-5 text-muted" />
        <h1 className="font-display font-bold text-xl text-foreground">Meme Generator</h1>
        <span className="text-xs text-zinc-600 bg-zinc-800 px-2 py-0.5 rounded-full">Beta</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Template + form */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Choose Template</CardTitle></CardHeader>
            <div className="grid grid-cols-3 gap-2">
              {MOCK_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setSelectedTemplate(t)
                    setValue('template_id', t.id)
                  }}
                  className={`rounded-lg overflow-hidden border-2 transition-colors ${
                    selectedTemplate.id === t.id
                      ? 'border-accent'
                      : 'border-border hover:border-zinc-600'
                  }`}
                >
                  <img src={t.url} alt={t.name} className="w-full h-20 object-cover" />
                  <p className="text-[9px] text-muted p-1 truncate text-center">{t.name}</p>
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader><CardTitle>Caption</CardTitle></CardHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
              <Input
                label="Top Text"
                placeholder="When you finally..."
                error={errors.top_text?.message}
                fullWidth
                {...register('top_text')}
              />
              <Input
                label="Bottom Text"
                placeholder="...and then..."
                fullWidth
                {...register('bottom_text')}
              />
              <div className="flex gap-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={generating}
                  icon={<Wand2 className="h-3.5 w-3.5" />}
                  fullWidth
                >
                  Generate Meme
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Right: Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            {generatedUrl && (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="xs"
                  icon={<RefreshCw className="h-3 w-3" />}
                  onClick={() => setGeneratedUrl(null)}
                >
                  Reset
                </Button>
                <a href={generatedUrl} download target="_blank" rel="noopener noreferrer">
                  <Button variant="secondary" size="xs" icon={<Download className="h-3 w-3" />}>
                    Download
                  </Button>
                </a>
              </div>
            )}
          </CardHeader>
          {generatedUrl ? (
            <img
              src={generatedUrl}
              alt="Generated meme"
              className="w-full rounded-lg border border-border"
            />
          ) : (
            <EmptyState
              icon={<ImageIcon className="h-12 w-12" />}
              title="No meme yet"
              description="Fill in the caption and click Generate"
              compact
            />
          )}
        </Card>
      </div>
    </div>
  )
}
