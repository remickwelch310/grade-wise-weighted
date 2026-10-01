import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { ArrowUpRight, BookOpen, Sparkles, Target, Upload } from 'lucide-react'
import {
  breakdown,
  counted,
  courseGrade,
  cumulativeGpa,
  fmt,
  fmtGpa,
  LEVEL_LABEL,
  neededScore,
  yearGpa,
} from '@/lib/grades'
import type { Course } from '@/lib/grades'
import { useTracker } from '@/lib/store'
import { sampleTracker } from '@/lib/sample'
import { Delta, EmptyState, LetterBadge, SectionTitle, tone } from '@/components/ui'
import { AddCourse } from '@/components/AddCourse'
import { GradeChart } from '@/components/GradeChart'

export const Route = createFileRoute('/')({
  component: Dashboard,
})

function Dashboard() {
  const { tracker, ready, simulate, replace } = useTracker()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!ready) return <DashboardSkeleton />

  if (!tracker.courses.length && !tracker.pastCourses.length) {
    return (
      <div className="mx-auto max-w-2xl">
        <Intro />
        <EmptyState
          icon={<BookOpen className="h-6 w-6" />}
          title="Start your gradebook"
          body="Import the grade-tracker spreadsheet you already keep, or add classes one at a time. Quizzes count 20% and tests 80% of every class grade."
        >
          <Link to="/import" className="btn btn-ink">
            <Upload className="h-4 w-4" /> Import a sheet
          </Link>
          <button type="button" className="btn btn-ghost" onClick={() => replace(sampleTracker())}>
            <Sparkles className="h-4 w-4" /> Explore with sample grades
          </button>
        </EmptyState>
        <div className="mt-6">
          <AddCourse />
        </div>
      </div>
    )
  }

  const year = yearGpa(tracker, simulate)
  const yearReal = yearGpa(tracker, false)
  const cum = cumulativeGpa(tracker, simulate)
  const cumReal = cumulativeGpa(tracker, false)
  const onTarget = tracker.courses.filter((c) => {
    const g = courseGrade(c, simulate)
    return c.target !== null && g !== null && g >= c.target
  }).length
  const withTarget = tracker.courses.filter((c) => c.target !== null).length

  const delta = (a: number | null, b: number | null) => (simulate && a !== null && b !== null ? a - b : null)

  return (
    <div className="space-y-10">
      {/* GPA hero */}
      <section className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <div className="card rise relative overflow-hidden p-6 sm:p-8">
          <p className="label">{tracker.schoolYear} school year · weighted GPA</p>
          <div className="mt-4 flex flex-wrap items-end gap-x-10 gap-y-6">
            <div>
              <span className="pen-circle num inline-block font-display text-7xl font-extrabold sm:text-8xl">
                {fmtGpa(year.weighted)}
              </span>
              {simulate && (
                <div className="mt-3 text-sm">
                  <Delta value={delta(year.weighted, yearReal.weighted)} digits={2} /> <span className="text-ink-3">vs. actual</span>
                </div>
              )}
            </div>
            <dl className="grid grid-cols-2 gap-x-8 gap-y-3 pb-2 text-sm">
              <dt className="text-ink-3">Unweighted</dt>
              <dd className="num text-right text-lg font-semibold">{fmtGpa(year.base)}</dd>
              <dt className="text-ink-3">Classes counted</dt>
              <dd className="num text-right text-lg font-semibold">{year.count}</dd>
              <dt className="text-ink-3">On target</dt>
              <dd className="num text-right text-lg font-semibold">
                {withTarget ? `${onTarget}/${withTarget}` : '—'}
              </dd>
            </dl>
          </div>
          <p className="mt-6 max-w-md text-xs text-ink-3">
            90+ = 4.0 · 80+ = 3.0 · 70+ = 2.0 · 60+ = 1.0. AP/IB adds 1.0, Honors adds 0.5.
          </p>
        </div>

        <div className="card rise flex flex-col justify-between bg-ink p-6 text-paper sm:p-8" style={{ animationDelay: '80ms' }}>
          <div>
            <p className="label !text-paper/60">Cumulative GPA · all years</p>
            <div className="mt-3 flex items-baseline gap-4">
              <span className="num font-display text-6xl font-extrabold">{fmtGpa(cum.weighted)}</span>
              <span className="text-sm text-paper/70">weighted</span>
            </div>
            {simulate && (
              <p className="mt-1 text-sm">
                <Delta value={delta(cum.weighted, cumReal.weighted)} digits={2} /> <span className="text-paper/60">vs. actual</span>
              </p>
            )}
          </div>
          <div className="mt-6 flex items-end justify-between border-t border-paper/15 pt-4 text-sm">
            <div>
              <p className="text-paper/60">Unweighted</p>
              <p className="num text-2xl font-semibold">{fmtGpa(cum.base)}</p>
            </div>
            <div className="text-right">
              <p className="text-paper/60">Classes</p>
              <p className="num text-2xl font-semibold">{cum.count}</p>
            </div>
            <Link to="/history" className="btn border border-paper/25 text-xs text-paper hover:bg-paper/10">
              Past classes <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Classes */}
      <section>
        <SectionTitle kicker="This year" title="Your classes" />
        {tracker.courses.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tracker.courses.map((c, i) => (
              <CourseCard key={c.id} course={c} simulate={simulate} delay={i * 50} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-2">No current classes yet — add one below.</p>
        )}
        <div className="mt-4">
          <AddCourse />
        </div>
      </section>

      {/* Chart */}
      {mounted && tracker.courses.length > 0 && (
        <section className="card p-6">
          <SectionTitle kicker="Snapshot" title="Grades against your targets" />
          <GradeChart
            rows={tracker.courses.map((c) => ({
              label: c.name,
              grade: courseGrade(c, simulate),
              target: c.target,
              simulated: simulate && c.assignments.some((a) => a.simulated),
            }))}
          />
        </section>
      )}
    </div>
  )
}

function Intro() {
  return (
    <div className="rise mb-8">
      <p className="label">Grade & GPA tracker</p>
      <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
        Know your grade <span className="italic text-pen">before</span> the report card does.
      </h1>
      <p className="mt-4 max-w-xl text-ink-2">
        Log quizzes and tests, watch your year and cumulative GPA update instantly, try out what-if scores, and find
        the exact score you need on your next test.
      </p>
    </div>
  )
}

function CourseCard({ course, simulate, delay }: { course: Course; simulate: boolean; delay: number }) {
  const list = counted(course, simulate)
  const b = breakdown(list)
  const grade = list.length ? b.grade : course.manualGrade
  const real = courseGrade(course, false)
  const t = tone(grade)
  const need =
    course.target !== null && list.length ? neededScore(list, 'test', course.target) : null
  const simCount = course.assignments.filter((a) => a.simulated).length

  return (
    <Link
      to="/class/$courseId"
      params={{ courseId: course.id }}
      className="card rise group block p-5 transition hover:-translate-y-0.5 hover:border-ink-3"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-display text-lg font-semibold">{course.name}</h3>
          <p className="text-xs text-ink-3">
            {LEVEL_LABEL[course.level]}
            {simCount > 0 && <span className="ml-2 rounded bg-sim-soft px-1.5 py-0.5 font-semibold text-sim">{simCount} what-if</span>}
          </p>
        </div>
        <LetterBadge grade={grade} />
      </div>

      <div className="mt-4 flex items-baseline gap-3">
        <span className={`num text-4xl font-semibold ${t.text}`}>{fmt(grade)}</span>
        {simulate && simCount > 0 && <Delta value={grade !== null && real !== null ? grade - real : null} />}
        {course.target !== null && grade !== null && (
          <span className="ml-auto flex items-center gap-1 text-xs text-ink-3">
            <Target className="h-3.5 w-3.5" /> {fmt(course.target, 0)} <Delta value={grade - course.target} />
          </span>
        )}
      </div>

      {list.length > 0 ? (
        <div className="mt-4 space-y-1.5">
          <Meter label="Tests" sub="80%" value={b.testAvg} count={b.testCount} />
          <Meter label="Quizzes" sub="20%" value={b.quizAvg} count={b.quizCount} />
        </div>
      ) : (
        <p className="mt-4 text-xs text-ink-3">
          {course.manualGrade !== null ? 'Grade entered directly — no assignments logged.' : 'No grades yet.'}
        </p>
      )}

      {need && (
        <p className="mt-4 border-t border-dashed border-line pt-3 text-xs text-ink-2">
          {need.status === 'possible' && (
            <>
              Next test: need <strong className="num text-ink">{fmt(need.score)}</strong> to hit {fmt(course.target, 0)}
            </>
          )}
          {need.status === 'guaranteed' && <>Target locked in — even a 0 on the next test keeps you there.</>}
          {need.status === 'impossible' && (
            <span className="text-pen">
              Target out of reach on the next test (best case {fmt(need.best)})
            </span>
          )}
        </p>
      )}
    </Link>
  )
}

function Meter({ label, sub, value, count }: { label: string; sub: string; value: number | null; count: number }) {
  const t = tone(value)
  return (
    <div className="grid grid-cols-[4.5rem_1fr_3rem] items-center gap-2 text-xs">
      <span className="text-ink-2">
        {label} <span className="text-ink-3">{sub}</span>
      </span>
      <span className="h-1.5 overflow-hidden rounded-full bg-paper-2">
        <span
          className="block h-full rounded-full transition-[width] duration-500"
          style={{ width: `${Math.min(100, value ?? 0)}%`, background: t.bar }}
        />
      </span>
      <span className="num text-right text-ink-2" title={`${count} graded`}>
        {value === null ? '—' : fmt(value)}
      </span>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading your grades">
      <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <div className="skeleton h-64" />
        <div className="skeleton h-64" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton h-48" />
        ))}
      </div>
    </div>
  )
}
