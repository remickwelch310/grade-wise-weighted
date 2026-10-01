import { createServerFn } from '@tanstack/react-start'
import { getUser } from '@netlify/identity'
import { eq, isNull, sql } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { trackers } from '../../db/schema.js'
import type { Tracker } from '@/lib/grades'

const ID_PATTERN = /^[A-Za-z0-9-]{16,64}$/
const MAX_BYTES = 1_000_000

function assertId(id: unknown): string {
  if (typeof id !== 'string' || !ID_PATTERN.test(id)) throw new Error('Invalid tracker ID')
  return id
}

function assertTracker(data: unknown): Tracker {
  const t = data as Tracker
  if (
    !t ||
    typeof t !== 'object' ||
    typeof t.schoolYear !== 'string' ||
    !Array.isArray(t.courses) ||
    !Array.isArray(t.pastCourses)
  )
    throw new Error('Invalid tracker data')
  if (JSON.stringify(t).length > MAX_BYTES) throw new Error('Tracker is too large')
  return t
}

export const loadTracker = createServerFn({ method: 'GET' })
  .inputValidator((data: { id: string }) => ({ id: assertId(data?.id) }))
  .handler(async ({ data }) => {
    const [row] = await db.select().from(trackers).where(eq(trackers.id, data.id)).limit(1)
    if (!row) return null
    return { data: row.data as Tracker, updatedAt: row.updatedAt.toISOString() }
  })

export const saveTracker = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string; tracker: Tracker }) => ({
    id: assertId(data?.id),
    tracker: assertTracker(data?.tracker),
  }))
  .handler(async ({ data }) => {
    const [row] = await db
      .insert(trackers)
      .values({ id: data.id, data: data.tracker })
      .onConflictDoUpdate({
        target: trackers.id,
        set: { data: data.tracker, updatedAt: sql`now()` },
      })
      .returning({ updatedAt: trackers.updatedAt })
    return { updatedAt: row.updatedAt.toISOString() }
  })

// Links a tracker to the signed-in user. If the account already has a tracker,
// that one wins and is returned so the device can switch to it. Otherwise the
// device's tracker is claimed (or created from `tracker` if it was never saved).
// A tracker already linked to someone else is copied to a fresh ID instead.
export const linkTracker = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string; tracker: Tracker }) => ({
    id: assertId(data?.id),
    tracker: assertTracker(data?.tracker),
  }))
  .handler(async ({ data }) => {
    const user = await getUser()
    if (!user) throw new Error('Sign in required')

    const [owned] = await db.select().from(trackers).where(eq(trackers.userId, user.id)).limit(1)
    if (owned) return { id: owned.id, data: owned.data as Tracker }

    const [claimed] = await db
      .insert(trackers)
      .values({ id: data.id, data: data.tracker, userId: user.id })
      .onConflictDoUpdate({
        target: trackers.id,
        set: { userId: user.id },
        setWhere: isNull(trackers.userId),
      })
      .returning()
    if (claimed) return { id: claimed.id, data: claimed.data as Tracker }

    const [existing] = await db.select().from(trackers).where(eq(trackers.id, data.id)).limit(1)
    const [copy] = await db
      .insert(trackers)
      .values({ id: crypto.randomUUID(), data: existing?.data ?? data.tracker, userId: user.id })
      .returning()
    return { id: copy.id, data: copy.data as Tracker }
  })

