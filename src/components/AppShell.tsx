import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import type { ReactNode } from 'react'
import {
  Calculator,
  Check,
  CloudOff,
  Copy,
  FlaskConical,
  History,
  KeyRound,
  LayoutGrid,
  Link2,
  Loader2,
  LogIn,
  Upload,
  UserRound,
  X,
} from 'lucide-react'
import { useIdentity } from '@/lib/identity'
import { useTracker } from '@/lib/store'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutGrid },
  { to: '/calculator', label: 'Calculator', icon: Calculator },
  { to: '/history', label: 'History', icon: History },
  { to: '/import', label: 'Import', icon: Upload },
] as const

export function AppShell({ children }: { children: ReactNode }) {
  const { simulate, setSimulate } = useTracker()
  const { user, recovering } = useIdentity()

  return (
    <div className="min-h-screen pl-0 sm:pl-14">
      <header className="sticky top-0 z-30 border-b border-line/80 bg-paper/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
          <Link to="/" className="group flex items-baseline gap-2">
            <span className="font-display text-2xl font-extrabold tracking-tight">
              Weighted<span className="text-pen">.</span>
            </span>
            <span className="hidden text-xs text-ink-3 md:inline">quizzes 20 · tests 80</span>
          </Link>

          <nav className="ml-auto hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeOptions={{ exact: n.to === '/' }}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-ink-2 transition hover:bg-paper-2 hover:text-ink"
                activeProps={{ className: 'bg-ink !text-paper hover:!bg-ink' }}
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2 md:ml-2">
            <button
              type="button"
              onClick={() => setSimulate(!simulate)}
              aria-pressed={simulate}
              className={`btn border text-xs ${
                simulate ? 'border-sim bg-sim text-white' : 'border-line bg-card text-ink-2 hover:border-sim hover:text-sim'
              }`}
              title="Include what-if grades in every calculation"
            >
              <FlaskConical className="h-4 w-4" />
              <span className="hidden sm:inline">What-if</span> {simulate ? 'on' : 'off'}
            </button>
            <SyncMenu />
            <AccountButton />
          </div>
        </div>
        {user && recovering && (
          <div className="border-t border-pen/30 bg-pen-soft px-4 py-1.5 text-center text-xs font-medium text-pen">
            <KeyRound className="mr-1 inline h-3.5 w-3.5" />
            You opened a password reset link.{' '}
            <Link to="/account" className="underline">
              Choose a new password
            </Link>
          </div>
        )}
        {simulate && (
          <div className="border-t border-sim/30 bg-sim-soft px-4 py-1.5 text-center text-xs font-medium text-sim">
            Simulation mode — what-if grades are included in every grade and GPA below.
          </div>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-28 pt-8 sm:px-6 md:pb-16">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-line bg-card/95 backdrop-blur md:hidden">
        {NAV.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            activeOptions={{ exact: n.to === '/' }}
            className="flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium text-ink-3"
            activeProps={{ className: '!text-pen' }}
          >
            <n.icon className="h-5 w-5" />
            {n.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}

function AccountButton() {
  const { user, ready } = useIdentity()
  if (!ready) return <span className="btn btn-ghost w-9 text-xs opacity-0" aria-hidden />
  if (!user)
    return (
      <Link to="/account" className="btn btn-ghost text-xs" title="Sign in to keep your gradebook on every device">
        <LogIn className="h-4 w-4" />
        <span className="hidden sm:inline">Sign in</span>
      </Link>
    )
  const initial = (user.name || user.email || '?').trim().charAt(0).toUpperCase()
  return (
    <Link
      to="/account"
      className="flex h-9 w-9 items-center justify-center rounded-full bg-ink font-display text-sm font-semibold text-paper transition hover:bg-pen"
      title={user.email}
      aria-label="Your account"
    >
      {initial || <UserRound className="h-4 w-4" />}
    </Link>
  )
}

function SyncMenu() {
  const { status, syncId, switchTo, linked } = useTracker()
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [copied, setCopied] = useState<'code' | 'link' | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const copy = async (kind: 'code' | 'link') => {
    const value = kind === 'code' ? syncId : `${window.location.origin}/?sync=${syncId}`
    await navigator.clipboard.writeText(value)
    setCopied(kind)
    setTimeout(() => setCopied(null), 1500)
  }

  const icon =
    status === 'loading' || status === 'saving' ? (
      <Loader2 className="h-4 w-4 animate-spin" />
    ) : status === 'error' ? (
      <CloudOff className="h-4 w-4 text-pen" />
    ) : (
      <Check className="h-4 w-4 text-sage" />
    )
  const label = { loading: 'Loading', saving: 'Saving', saved: 'Saved', error: 'Offline' }[status]

  return (
    <div className="relative">
      <button type="button" className="btn btn-ghost text-xs" onClick={() => setOpen(!open)} aria-expanded={open}>
        {icon}
        <span className="hidden sm:inline">{label}</span>
      </button>
      {open && (
        <div className="card rise absolute right-0 top-12 z-40 w-80 p-4">
          <div className="mb-3 flex items-start justify-between">
            <div>
              <p className="font-display text-lg font-semibold">Your private tracker</p>
              <p className="text-xs text-ink-2">
                {linked
                  ? 'Grades save automatically to your account. Sign in on any device to open them.'
                  : 'Grades save automatically. Use this code or link to open the same tracker on another device.'}
              </p>
              {!linked && (
                <Link to="/account" onClick={() => setOpen(false)} className="mt-1 inline-block text-xs text-pen underline">
                  Or sign in to skip the code
                </Link>
              )}
            </div>
            <button type="button" onClick={() => setOpen(false)} className="text-ink-3 hover:text-ink" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="num mb-2 truncate rounded-lg bg-paper-2 px-3 py-2 text-xs">{syncId || '…'}</div>
          <div className="mb-4 flex gap-2">
            <button type="button" className="btn btn-ghost flex-1 text-xs" onClick={() => copy('code')}>
              <Copy className="h-3.5 w-3.5" /> {copied === 'code' ? 'Copied' : 'Copy code'}
            </button>
            <button type="button" className="btn btn-ghost flex-1 text-xs" onClick={() => copy('link')}>
              <Link2 className="h-3.5 w-3.5" /> {copied === 'link' ? 'Copied' : 'Copy link'}
            </button>
          </div>
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              setMsg(null)
              const ok = await switchTo(code)
              setMsg(ok ? 'Loaded that tracker.' : 'No tracker found for that code.')
              if (ok) setCode('')
            }}
          >
            <label className="label" htmlFor="sync-code">
              Open a tracker from another device
            </label>
            <div className="flex gap-2">
              <input
                id="sync-code"
                className="input num text-xs"
                placeholder="Paste code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <button className="btn btn-ink text-xs" disabled={!code.trim()}>
                Open
              </button>
            </div>
            {msg && <p className="mt-2 text-xs text-ink-2">{msg}</p>}
          </form>
          <p className="mt-3 text-[11px] leading-snug text-ink-3">
            Keep the code private — anyone with it can view and edit these grades.
          </p>
        </div>
      )}
    </div>
  )
}
