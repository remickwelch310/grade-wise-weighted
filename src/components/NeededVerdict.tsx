import { CheckCircle2, CircleSlash, Crosshair } from 'lucide-react'
import { fmt, letter, neededScore } from '@/lib/grades'
import type { Assignment, Kind } from '@/lib/grades'

/** Big verdict for "what do I need on my next quiz/test to reach `target`?" */
export function NeededVerdict({
  assignments,
  kind,
  target,
  maxScore,
  compact = false,
}: {
  assignments: Assignment[]
  kind: Kind
  target: number | null
  maxScore: number
  compact?: boolean
}) {
  const noun = kind === 'test' ? 'test' : 'quiz'
  if (target === null)
    return <p className="text-sm text-ink-3">Enter a target grade to see what you need.</p>

  const r = neededScore(assignments, kind, target, maxScore)
  const size = compact ? 'text-5xl' : 'text-7xl sm:text-8xl'

  if (r.status === 'impossible')
    return (
      <div className="rise" key={`${kind}-${target}-${maxScore}`}>
        <div className="flex items-center gap-2 text-pen">
          <CircleSlash className="h-5 w-5" />
          <span className="label !mb-0 !text-pen">Not possible on the next {noun}</span>
        </div>
        <p className={`num mt-2 font-display font-extrabold text-pen line-through decoration-2 ${size}`}>{fmt(target)}</p>
        <p className="mt-3 text-sm text-ink-2">
          Even a perfect <span className="num font-semibold">{fmt(maxScore, 0)}</span> on your next {noun} only brings
          you to <span className="num font-semibold text-ink">{fmt(r.best, 2)}</span> ({letter(r.best)}). It will take
          more than one {noun} to get there.
        </p>
      </div>
    )

  if (r.status === 'guaranteed')
    return (
      <div className="rise" key={`${kind}-${target}-${maxScore}`}>
        <div className="flex items-center gap-2 text-sage">
          <CheckCircle2 className="h-5 w-5" />
          <span className="label !mb-0 !text-sage">Already locked in</span>
        </div>
        <p className={`num mt-2 font-display font-extrabold text-sage ${size}`}>0</p>
        <p className="mt-3 text-sm text-ink-2">
          Even a 0 on your next {noun} leaves you at <span className="num font-semibold text-ink">{fmt(r.floor, 2)}</span>
          , which still meets your {fmt(target)} target.
        </p>
      </div>
    )

  return (
    <div className="rise" key={`${kind}-${target}-${maxScore}`}>
      <div className="flex items-center gap-2 text-slate">
        <Crosshair className="h-5 w-5" />
        <span className="label !mb-0 !text-slate">You need at least</span>
      </div>
      <p className={`num mt-2 font-display font-extrabold ${size}`}>
        {fmt(Math.ceil(r.score * 10) / 10)}
        <span className="ml-1 text-2xl text-ink-3">%</span>
      </p>
      <p className="mt-3 text-sm text-ink-2">
        on your next {noun} to finish at <span className="num font-semibold text-ink">{fmt(target)}</span> or higher.
      </p>
    </div>
  )
}
