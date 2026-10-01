import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { AuthError, MissingIdentityError, login, requestPasswordRecovery, signup, updateUser } from '@netlify/identity'
import { Check, Cloud, KeyRound, Loader2, LogOut, MailCheck } from 'lucide-react'
import { useIdentity } from '@/lib/identity'
import { useTracker } from '@/lib/store'

export const Route = createFileRoute('/account')({
  component: AccountPage,
})

type Mode = 'signin' | 'signup' | 'forgot'

function authMessage(e: unknown, mode: Mode | 'reset') {
  if (e instanceof MissingIdentityError) return 'Sign-in is not available here yet. Try again on the deployed site.'
  if (e instanceof AuthError) {
    if (e.status === 401 && mode === 'signin') return 'Wrong email or password, or the email is not confirmed yet.'
    if (e.status === 403) return 'New sign-ups are closed for this site.'
    if (e.status === 422) return e.message || 'Check your email and password (at least 8 characters).'
    return e.message
  }
  return 'Something went wrong. Please try again.'
}

function AccountPage() {
  const { user, ready, recovering, notice, clearNotice } = useIdentity()

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="rise">
        <p className="label">Account</p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight">
          {user ? 'Your account' : 'Sign in to Weighted'}
        </h1>
        <p className="mt-2 text-ink-2">
          {user
            ? 'Your gradebook is saved to your account and loads on any device you sign in on.'
            : 'An account is optional. Sign in to keep your gradebook with you on every device, no sync code needed.'}
        </p>
      </div>

      {notice && (
        <div className="card flex items-start gap-2 border-sage/40 bg-sage-soft p-3 text-sm text-sage">
          <MailCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="flex-1">{notice}</p>
          <button type="button" className="text-xs underline" onClick={clearNotice}>
            Dismiss
          </button>
        </div>
      )}

      {!ready ? (
        <div className="card skeleton h-64" />
      ) : user && recovering ? (
        <ResetPassword />
      ) : user ? (
        <SignedIn />
      ) : (
        <AuthForm />
      )}
    </div>
  )
}

function AuthForm() {
  const [mode, setMode] = useState<Mode>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState<string | null>(null)

  const switchMode = (m: Mode) => {
    setMode(m)
    setError(null)
    setSent(null)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setSent(null)
    try {
      if (mode === 'signin') {
        await login(email.trim(), password)
      } else if (mode === 'signup') {
        const u = await signup(email.trim(), password, name.trim() ? { full_name: name.trim() } : undefined)
        if (!u.confirmedAt) setSent(`We sent a confirmation link to ${email.trim()}. Open it to finish signing up.`)
      } else {
        await requestPasswordRecovery(email.trim())
        setSent(`If an account exists for ${email.trim()}, a password reset link is on its way.`)
      }
    } catch (err) {
      setError(authMessage(err, mode))
    } finally {
      setBusy(false)
    }
  }

  const title = { signin: 'Sign in', signup: 'Create an account', forgot: 'Reset your password' }[mode]

  return (
    <form onSubmit={submit} className="card rise space-y-4 p-5">
      {mode !== 'forgot' && (
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-paper-2 p-1 text-sm font-medium">
          {(['signin', 'signup'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              className={`rounded-md py-1.5 transition ${mode === m ? 'bg-card text-ink shadow-sm' : 'text-ink-2 hover:text-ink'}`}
            >
              {m === 'signin' ? 'Sign in' : 'Sign up'}
            </button>
          ))}
        </div>
      )}
      {mode === 'forgot' && <p className="font-display text-xl font-semibold">{title}</p>}

      {mode === 'signup' && (
        <div>
          <label className="label" htmlFor="acct-name">
            Name <span className="normal-case text-ink-3">(optional)</span>
          </label>
          <input id="acct-name" className="input" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
      )}
      <div>
        <label className="label" htmlFor="acct-email">
          Email
        </label>
        <input
          id="acct-email"
          type="email"
          required
          className="input"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      {mode !== 'forgot' && (
        <div>
          <div className="flex items-baseline justify-between">
            <label className="label" htmlFor="acct-password">
              Password
            </label>
            {mode === 'signin' && (
              <button type="button" className="text-xs text-ink-3 hover:text-pen" onClick={() => switchMode('forgot')}>
                Forgot password?
              </button>
            )}
          </div>
          <input
            id="acct-password"
            type="password"
            required
            minLength={mode === 'signup' ? 8 : undefined}
            className="input"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
      )}

      {error && <p className="rounded-lg bg-pen-soft px-3 py-2 text-sm text-pen">{error}</p>}
      {sent && <p className="rounded-lg bg-sage-soft px-3 py-2 text-sm text-sage">{sent}</p>}

      <button className="btn btn-ink w-full justify-center" disabled={busy}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        {mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'}
      </button>

      {mode === 'signup' && (
        <p className="text-xs text-ink-3">The gradebook open on this device becomes your account's gradebook.</p>
      )}
      {mode === 'forgot' && (
        <button type="button" className="text-xs text-ink-2 hover:text-ink" onClick={() => switchMode('signin')}>
          ← Back to sign in
        </button>
      )}
    </form>
  )
}

function ResetPassword() {
  const { clearRecovery } = useIdentity()
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await updateUser({ password })
      clearRecovery()
    } catch (err) {
      setError(authMessage(err, 'reset'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="card rise space-y-4 p-5">
      <p className="flex items-center gap-2 font-display text-xl font-semibold">
        <KeyRound className="h-5 w-5 text-pen" /> Choose a new password
      </p>
      <div>
        <label className="label" htmlFor="acct-new-password">
          New password
        </label>
        <input
          id="acct-new-password"
          type="password"
          required
          minLength={8}
          className="input"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error && <p className="rounded-lg bg-pen-soft px-3 py-2 text-sm text-pen">{error}</p>}
      <button className="btn btn-ink w-full justify-center" disabled={busy}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        Save password
      </button>
    </form>
  )
}

function SignedIn() {
  const { user, signOut } = useIdentity()
  const { linked, status } = useTracker()
  const [busy, setBusy] = useState(false)

  if (!user) return null

  return (
    <div className="card rise space-y-4 p-5">
      <div>
        <p className="label">Signed in as</p>
        {user.name && <p className="font-display text-xl font-semibold">{user.name}</p>}
        <p className="text-ink-2">{user.email}</p>
      </div>

      <div className="flex items-start gap-2 rounded-lg bg-paper-2 px-3 py-2.5 text-sm">
        {linked ? (
          <>
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-sage" />
            <p>This gradebook is saved to your account.</p>
          </>
        ) : status === 'loading' ? (
          <>
            <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />
            <p>Loading your gradebook…</p>
          </>
        ) : (
          <>
            <Cloud className="mt-0.5 h-4 w-4 shrink-0 text-ochre" />
            <p>
              You opened a different tracker from a sync code. Sign out and back in to return to your account's
              gradebook.
            </p>
          </>
        )}
      </div>

      <div className="flex gap-2">
        <Link to="/" className="btn btn-ink flex-1 justify-center">
          Go to dashboard
        </Link>
        <button
          type="button"
          className="btn btn-ghost"
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            await signOut().finally(() => setBusy(false))
          }}
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
      <p className="text-xs text-ink-3">Signing out clears the gradebook from this device. It stays in your account.</p>
    </div>
  )
}
