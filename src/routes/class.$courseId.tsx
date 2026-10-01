import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowLeft, FlaskConical, Plus, Trash2, Wand2 } from 'lucide-react'
import { breakdown, counted, fmt, impact, LEVEL_LABEL, uid } from '@/lib/grades'
import type { Assignment, Course, Kind, Level } from '@/lib/grades'
import { useTracker } from '@/lib/store'
import { Delta, EmptyState, LetterBadge, NumberField, SectionTitle, tone } from '@/components/ui'
import { NeededVerdict } from '@/components/NeededVerdict'

export const Route = createFileRoute('/class/$courseId')({
  component: ClassPage,
})

function ClassPage() {
  const { courseId } = Route.useParams()
  const { tracker, ready, update, simulate } = useTracker()
  const navigate = useNavigate()
  const course = tracker.courses.find((c) => c.id === courseId)

  if (!ready) return <div className="skeleton h-96" />
  if (!course)
    return (
      <EmptyState icon={<ArrowLeft className="h-6 w-6" />} title="Class not found" body="It may have been removed or replaced by an import.">
        <Link to="/" className="btn btn-ink">Back to dashboard</Link>
      </EmptyState>
    )

  const patch = (p: Partial<Course>) =>
    update((t) => ({ ...t, courses: t.courses.map((c) => (c.id === course.id ? { ...c, ...p } : c)) }))
  const patchAssignment = (id: string, p: Partial<Assignment>) =>
    patch({ assignments: course.assignments.map((a) => (a.id === id ? { ...a, ...p } : a)) })
  const removeAssignment = (id: string) => patch({ assignments: course.assignments.filter((a) => a.id !== id) })

  const real = breakdown(counted(course, false))
  const projected = breakdown(counted(course, true))
  const realGrade = course.assignments.some((a) => !a.simulated) ? real.grade : course.manualGrade
  const sims = course.assignments.filter((a) => a.simulated)
  const projGrade = sims.length ? projected.grade : realGrade
  const shown = simulate ? projected : real
  const shownGrade = simulate ? projGrade : realGrade

  return (
    <div className="space-y-8">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Dashboard
      </Link>

      {/* Heading + settings */}
      <section className="card rise p-6 sm:p-8">
        <div className="flex flex-wrap items-start gap-6">
          <LetterBadge grade={shownGrade} size="lg" />
          <div className="min-w-0 flex-1">
            <input
              className="w-full bg-transparent font-display text-3xl font-extrabold tracking-tight outline-none focus:underline decoration-line sm:text-4xl"
              value={course.name}
              onChange={(e) => patch({ name: e.target.value })}
              aria-label="Class name"
            />
            <p className="mt-1 text-sm text-ink-3">
              {LEVEL_LABEL[course.level]} · tests 80% · quizzes 20%
            </p>
          </div>
          <div className="text-right">
            <p className={`num text-5xl font-semibold ${tone(shownGrade).text}`}>{fmt(shownGrade, 2)}</p>
            {sims.length > 0 && (
              <p className="mt-1 text-xs text-ink-3">
                {simulate ? 'actual' : 'with what-ifs'}{' '}
                <span className="num font-semibold text-ink-2">{fmt(simulate ? realGrade : projGrade, 2)}</span>{' '}
                <Delta value={projGrade !== null && realGrade !== null ? (simulate ? realGrade - projGrade : projGrade - realGrade) : null} />
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-4 border-t border-line pt-6 sm:grid-cols-2 lg:grid-cols-5">
          <Stat label="Test average" value={shown.testAvg} sub={`${shown.testCount} × 80%`} />
          <Stat label="Quiz average" value={shown.quizAvg} sub={`${shown.quizCount} × 20%`} />
          <div>
            <label className="label" htmlFor="level">Level</label>
            <select id="level" className="input" value={course.level} onChange={(e) => patch({ level: e.target.value as Level })}>
              <option value="regular">Regular</option>
              <option value="honors">Honors (+0.5)</option>
              <option value="ap">AP / IB (+1.0)</option>
            </select>
          </div>
          <div>
            <span className="label">Target grade</span>
            <NumberField value={course.target} onChange={(v) => patch({ target: v })} placeholder="none" ariaLabel="Target grade" />
          </div>
          <div>
            <span className="label">Grade if no assignments</span>
            <NumberField value={course.manualGrade} onChange={(v) => patch({ manualGrade: v })} placeholder="—" ariaLabel="Manual grade" />
          </div>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        {/* Assignments */}
        <section>
          <SectionTitle kicker="Gradebook" title="Assignments" />
          <AddAssignment onAdd={(a) => patch({ assignments: [...course.assignments, a] })} />

          {course.assignments.length === 0 ? (
            <p className="mt-6 text-sm text-ink-3">No quizzes or tests yet. Add the first one above.</p>
          ) : (
            <div className="card mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.1em] text-ink-3">
                    <th className="px-4 py-3 font-semibold">Type</th>
                    <th className="px-2 py-3 font-semibold">Name</th>
                    <th className="px-2 py-3 text-right font-semibold">Score</th>
                    <th className="px-2 py-3 text-right font-semibold" title="How much this grade moves your class grade">Impact</th>
                    <th className="px-4 py-3"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {course.assignments.map((a) => (
                    <tr key={a.id} className={`border-b border-line/60 last:border-0 ${a.simulated ? 'bg-sim-soft/50' : ''}`}>
                      <td className="px-4 py-2">
                        <button
                          type="button"
                          className={`rounded-md px-2 py-1 text-xs font-semibold ${a.kind === 'test' ? 'bg-ink text-paper' : 'bg-paper-2 text-ink-2'}`}
                          onClick={() => patchAssignment(a.id, { kind: a.kind === 'test' ? 'quiz' : 'test' })}
                          title="Switch between quiz and test"
                        >
                          {a.kind === 'test' ? 'Test' : 'Quiz'}
                        </button>
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-2">
                          {a.simulated && <FlaskConical className="h-3.5 w-3.5 shrink-0 text-sim" aria-label="What-if grade" />}
                          <input
                            className="w-full min-w-28 bg-transparent outline-none focus:underline"
                            value={a.name}
                            onChange={(e) => patchAssignment(a.id, { name: e.target.value })}
                            aria-label="Assignment name"
                          />
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <NumberField
                          className="!w-20 ml-auto text-right !py-1"
                          value={a.score}
                          onChange={(v) => patchAssignment(a.id, { score: v ?? 0 })}
                          ariaLabel={`${a.name} score`}
                        />
                      </td>
                      <td className="px-2 py-2 text-right">
                        <Delta value={impact(course, a.id, simulate || !!a.simulated)} digits={2} />
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex justify-end gap-1">
                          {a.simulated && (
                            <button
                              type="button"
                              className="rounded-md px-2 py-1 text-xs font-semibold text-sim hover:bg-sim-soft"
                              onClick={() => patchAssignment(a.id, { simulated: false })}
                              title="Turn this what-if into a real grade"
                            >
                              Make real
                            </button>
                          )}
                          <button
                            type="button"
                            className="rounded-md p-1.5 text-ink-3 hover:bg-pen-soft hover:text-pen"
                            onClick={() => removeAssignment(a.id)}
                            aria-label={`Delete ${a.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {sims.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-3">
              <span>
                {sims.length} what-if grade{sims.length > 1 ? 's' : ''} — {simulate ? 'included' : 'not included'} in your GPA.
                Toggle <strong>What-if</strong> in the header to switch.
              </span>
              <button type="button" className="font-semibold text-pen hover:underline" onClick={() => patch({ assignments: course.assignments.filter((a) => !a.simulated) })}>
                Clear what-ifs
              </button>
            </div>
          )}

          <div className="mt-8 flex justify-end">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-3 hover:text-pen"
              onClick={() => {
                if (!confirm(`Delete ${course.name} and all its grades?`)) return
                update((t) => ({ ...t, courses: t.courses.filter((c) => c.id !== course.id) }))
                navigate({ to: '/' })
              }}
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete class
            </button>
          </div>
        </section>

        {/* Inline calculator */}
        <aside className="space-y-4">
          <QuickCalc key={course.id} course={course} simulate={simulate} />
        </aside>
      </div>
    </div>
  )
}

function Stat({ label, value, sub }: { label: string; value: number | null; sub: string }) {
  return (
    <div>
      <p className="label">{label}</p>
      <p className={`num text-2xl font-semibold ${tone(value).text}`}>{fmt(value)}</p>
      <p className="text-xs text-ink-3">{sub}</p>
    </div>
  )
}

function AddAssignment({ onAdd }: { onAdd: (a: Assignment) => void }) {
  const [kind, setKind] = useState<Kind>('quiz')
  const [name, setName] = useState('')
  const [score, setScore] = useState<number | null>(null)
  const [whatIf, setWhatIf] = useState(false)

  return (
    <form
      className={`card grid gap-3 p-4 sm:grid-cols-[auto_1fr_6rem_auto_auto] sm:items-center ${whatIf ? 'border-sim/50 bg-sim-soft/40' : ''}`}
      onSubmit={(e) => {
        e.preventDefault()
        if (score === null) return
        onAdd({ id: uid(), kind, name: name.trim() || (kind === 'test' ? 'Test' : 'Quiz'), score, simulated: whatIf || undefined })
        setName('')
        setScore(null)
      }}
    >
      <div className="flex rounded-lg bg-paper-2 p-1 text-xs font-semibold" role="radiogroup" aria-label="Assignment type">
        {(['quiz', 'test'] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={kind === k}
            onClick={() => setKind(k)}
            className={`rounded-md px-3 py-1.5 transition ${kind === k ? 'bg-ink text-paper' : 'text-ink-2'}`}
          >
            {k === 'quiz' ? 'Quiz · 20%' : 'Test · 80%'}
          </button>
        ))}
      </div>
      <input className="input" placeholder={kind === 'test' ? 'Unit 3 test' : 'Vocab quiz'} value={name} onChange={(e) => setName(e.target.value)} aria-label="Assignment name" />
      <NumberField value={score} onChange={setScore} placeholder="Score" ariaLabel="Score" />
      <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-sim">
        <input type="checkbox" className="accent-[#6b4fa0]" checked={whatIf} onChange={(e) => setWhatIf(e.target.checked)} />
        What-if
      </label>
      <button className={`btn ${whatIf ? 'bg-sim text-white' : 'btn-ink'}`} disabled={score === null}>
        {whatIf ? <Wand2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />} Add
      </button>
    </form>
  )
}

function QuickCalc({ course, simulate }: { course: Course; simulate: boolean }) {
  const [kind, setKind] = useState<Kind>('test')
  const [target, setTarget] = useState<number | null>(course.target ?? 90)
  const list = counted(course, simulate)

  return (
    <div className="card sticky top-24 p-6">
      <p className="label">Next-{kind} calculator</p>
      <div className="mb-5 mt-3 grid grid-cols-2 gap-3">
        <div>
          <span className="label">Goal</span>
          <NumberField value={target} onChange={setTarget} ariaLabel="Goal grade" />
        </div>
        <div>
          <label className="label" htmlFor="qc-kind">Next is a</label>
          <select id="qc-kind" className="input" value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
            <option value="test">Test</option>
            <option value="quiz">Quiz</option>
          </select>
        </div>
      </div>
      <NeededVerdict assignments={list} kind={kind} target={target} maxScore={100} compact />
      {!list.length && course.manualGrade !== null && (
        <p className="mt-4 text-xs text-ink-3">This class has no logged assignments, so this assumes the next {kind} is the first grade.</p>
      )}
      <Link to="/calculator" search={{ class: course.id }} className="mt-5 inline-block text-xs font-semibold text-slate hover:underline">
        Open full calculator →
      </Link>
    </div>
  )
}
