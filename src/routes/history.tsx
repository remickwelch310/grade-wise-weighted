import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Archive, Plus, Trash2 } from 'lucide-react'
import {
  basePoints,
  courseGrade,
  cumulativeGpa,
  fmtGpa,
  LEVEL_LABEL,
  pastGpa,
  uid,
  weightedPoints,
  yearGpa,
} from '@/lib/grades'
import type { Level, PastCourse } from '@/lib/grades'
import { useTracker } from '@/lib/store'
import { LetterBadge, NumberField, SectionTitle } from '@/components/ui'

export const Route = createFileRoute('/history')({
  component: HistoryPage,
})

function HistoryPage() {
  const { tracker, ready, update, simulate } = useTracker()
  if (!ready) return <div className="skeleton h-96" />

  const past = pastGpa(tracker)
  const year = yearGpa(tracker, simulate)
  const cum = cumulativeGpa(tracker, simulate)

  const patch = (id: string, p: Partial<PastCourse>) =>
    update((t) => ({ ...t, pastCourses: t.pastCourses.map((c) => (c.id === id ? { ...c, ...p } : c)) }))

  const archiveYear = () => {
    const graded = tracker.courses.filter((c) => courseGrade(c, false) !== null)
    if (!graded.length) return
    if (!confirm(`Move ${graded.length} class${graded.length > 1 ? 'es' : ''} into your history and start a new school year?`)) return
    update((t) => {
      const [start] = t.schoolYear.match(/\d{4}/) ?? [String(new Date().getFullYear())]
      const next = Number(start) + 1
      return {
        schoolYear: `${next}–${String(next + 1).slice(2)}`,
        courses: [],
        pastCourses: [
          ...t.pastCourses,
          ...t.courses.flatMap((c) => {
            const g = courseGrade(c, false)
            return g === null ? [] : [{ id: uid(), name: c.name, grade: Math.round(g * 100) / 100, level: c.level }]
          }),
        ],
      }
    })
  }

  return (
    <div className="space-y-10">
      <div className="rise">
        <p className="label">Transcript</p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">GPA history</h1>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <GpaTile label="Previous years" weighted={past.weighted} base={past.base} count={past.count} />
        <GpaTile label={`${tracker.schoolYear} so far`} weighted={year.weighted} base={year.base} count={year.count} />
        <GpaTile label="Cumulative" weighted={cum.weighted} base={cum.base} count={cum.count} dark />
      </section>

      <section>
        <SectionTitle
          kicker="Completed classes"
          title="Previous classes"
          action={
            <div className="flex items-center gap-2">
              <label className="text-xs text-ink-3" htmlFor="school-year">Current school year</label>
              <input
                id="school-year"
                className="input num !w-28 !py-1.5"
                value={tracker.schoolYear}
                onChange={(e) => update((t) => ({ ...t, schoolYear: e.target.value }))}
              />
            </div>
          }
        />
        <AddPast />
        {tracker.pastCourses.length > 0 && (
          <div className="card mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.1em] text-ink-3">
                  <th className="px-4 py-3 font-semibold">Class</th>
                  <th className="px-2 py-3 font-semibold">Level</th>
                  <th className="px-2 py-3 text-right font-semibold">Final</th>
                  <th className="px-2 py-3 text-right font-semibold">Base</th>
                  <th className="px-2 py-3 text-right font-semibold">Weighted</th>
                  <th className="px-4 py-3"><span className="sr-only">Delete</span></th>
                </tr>
              </thead>
              <tbody>
                {tracker.pastCourses.map((c) => (
                  <tr key={c.id} className="border-b border-line/60 last:border-0">
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-3">
                        <LetterBadge grade={c.grade} />
                        <input className="w-full min-w-32 bg-transparent font-medium outline-none focus:underline" value={c.name} onChange={(e) => patch(c.id, { name: e.target.value })} aria-label="Class name" />
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <select className="input !w-32 !py-1" value={c.level} onChange={(e) => patch(c.id, { level: e.target.value as Level })} aria-label="Level">
                        {(Object.keys(LEVEL_LABEL) as Level[]).map((l) => (
                          <option key={l} value={l}>{LEVEL_LABEL[l]}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <NumberField className="!w-20 ml-auto text-right !py-1" value={c.grade} onChange={(v) => patch(c.id, { grade: v ?? 0 })} ariaLabel="Final grade" />
                    </td>
                    <td className="num px-2 py-2 text-right">{basePoints(c.grade).toFixed(1)}</td>
                    <td className="num px-2 py-2 text-right font-semibold">{weightedPoints(c.grade, c.level).toFixed(1)}</td>
                    <td className="px-4 py-2 text-right">
                      <button
                        type="button"
                        className="rounded-md p-1.5 text-ink-3 hover:bg-pen-soft hover:text-pen"
                        onClick={() => update((t) => ({ ...t, pastCourses: t.pastCourses.filter((p) => p.id !== c.id) }))}
                        aria-label={`Delete ${c.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <h3 className="font-display text-lg font-semibold">Finished the year?</h3>
          <p className="text-sm text-ink-2">
            Move this year's classes into your history with their final grades and start the next school year fresh.
          </p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={archiveYear} disabled={!tracker.courses.length}>
          <Archive className="h-4 w-4" /> Archive {tracker.schoolYear}
        </button>
      </section>
    </div>
  )
}

function GpaTile({ label, weighted, base, count, dark }: { label: string; weighted: number | null; base: number | null; count: number; dark?: boolean }) {
  return (
    <div className={`card rise p-5 ${dark ? '!bg-ink text-paper' : ''}`}>
      <p className={`label ${dark ? '!text-paper/60' : ''}`}>{label}</p>
      <p className="num font-display text-5xl font-extrabold">{fmtGpa(weighted)}</p>
      <p className={`mt-1 text-sm ${dark ? 'text-paper/70' : 'text-ink-3'}`}>
        <span className="num">{fmtGpa(base)}</span> unweighted · {count} class{count === 1 ? '' : 'es'}
      </p>
    </div>
  )
}

function AddPast() {
  const { update } = useTracker()
  const [name, setName] = useState('')
  const [grade, setGrade] = useState<number | null>(null)
  const [level, setLevel] = useState<Level>('regular')

  return (
    <form
      className="card grid gap-3 p-4 sm:grid-cols-[2fr_1fr_7rem_auto] sm:items-center"
      onSubmit={(e) => {
        e.preventDefault()
        if (!name.trim() || grade === null) return
        update((t) => ({ ...t, pastCourses: [...t.pastCourses, { id: uid(), name: name.trim(), grade, level }] }))
        setName('')
        setGrade(null)
      }}
    >
      <input className="input" placeholder="Class name, e.g. Geometry" value={name} onChange={(e) => setName(e.target.value)} aria-label="Class name" />
      <select className="input" value={level} onChange={(e) => setLevel(e.target.value as Level)} aria-label="Level">
        <option value="regular">Regular</option>
        <option value="honors">Honors (+0.5)</option>
        <option value="ap">AP / IB (+1.0)</option>
      </select>
      <NumberField value={grade} onChange={setGrade} placeholder="Final grade" ariaLabel="Final grade" />
      <button className="btn btn-ink" disabled={!name.trim() || grade === null}>
        <Plus className="h-4 w-4" /> Add
      </button>
    </form>
  )
}
