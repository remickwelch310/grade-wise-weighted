import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Calculator, FlaskConical } from 'lucide-react'
import {
  breakdown,
  counted,
  fmt,
  fmtGpa,
  letter,
  neededScore,
  uid,
  weightedPoints,
  yearGpa,
} from '@/lib/grades'
import type { Kind, Tracker } from '@/lib/grades'
import { useTracker } from '@/lib/store'
import { Delta, EmptyState, NumberField, SectionTitle, tone } from '@/components/ui'
import { NeededVerdict } from '@/components/NeededVerdict'

export const Route = createFileRoute('/calculator')({
  validateSearch: (s: Record<string, unknown>): { class?: string } =>
    typeof s.class === 'string' ? { class: s.class } : {},
  component: CalculatorPage,
})

const CUTOFFS = [
  { grade: 90, label: 'A' },
  { grade: 80, label: 'B' },
  { grade: 70, label: 'C' },
  { grade: 60, label: 'D' },
]

function CalculatorPage() {
  const search = Route.useSearch()
  const { tracker, ready, simulate, update } = useTracker()
  const [courseId, setCourseId] = useState<string | undefined>(search.class)
  const [kind, setKind] = useState<Kind>('test')
  const [targets, setTargets] = useState<Record<string, number | null>>({})
  const [maxScore, setMaxScore] = useState<number | null>(100)
  const [trial, setTrial] = useState(85)
  const [saved, setSaved] = useState(false)

  if (!ready) return <div className="skeleton h-96" />
  if (!tracker.courses.length)
    return (
      <EmptyState icon={<Calculator className="h-6 w-6" />} title="Add a class first" body="The calculator works from the quizzes and tests you've logged.">
        <Link to="/" className="btn btn-ink">Go to dashboard</Link>
      </EmptyState>
    )

  const course = tracker.courses.find((c) => c.id === courseId) ?? tracker.courses[0]
  const target = course.id in targets ? targets[course.id] : (course.target ?? 90)
  const setTarget = (v: number | null) => setTargets((m) => ({ ...m, [course.id]: v }))
  const cap = maxScore ?? 100
  const list = counted(course, simulate)
  const now = breakdown(list)
  const current = list.length ? now.grade : course.manualGrade

  // "What if I score X?" simulation
  const withTrial = [...list, { id: 'trial', kind, name: 'trial', score: trial }]
  const trialGrade = breakdown(withTrial).grade
  const trialTracker: Tracker = {
    ...tracker,
    courses: tracker.courses.map((c) =>
      c.id === course.id ? { ...c, assignments: [...counted(c, simulate), { id: 'trial', kind, name: 'trial', score: trial }] } : c,
    ),
  }
  const gpaNow = yearGpa(tracker, simulate).weighted
  const gpaTrial = yearGpa(trialTracker, simulate).weighted

  return (
    <div className="space-y-10">
      <div className="rise">
        <p className="label">Next-grade calculator</p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">What do I need?</h1>
        <p className="mt-2 max-w-xl text-ink-2">
          Pick a class and a goal. The answer accounts for the 80/20 split — one test moves your grade far more than
          one quiz.
        </p>
      </div>

      <section className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="card space-y-5 p-6">
          <div>
            <label className="label" htmlFor="calc-class">Class</label>
            <select
              id="calc-class"
              className="input"
              value={course.id}
              onChange={(e) => {
                setCourseId(e.target.value)
                setSaved(false)
              }}
            >
              {tracker.courses.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <p className="mt-2 text-xs text-ink-3">
              Currently <span className={`num font-semibold ${tone(current).text}`}>{fmt(current, 2)}</span> · tests{' '}
              <span className="num">{fmt(now.testAvg)}</span> ({now.testCount}) · quizzes{' '}
              <span className="num">{fmt(now.quizAvg)}</span> ({now.quizCount})
              {simulate && ' · including what-ifs'}
            </p>
          </div>

          <div>
            <span className="label">Next assessment</span>
            <div className="flex rounded-lg bg-paper-2 p-1 text-sm font-semibold" role="radiogroup">
              {(['test', 'quiz'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={kind === k}
                  onClick={() => setKind(k)}
                  className={`flex-1 rounded-md py-2 transition ${kind === k ? 'bg-ink text-paper' : 'text-ink-2'}`}
                >
                  {k === 'test' ? 'Test (80%)' : 'Quiz (20%)'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="label">Goal class grade</span>
              <NumberField value={target} onChange={setTarget} ariaLabel="Goal grade" className="!text-lg" />
            </div>
            <div>
              <span className="label">Max possible score</span>
              <NumberField value={maxScore} onChange={setMaxScore} ariaLabel="Maximum score" className="!text-lg" />
            </div>
          </div>
          <p className="text-xs text-ink-3">Raise the max score if the {kind} offers extra credit.</p>
        </div>

        <div className="card relative overflow-hidden p-6 sm:p-8">
          <NeededVerdict assignments={list} kind={kind} target={target} maxScore={cap} />
          <div className="mt-8 border-t border-line pt-5">
            <p className="label">Score needed on the next {kind} for each letter</p>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {CUTOFFS.map((c) => {
                const r = neededScore(list, kind, c.grade, cap)
                return (
                  <div key={c.label} className={`rounded-xl p-3 text-center ${tone(c.grade).bg}`}>
                    <p className={`font-display text-lg font-extrabold ${tone(c.grade).text}`}>{c.label}</p>
                    <p className="num mt-1 text-sm font-semibold">
                      {r.status === 'impossible' ? <span className="text-pen">n/a</span> : r.status === 'guaranteed' ? 'safe' : fmt(Math.ceil(r.score * 10) / 10)}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Simulator */}
      <section className="card p-6 sm:p-8">
        <SectionTitle
          kicker="Simulator"
          title={<>If I get <span className="num text-pen">{trial}</span> on the next {kind}…</>}
        />
        <input
          type="range"
          min={0}
          max={Math.max(100, cap)}
          value={trial}
          onChange={(e) => {
            setTrial(Number(e.target.value))
            setSaved(false)
          }}
          className="w-full accent-[#b5412c]"
          aria-label="Trial score"
        />
        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          <div>
            <p className="label">{course.name}</p>
            <p className={`num text-4xl font-semibold ${tone(trialGrade).text}`}>{fmt(trialGrade, 2)}</p>
            <p className="text-sm">
              <Delta value={trialGrade !== null && current !== null ? trialGrade - current : null} digits={2} />{' '}
              <span className="text-ink-3">· {letter(trialGrade)}</span>
            </p>
          </div>
          <div>
            <p className="label">Class GPA points</p>
            <p className="num text-4xl font-semibold">{trialGrade === null ? '—' : weightedPoints(trialGrade, course.level).toFixed(1)}</p>
            <p className="text-sm text-ink-3">
              now {current === null ? '—' : weightedPoints(current, course.level).toFixed(1)} weighted
            </p>
          </div>
          <div>
            <p className="label">Year GPA (weighted)</p>
            <p className="num text-4xl font-semibold">{fmtGpa(gpaTrial)}</p>
            <p className="text-sm">
              <Delta value={gpaTrial !== null && gpaNow !== null ? gpaTrial - gpaNow : null} digits={2} /> <span className="text-ink-3">from {fmtGpa(gpaNow)}</span>
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="btn bg-sim text-white hover:brightness-110"
            disabled={saved}
            onClick={() => {
              update((t) => ({
                ...t,
                courses: t.courses.map((c) =>
                  c.id === course.id
                    ? {
                        ...c,
                        assignments: [
                          ...c.assignments,
                          { id: uid(), kind, name: `What-if ${kind}`, score: trial, simulated: true },
                        ],
                      }
                    : c,
                ),
              }))
              setSaved(true)
            }}
          >
            <FlaskConical className="h-4 w-4" /> {saved ? 'Saved as what-if' : 'Save as what-if grade'}
          </button>
          <Link to="/class/$courseId" params={{ courseId: course.id }} className="text-sm font-semibold text-slate hover:underline">
            View {course.name} →
          </Link>
        </div>
      </section>
    </div>
  )
}
