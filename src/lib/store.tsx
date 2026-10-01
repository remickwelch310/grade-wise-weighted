import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { emptyTracker, uid } from './grades'
import type { Tracker } from './grades'
import { linkTracker, loadTracker, saveTracker } from '@/server/tracker.functions'
import { useIdentity } from './identity'

const ID_KEY = 'gradebook:id'
const CACHE_KEY = 'gradebook:cache'

export type SyncStatus = 'loading' | 'saved' | 'saving' | 'error'

interface Store {
  tracker: Tracker
  ready: boolean
  status: SyncStatus
  syncId: string
  // True when this tracker is linked to the signed-in account.
  linked: boolean
  simulate: boolean
  setSimulate: (v: boolean) => void
  update: (fn: (t: Tracker) => Tracker) => void
  replace: (t: Tracker) => void
  switchTo: (id: string) => Promise<boolean>
}

const Ctx = createContext<Store | null>(null)

function newId() {
  return uid().replace(/[^A-Za-z0-9-]/g, '').padEnd(20, '0')
}

function readCache(): Tracker | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as Tracker) : null
  } catch {
    return null
  }
}

export function TrackerProvider({ children }: { children: ReactNode }) {
  const [tracker, setTracker] = useState<Tracker>(emptyTracker)
  const [ready, setReady] = useState(false)
  const [status, setStatus] = useState<SyncStatus>('loading')
  const [syncId, setSyncId] = useState('')
  const [simulate, setSimulate] = useState(false)
  const [linkedId, setLinkedId] = useState<string | null>(null)
  const [booted, setBooted] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pending = useRef<Tracker | null>(null)
  const idRef = useRef('')
  const trackerRef = useRef(tracker)
  trackerRef.current = tracker
  const { user, ready: identityReady } = useIdentity()
  const prevUser = useRef<string | null | undefined>(undefined)

  const load = useCallback(async (id: string) => {
    setStatus('loading')
    const remote = await loadTracker({ data: { id } })
    if (remote) {
      setTracker(remote.data)
      localStorage.setItem(CACHE_KEY, JSON.stringify(remote.data))
    }
    setStatus('saved')
    return remote
  }, [])

  // Boot: pick up ?sync=<id> from a shared link, else the stored ID, else a new one.
  useEffect(() => {
    const url = new URL(window.location.href)
    const fromLink = url.searchParams.get('sync')
    if (fromLink) {
      url.searchParams.delete('sync')
      window.history.replaceState(null, '', url.toString())
    }
    const id = fromLink || localStorage.getItem(ID_KEY) || newId()
    localStorage.setItem(ID_KEY, id)
    idRef.current = id
    setSyncId(id)

    const cached = fromLink ? null : readCache()
    if (cached) setTracker(cached)
    setReady(!!cached)

    load(id)
      .catch(() => setStatus('error'))
      .finally(() => {
        setReady(true)
        setBooted(true)
      })
  }, [load])

  const persist = useCallback((next: Tracker) => {
    localStorage.setItem(CACHE_KEY, JSON.stringify(next))
    setStatus('saving')
    if (timer.current) clearTimeout(timer.current)
    pending.current = next
    timer.current = setTimeout(() => {
      timer.current = null
      pending.current = null
      saveTracker({ data: { id: idRef.current, tracker: next } })
        .then(() => setStatus('saved'))
        .catch(() => setStatus('error'))
    }, 700)
  }, [])

  // Saves a debounced change right away, before the active tracker ID changes.
  const flush = useCallback(async () => {
    if (!timer.current || !pending.current) return
    clearTimeout(timer.current)
    const next = pending.current
    timer.current = null
    pending.current = null
    await saveTracker({ data: { id: idRef.current, tracker: next } }).catch(() => {})
  }, [])

  const activate = useCallback((id: string, data: Tracker) => {
    idRef.current = id
    localStorage.setItem(ID_KEY, id)
    localStorage.setItem(CACHE_KEY, JSON.stringify(data))
    setSyncId(id)
    setTracker(data)
  }, [])

  // Signing in links this device's tracker to the account (or loads the one the
  // account already has). Signing out starts a fresh tracker on this device so
  // the account's grades don't stay behind on a shared computer.
  useEffect(() => {
    if (!identityReady || !booted) return
    const current = user?.id ?? null
    const previous = prevUser.current
    prevUser.current = current
    if (current === previous) return

    if (current) {
      setStatus('loading')
      flush()
        .then(() => linkTracker({ data: { id: idRef.current, tracker: trackerRef.current } }))
        .then((res) => {
          if (res.id !== idRef.current) activate(res.id, res.data)
          setLinkedId(res.id)
          setStatus('saved')
        })
        .catch(() => setStatus('error'))
    } else if (previous) {
      flush().finally(() => {
        localStorage.removeItem(CACHE_KEY)
        activate(newId(), emptyTracker())
        setLinkedId(null)
        setStatus('saved')
      })
    }
  }, [user, identityReady, booted, flush, activate])

  const update = useCallback(
    (fn: (t: Tracker) => Tracker) => {
      setTracker((prev) => {
        const next = fn(prev)
        persist(next)
        return next
      })
    },
    [persist],
  )

  const replace = useCallback((t: Tracker) => update(() => t), [update])

  const switchTo = useCallback(
    async (id: string) => {
      const clean = id.trim()
      if (!/^[A-Za-z0-9-]{16,64}$/.test(clean)) return false
      try {
        const remote = await loadTracker({ data: { id: clean } })
        if (!remote) {
          setStatus('saved')
          return false
        }
        if (timer.current) clearTimeout(timer.current)
        idRef.current = clean
        localStorage.setItem(ID_KEY, clean)
        setSyncId(clean)
        setTracker(remote.data)
        localStorage.setItem(CACHE_KEY, JSON.stringify(remote.data))
        setStatus('saved')
        return true
      } catch {
        setStatus('error')
        return false
      }
    },
    [],
  )

  return (
    <Ctx.Provider
      value={{
        tracker,
        ready,
        status,
        syncId,
        linked: !!linkedId && linkedId === syncId,
        simulate,
        setSimulate,
        update,
        replace,
        switchTo,
      }}
    >
      {children}
    </Ctx.Provider>
  )
}

export function useTracker() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useTracker must be used inside <TrackerProvider>')
  return ctx
}
