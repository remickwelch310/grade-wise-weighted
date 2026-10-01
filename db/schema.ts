import { jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

// One row per tracker. The whole gradebook (current classes, assignments,
// previous classes) is stored as a single JSON document keyed by a private,
// unguessable tracker ID that lives in the student's browser. Signing in links
// a tracker to a Netlify Identity user so it follows them across devices.
export const trackers = pgTable('trackers', {
  id: text().primaryKey(),
  data: jsonb().notNull(),
  userId: text('user_id').unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
