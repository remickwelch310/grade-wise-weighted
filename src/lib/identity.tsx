import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { AUTH_EVENTS, getUser, handleAuthCallback, logout, onAuthChange } from '@netlify/identity'
import type { User } from '@netlify/identity'

interface Identity {
  user: User | null
  // True once the browser session has been checked. Always false during SSR.
  ready: boolean
  // Set after a password-reset link logs the user in; they still need to pick a new password.
  recovering: boolean
  // A one-off message from an email link (confirmation, errors).
  notice: string | null
  clearRecovery: () => void
  clearNotice: () => void
  signOut: () => Promise<void>
}

const Ctx = createContext<Identity | null>(null)

const CALLBACK_HASH = /^#(confirmation_token|recovery_token|invite_token|email_change_token|access_token|error)=/

export function IdentityProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)
  const [recovering, setRecovering] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = onAuthChange((event, u) => {
      setUser(u)
      if (event === AUTH_EVENTS.RECOVERY) setRecovering(true)
    })

    const boot = async () => {
      if (CALLBACK_HASH.test(window.location.hash)) {
        try {
          const result = await handleAuthCallback()
          if (result?.type === 'confirmation') setNotice('Email confirmed. You are signed in.')
          if (result?.type === 'recovery') setRecovering(true)
        } catch (e) {
          setNotice(e instanceof Error ? e.message : 'That link is invalid or has expired.')
        }
      }
      setUser(await getUser())
      setReady(true)
    }
    boot()

    return unsubscribe
  }, [])

  const signOut = async () => {
    try {
      await logout()
    } finally {
      setUser(null)
      setRecovering(false)
    }
  }

  return (
    <Ctx.Provider
      value={{
        user,
        ready,
        recovering,
        notice,
        clearRecovery: () => setRecovering(false),
        clearNotice: () => setNotice(null),
        signOut,
      }}
    >
      {children}
    </Ctx.Provider>
  )
}

export function useIdentity() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useIdentity must be used inside <IdentityProvider>')
  return ctx
}
