'use client'

import { useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useDashboard, dashboardKeys } from '@/hooks/useDashboard'
import { generateManagerAlerts } from '@/lib/dashboard/manager-insights'

import { StatsRow }             from '@/components/dashboard/StatsRow'
import { TrendFeed }            from '@/components/dashboard/TrendFeed'
import { AlertPanel }           from '@/components/dashboard/AlertPanel'
import { QuickActions }         from '@/components/dashboard/QuickActions'
import { PostNowBanner }        from '@/components/dashboard/PostNowBanner'
import { ManagerInsightsPanel } from '@/components/dashboard/ManagerInsightsPanel'
import { MemeReadyPanel }       from '@/components/dashboard/MemeReadyPanel'
import { ContentQueuePanel }    from '@/components/dashboard/ContentQueuePanel'
import { SourceHealthPanel }    from '@/components/dashboard/SourceHealthPanel'
import { useUnreadAlerts }      from '@/hooks/useAlerts'

interface DashboardClientProps {
  greeting: string
  orgId:    string
}

export function DashboardClient({ greeting, orgId }: DashboardClientProps) {
  const qc = useQueryClient()
  const { data, isLoading, isFetching } = useDashboard(orgId)
  const { data: alerts = [] } = useUnreadAlerts()

  function refresh() {
    qc.invalidateQueries({ queryKey: dashboardKeys.all })
  }

  // Generate manager mode insights from trend scoring data
  const managerAlerts = useMemo(() => {
    if (!data?.top_opportunities) return []
    return generateManagerAlerts(data.top_opportunities, 6)
  }, [data?.top_opportunities])

  return (
    <div className="p-5 max-w-screen-xl mx-auto space-y-5">

      {/* ------------------------------------------------------------------ */}
      {/* Header                                                              */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-xl text-foreground">{greeting}</h1>
          <p className="text-sm text-muted mt-0.5">
            {isLoading
              ? 'Loading your content intelligence…'
              : data
                ? `${data.stats.active_count} active trends · ${data.stats.post_now_count} need posting now`
                : 'Your content manager dashboard.'}
          </p>
        </div>
        <QuickActions onRefresh={refresh} refreshing={isFetching && !isLoading} />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Post Now Banner — urgent opportunities at the very top             */}
      {/* ------------------------------------------------------------------ */}
      {!isLoading && data?.post_now && data.post_now.length > 0 && (
        <PostNowBanner trends={data.post_now} />
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Stats row                                                           */}
      {/* ------------------------------------------------------------------ */}
      <StatsRow stats={data?.stats} loading={isLoading} />

      {/* ------------------------------------------------------------------ */}
      {/* Manager Mode — AI insight cards                                     */}
      {/* ------------------------------------------------------------------ */}
      {!isLoading && managerAlerts.length > 0 && (
        <ManagerInsightsPanel alerts={managerAlerts} />
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Main two-column grid                                                */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">

        {/* Left column — trend feed */}
        <TrendFeed
          trends={data?.top_opportunities ?? []}
          loading={isLoading}
        />

        {/* Right column — signals + content */}
        <div className="space-y-4">
          <AlertPanel alerts={alerts} />

          <MemeReadyPanel
            trends={data?.meme_ready ?? []}
            loading={isLoading}
          />

          <ContentQueuePanel
            ideas={data?.saved_ideas ?? []}
            loading={isLoading}
            title="Saved Ideas"
            showSaved
          />
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Recent generated ideas                                              */}
      {/* ------------------------------------------------------------------ */}
      {!isLoading && (data?.recent_ideas?.length ?? 0) > 0 && (
        <ContentQueuePanel
          ideas={data?.recent_ideas ?? []}
          loading={isLoading}
          title="Recently Generated"
        />
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Source health                                                       */}
      {/* ------------------------------------------------------------------ */}
      <SourceHealthPanel
        sources={data?.source_health ?? []}
        loading={isLoading}
      />

    </div>
  )
}
