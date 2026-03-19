import { Metadata } from 'next'
import { Suspense } from 'react'
import { LoginForm } from './LoginForm'
import { Flame } from 'lucide-react'

export const metadata: Metadata = { title: 'Sign In' }

export default function LoginPage() {
  return (
    <div className="animate-fade-in">
      {/* Brand mark */}
      <div className="flex flex-col items-center mb-8">
        <div className="relative mb-5">
          <div className="absolute inset-0 rounded-2xl bg-accent/20 blur-xl" />
          <div className="relative flex items-center justify-center h-14 w-14 rounded-2xl bg-surface border border-accent/30 shadow-lg shadow-accent/10">
            <Flame className="h-7 w-7 text-accent" />
          </div>
        </div>
        <h1 className="font-display font-bold text-2xl text-foreground tracking-widest uppercase">
          OUTRAGE
        </h1>
        <div className="flex items-center gap-2 mt-1">
          <div className="h-px w-8 bg-border" />
          <p className="text-[10px] text-zinc-600 uppercase tracking-[0.25em]">Content Engine</p>
          <div className="h-px w-8 bg-border" />
        </div>
      </div>

      {/* Card */}
      <div className="bg-surface border border-border rounded-xl shadow-2xl shadow-black/50">
        <div className="p-6 border-b border-border">
          <h2 className="font-display font-semibold text-foreground">Welcome back</h2>
          <p className="text-sm text-muted mt-0.5">Sign in to your workspace</p>
        </div>
        <div className="p-6">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </div>

      <p className="text-center text-[11px] text-zinc-700 mt-6 uppercase tracking-wider">
        Internal tool — authorized users only
      </p>
    </div>
  )
}
