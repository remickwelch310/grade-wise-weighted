import { useState } from 'react'
import { Plus } from 'lucide-react'
import { uid } from '@/lib/grades'
import type { Level } from '@/lib/grades'
import { useTracker } from '@/lib/store'
import { NumberField } from './ui'

export function AddCourse() {
  const { update } = useTracker()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [level, setLevel] = useState<Level>('regular')
  const [target, setTarget] = useState<number | null>(90)
  const [manual, setManual] = useState<number | null>(null)

  if (!open)
    return (
      <button type="button" className="btn btn-ghost w-full border-dashed py-3 text-ink-2" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Add a class
      </button>
    )

  return (
    <form
      className="card rise grid gap-4 p-5 sm:grid-cols-[2fr_1fr_1fr_1fr_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault()
        if (!name.trim()) return
        update((t) => ({
          ...t,
          courses: [
            ...t.courses,
            { id: uid(), name: name.trim(), level, target, manualGrade: manual, assignments: [] },
          ],
        }))
        setName('')
        setManual(null)
        setOpen(false)
      }}
    >
      <div>
        <label className="label" htmlFor="new-class">Class name</label>
        <input id="new-class" autoFocus className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. AP Chemistry" />
      </div>
      <div>
        <label className="label" htmlFor="new-level">Level</label>
        <select id="new-level" className="input" value={level} onChange={(e) => setLevel(e.target.value as Level)}>
          <option value="regular">Regular</option>
          <option value="honors">Honors (+0.5)</option>
          <option value="ap">AP / IB (+1.0)</option>
        </select>
      </div>
      <div>
        <span className="label">Target grade</span>
        <NumberField value={target} onChange={setTarget} placeholder="90" ariaLabel="Target grade" />
      </div>
      <div>
        <span className="label">Grade (optional)</span>
        <NumberField value={manual} onChange={setManual} placeholder="if no assignments" ariaLabel="Current grade" />
      </div>
      <div className="flex gap-2">
        <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
        <button className="btn btn-ink" disabled={!name.trim()}>Add</button>
      </div>
    </form>
  )
}
