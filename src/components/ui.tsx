import type { ReactNode } from 'react'
import { letter } from '@/lib/grades'

export function tone(grade: number | null) {
  if (grade === null) return { text: 'text-ink-3', bg: 'bg-paper-2', bar: '#8a8d96' }
  if (grade >= 90) return { text: 'text-sage', bg: 'bg-sage-soft', bar: '#3d6b4b' }
  if (grade >= 80) return { text: 'text-slate', bg: 'bg-slate-soft', bar: '#2f4b77' }
  if (grade >= 70) return { text: 'text-ochre', bg: 'bg-ochre-soft', bar: '#a87a1f' }
  return { text: 'text-pen', bg: 'bg-pen-soft', bar: '#b5412c' }
}

export function LetterBadge({ grade, size = 'md' }: { grade: number | null; size?: 'md' | 'lg' }) {
  const t = tone(grade)
  const dims = size === 'lg' ? 'h-14 w-14 text-3xl' : 'h-9 w-9 text-lg'
  return (
    <span
      className={`${t.bg} ${t.text} ${dims} inline-grid shrink-0 place-items-center rounded-full font-display font-extrabold`}
      aria-label={`Letter grade ${letter(grade)}`}
    >
      {letter(grade)}
    </span>
  )
}

export function Delta({ value, digits = 1, suffix = '' }: { value: number | null; digits?: number; suffix?: string }) {
  if (value === null || Math.abs(value) < 10 ** -digits / 2) return <span className="num text-ink-3">±0{suffix}</span>
  const up = value > 0
  return (
    <span className={`num font-semibold ${up ? 'text-sage' : 'text-pen'}`}>
      {up ? '+' : '−'}
      {Math.abs(value).toFixed(digits)}
      {suffix}
    </span>
  )
}

export function SectionTitle({ kicker, title, action }: { kicker?: string; title: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        {kicker && <p className="label mb-1">{kicker}</p>}
        <h2 className="font-display text-2xl font-semibold tracking-tight">{title}</h2>
      </div>
      {action}
    </div>
  )
}

export function NumberField({
  value,
  onChange,
  placeholder,
  className = '',
  min,
  max,
  step = 'any',
  ariaLabel,
}: {
  value: number | null
  onChange: (v: number | null) => void
  placeholder?: string
  className?: string
  min?: number
  max?: number
  step?: number | 'any'
  ariaLabel?: string
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      className={`input num ${className}`}
      value={value ?? ''}
      placeholder={placeholder}
      min={min}
      max={max}
      step={step}
      aria-label={ariaLabel}
      onChange={(e) => {
        const v = e.target.value
        onChange(v === '' ? null : Number(v))
      }}
    />
  )
}

export function EmptyState({ icon, title, body, children }: { icon: ReactNode; title: string; body: string; children?: ReactNode }) {
  return (
    <div className="card rise flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-paper-2 text-ink-2">{icon}</div>
      <h3 className="font-display text-xl font-semibold">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-ink-2">{body}</p>
      {children && <div className="mt-6 flex flex-wrap justify-center gap-3">{children}</div>}
    </div>
  )
}
