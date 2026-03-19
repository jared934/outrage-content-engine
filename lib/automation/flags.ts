import { createServiceClient } from '@/lib/supabase/server'

export interface AutomationFlags {
  ai_enabled:  boolean
  n8n_enabled: boolean
}

/** Fetch org-level automation flags. Falls back to disabled on error. */
export async function getAutomationFlags(orgId: string): Promise<AutomationFlags> {
  try {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from('organizations')
      .select('ai_enabled, n8n_enabled')
      .eq('id', orgId)
      .single()

    return {
      ai_enabled:  data?.ai_enabled  ?? false,
      n8n_enabled: data?.n8n_enabled ?? false,
    }
  } catch {
    return { ai_enabled: false, n8n_enabled: false }
  }
}

export function disabledResponse(feature: 'AI' | 'n8n') {
  const label = feature === 'AI' ? 'AI token usage' : 'n8n automation'
  return Response.json(
    { error: `${label} is currently disabled. Enable it in Settings → Automation.` },
    { status: 503 },
  )
}
