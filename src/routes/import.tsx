import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { AlertTriangle, FileSpreadsheet, Loader2, Upload } from 'lucide-react'
import { courseGrade, fmt, LEVEL_LABEL } from '@/lib/grades'
import type { Tracker } from '@/lib/grades'
import { importFile } from '@/lib/importSheet'
import type { ImportResult } from '@/lib/importSheet'
import { useTracker } from '@/lib/store'
import { LetterBadge, SectionTitle } from '@/components/ui'

export const Route = createFileRoute('/import')({
  component: ImportPage,
})

type Mode = 'replace' | 'merge'

const key = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

function apply(t: Tracker, r: ImportResult, mode: Mode): Tracker {
  if (mode === 'replace') return { ...t, courses: r.courses, pastCourses: r.pastCourses }
  const courses = [...t.courses]
  for (const c of r.courses) {
    const i = courses.findIndex((x) => key(x.name) === key(c.name))
    if (i >= 0) courses[i] = { ...c, id: courses[i].id }
    else courses.push(c)
  }
  const pastCourses = [...t.pastCourses]
  for (const p of r.pastCourses) {
    const i = pastCourses.findIndex((x) => key(x.name) === key(p.name))
    if (i >= 0) pastCourses[i] = { ...p, id: pastCourses[i].id }
    else pastCourses.push(p)
  }
  return { ...t, courses, pastCourses }
}

function ImportPage() {
  const { tracker, update } = useTracker()
  const navigate = useNavigate()
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [drag, setDrag] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')
  const [result, setResult] = useState<ImportResult | null>(null)
  const hasData = tracker.courses.length + tracker.pastCourses.length > 0
  const [mode, setMode] = useState<Mode>('replace')

  const handle = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    setError(null)
    setResult(null)
    setFileName(file.name)
    try {
      setResult(await importFile(file))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read that file.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="rise">
        <p className="label">Import</p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">Bring in your grade sheet</h1>
        <p className="mt-2 max-w-2xl text-ink-2">
          Upload the spreadsheet you already keep. Download it from Google Sheets with{' '}
          <em>File → Download → Microsoft Excel (.xlsx)</em>. Your file is read right here in the browser.
        </p>
      </div>

      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDrag(true)
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDrag(false)
          handle(e.dataTransfer.files[0])
        }}
        className={`card flex w-full flex-col items-center gap-3 border-2 border-dashed px-6 py-14 text-center transition ${
          drag ? 'border-pen bg-pen-soft/40' : 'hover:border-ink-3'
        }`}
      >
        {busy ? <Loader2 className="h-8 w-8 animate-spin text-ink-2" /> : <Upload className="h-8 w-8 text-ink-2" />}
        <span className="font-display text-xl font-semibold">{busy ? 'Reading your sheet…' : 'Drop your .xlsx here, or click to choose'}</span>
        <span className="text-sm text-ink-3">.xlsx workbook (all tabs) or a .csv of one class</span>
        <input
          ref={input}
          type="file"
          accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
          className="hidden"
          onChange={(e) => {
            handle(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </button>

      {error && (
        <div className="card flex items-start gap-3 border-pen/40 bg-pen-soft/50 p-4 text-sm text-pen" role="alert">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {result && (
        <section className="rise space-y-6">
          <SectionTitle
            kicker={fileName}
            title={`Found ${result.courses.length} current class${result.courses.length === 1 ? '' : 'es'} and ${result.pastCourses.length} previous`}
          />

          {result.warnings.length > 0 && (
            <ul className="space-y-1 text-sm text-ochre">
              {result.warnings.map((w) => (
                <li key={w} className="flex gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {w}</li>
              ))}
            </ul>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {result.courses.map((c) => {
              const g = courseGrade(c)
              const tests = c.assignments.filter((a) => a.kind === 'test').length
              return (
                <div key={c.id} className="card flex items-center gap-3 p-4">
                  <LetterBadge grade={g} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{c.name}</p>
                    <p className="text-xs text-ink-3">
                      {LEVEL_LABEL[c.level]} ·{' '}
                      {c.assignments.length
                        ? `${tests} test${tests === 1 ? '' : 's'}, ${c.assignments.length - tests} quiz${c.assignments.length - tests === 1 ? '' : 'zes'}`
                        : 'grade only'}
                      {c.target !== null && ` · target ${fmt(c.target, 0)}`}
                    </p>
                  </div>
                  <span className="num text-lg font-semibold">{fmt(g)}</span>
                </div>
              )
            })}
          </div>

          {result.pastCourses.length > 0 && (
            <div className="card p-4">
              <p className="label">Previous classes</p>
              <div className="flex flex-wrap gap-2">
                {result.pastCourses.map((p) => (
                  <span key={p.id} className="rounded-full bg-paper-2 px-3 py-1 text-xs">
                    {p.name} <span className="num font-semibold">{fmt(p.grade, 0)}</span>
                    {p.level !== 'regular' && <span className="text-ink-3"> · {p.level === 'ap' ? 'AP/IB' : 'H'}</span>}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="card flex flex-wrap items-center justify-between gap-4 p-5">
            {hasData ? (
              <div className="flex rounded-lg bg-paper-2 p-1 text-sm font-semibold" role="radiogroup" aria-label="Import mode">
                {(
                  [
                    ['replace', 'Replace my gradebook'],
                    ['merge', 'Merge (update matching classes)'],
                  ] as const
                ).map(([m, label]) => (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={mode === m}
                    onClick={() => setMode(m)}
                    className={`rounded-md px-3 py-1.5 transition ${mode === m ? 'bg-ink text-paper' : 'text-ink-2'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : (
              <p className="flex items-center gap-2 text-sm text-ink-2">
                <FileSpreadsheet className="h-4 w-4" /> Looks good? This becomes your gradebook.
              </p>
            )}
            <button
              type="button"
              className="btn btn-pen"
              onClick={() => {
                update((t) => apply(t, result, hasData ? mode : 'replace'))
                navigate({ to: '/' })
              }}
            >
              Import grades
            </button>
          </div>
        </section>
      )}

      <section className="card p-6 text-sm text-ink-2">
        <h3 className="mb-3 font-display text-lg font-semibold text-ink">What the importer looks for</h3>
        <ul className="list-inside list-disc space-y-1.5">
          <li>
            A <strong>summary tab</strong> with a <code>Class</code> column, plus optional <code>Current Grade</code>,{' '}
            <code>AP?</code> (Yes / No / Honor) and <code>Target Grade</code> columns.
          </li>
          <li>
            A <code>Previous Class</code> table with <code>Grade</code> and <code>Weighted?</code> columns for your GPA history.
          </li>
          <li>
            One <strong>tab per class</strong>, named like the class, with <code>Test/Quiz</code>, <code>Name</code> and{' '}
            <code>Score</code> columns.
          </li>
          <li>Classes without their own tab (like band) keep the grade from the summary tab.</li>
        </ul>
      </section>
    </div>
  )
}
