export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        backgroundImage: `
          radial-gradient(ellipse 80% 60% at 50% -10%, rgba(239, 68, 68, 0.08) 0%, transparent 70%),
          linear-gradient(rgba(63, 63, 70, 0.15) 1px, transparent 1px),
          linear-gradient(90deg, rgba(63, 63, 70, 0.15) 1px, transparent 1px)
        `,
        backgroundSize: '100% 100%, 48px 48px, 48px 48px',
      }}
    >
      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-32 h-px bg-gradient-to-r from-accent/60 to-transparent" />
      <div className="absolute top-0 left-0 h-32 w-px bg-gradient-to-b from-accent/60 to-transparent" />
      <div className="absolute bottom-0 right-0 w-32 h-px bg-gradient-to-l from-accent/60 to-transparent" />
      <div className="absolute bottom-0 right-0 h-32 w-px bg-gradient-to-t from-accent/60 to-transparent" />

      <div className="w-full max-w-sm relative z-10">
        {children}
      </div>
    </div>
  )
}
