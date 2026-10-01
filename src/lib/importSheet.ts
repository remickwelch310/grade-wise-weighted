// Browser-side importer for grade-tracker spreadsheets (.xlsx from Excel or
// Google Sheets, or a single-class .csv). It looks for:
//   • a summary tab with a "Class" column (+ grade, AP?/Weighted?, target) and
//     optionally a "Previous Class" table beside it
//   • one tab per class with "Test/Quiz", "Name", "Score" columns
// Columns are matched by header text, not position, so similar sheets work.
import { strFromU8, unzipSync } from 'fflate'
import { uid } from './grades'
import type { Assignment, Course, Kind, Level, PastCourse } from './grades'

type Cell = string | number | null
type Grid = Cell[][]

export interface ImportResult {
  courses: Course[]
  pastCourses: PastCourse[]
  warnings: string[]
}

const norm = (s: unknown) =>
  String(s ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')

const text = (c: Cell) => (c === null ? '' : String(c).trim())

const num = (c: Cell): number | null => {
  if (c === null || c === '') return null
  const n = typeof c === 'number' ? c : Number(String(c).replace(/[%\s]/g, ''))
  return Number.isFinite(n) ? n : null
}

function colIndex(ref: string) {
  const letters = ref.replace(/[0-9]/g, '')
  let n = 0
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n - 1
}

function parseXml(xml: string) {
  return new DOMParser().parseFromString(xml, 'application/xml')
}

const byTag = (el: Document | Element, tag: string) =>
  Array.from(el.getElementsByTagNameNS('*', tag))

function readXlsx(buf: ArrayBuffer): { name: string; grid: Grid }[] {
  const files = unzipSync(new Uint8Array(buf))
  const read = (p: string) => (files[p] ? strFromU8(files[p]) : null)

  const workbook = read('xl/workbook.xml')
  if (!workbook) throw new Error('This file does not look like an .xlsx spreadsheet.')

  const shared: string[] = []
  const ssXml = read('xl/sharedStrings.xml')
  if (ssXml) {
    for (const si of byTag(parseXml(ssXml), 'si')) {
      shared.push(byTag(si, 't').map((t) => t.textContent ?? '').join(''))
    }
  }

  const rels = new Map<string, string>()
  const relXml = read('xl/_rels/workbook.xml.rels')
  if (relXml) {
    for (const r of byTag(parseXml(relXml), 'Relationship')) {
      const target = r.getAttribute('Target') ?? ''
      rels.set(
        r.getAttribute('Id') ?? '',
        target.startsWith('/') ? target.slice(1) : `xl/${target}`,
      )
    }
  }

  return byTag(parseXml(workbook), 'sheet').flatMap((s, i) => {
    const rid =
      s.getAttributeNS(
        'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
        'id',
      ) ?? s.getAttribute('r:id')
    const path = (rid && rels.get(rid)) || `xl/worksheets/sheet${i + 1}.xml`
    const xml = read(path)
    if (!xml) return []
    const grid: Grid = []
    let nextRow = 0
    for (const row of byTag(parseXml(xml), 'row')) {
      const r = row.getAttribute('r') ? Number(row.getAttribute('r')) - 1 : nextRow
      nextRow = r + 1
      let nextCol = 0
      for (const c of byTag(row, 'c')) {
        const ref = c.getAttribute('r')
        const col = ref ? colIndex(ref) : nextCol
        nextCol = col + 1
        const type = c.getAttribute('t')
        const v = byTag(c, 'v')[0]?.textContent ?? null
        let value: Cell = null
        if (type === 's' && v !== null) value = shared[Number(v)] ?? null
        else if (type === 'inlineStr') value = byTag(c, 't').map((t) => t.textContent).join('')
        else if (type === 'e') value = null
        else if (type === 'str' || type === 'b') value = v
        else if (v !== null) value = Number.isFinite(Number(v)) ? Number(v) : v
        if (value === null || value === '') continue
        ;(grid[r] ??= [])[col] = value
      }
    }
    return [{ name: s.getAttribute('name') ?? `Sheet ${i + 1}`, grid }]
  })
}

function readCsv(src: string): Grid {
  const rows: Grid = []
  let row: Cell[] = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') (cur += '"'), i++
      else if (ch === '"') quoted = false
      else cur += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') row.push(cur), (cur = '')
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++
      row.push(cur), rows.push(row), (row = []), (cur = '')
    } else cur += ch
  }
  if (cur || row.length) row.push(cur), rows.push(row)
  return rows.map((r) => r.map((c) => (c.trim() === '' ? null : num(c) ?? c.trim())))
}

function parseLevel(flag: string, name: string): Level {
  const f = flag.toLowerCase()
  if (/honou?r/.test(f)) return 'honors'
  if (/^(yes|y|true|ap|ib|weighted|1)$/.test(f)) return 'ap'
  if (/^(no|n|false|0|regular)$/.test(f)) return 'regular'
  if (/^(ap|ib)\b/i.test(name.trim())) return 'ap'
  if (/honou?rs?\b/i.test(name)) return 'honors'
  return 'regular'
}

function parseKind(s: string): Kind | null {
  const t = s.toLowerCase()
  if (/test|exam|summative|lab/.test(t)) return 'test'
  if (/quiz|formative|hw|homework|classwork/.test(t)) return 'quiz'
  return null
}

interface Found {
  row: number
  col: number
}

function findHeader(grid: Grid, match: (s: string) => boolean, maxRows = 6): Found | null {
  for (let r = 0; r < Math.min(grid.length, maxRows); r++) {
    const row = grid[r] ?? []
    for (let c = 0; c < row.length; c++) if (match(norm(row[c]))) return { row: r, col: c }
  }
  return null
}

/** Headers of a contiguous table starting at `start` on the header row. */
function tableHeaders(grid: Grid, start: Found) {
  const row = grid[start.row] ?? []
  const out: { col: number; key: string }[] = []
  for (let c = start.col; c < row.length && text(row[c] ?? null); c++)
    out.push({ col: c, key: norm(row[c]) })
  return out
}

function parseAssignments(grid: Grid): Assignment[] | null {
  const typeH = findHeader(grid, (s) => /^(testquiz|quiztest|type|category|kind)$/.test(s))
  const scoreH = findHeader(grid, (s) => /^(score|grade|percent|mark)$/.test(s))
  if (!typeH || !scoreH) return null
  const nameH = findHeader(grid, (s) => /^(name|assignment|title)$/.test(s))
  const out: Assignment[] = []
  for (let r = typeH.row + 1; r < grid.length; r++) {
    const row = grid[r] ?? []
    const kind = parseKind(text(row[typeH.col] ?? null))
    const score = num(row[scoreH.col] ?? null)
    if (!kind || score === null) continue
    const name = nameH ? text(row[nameH.col] ?? null) : ''
    out.push({
      id: uid(),
      kind,
      name: name || `${kind === 'test' ? 'Test' : 'Quiz'} ${out.length + 1}`,
      score,
    })
  }
  return out
}

interface SummaryRow {
  name: string
  grade: number | null
  level: Level
  target: number | null
}

function parseSummary(grid: Grid) {
  const current: SummaryRow[] = []
  const past: PastCourse[] = []

  const classH = findHeader(grid, (s) => s === 'class' || s === 'course' || s === 'currentclass')
  if (classH) {
    const heads = tableHeaders(grid, classH)
    const gradeCol = heads.find((h) => h.col !== classH.col && /grade/.test(h.key) && !/target|diff|goal/.test(h.key))?.col
    const flagCol = heads.find((h) => /^(ap|ib|apib|weighted|level|honors|type)$/.test(h.key))?.col
    const targetCol = heads.find((h) => /target|goal/.test(h.key) && !/diff/.test(h.key))?.col
    for (let r = classH.row + 1; r < grid.length; r++) {
      const row = grid[r] ?? []
      const name = text(row[classH.col] ?? null)
      if (!name) continue
      // stop at the GPA footer rows
      if (/gpa/i.test(name)) break
      const grade = gradeCol !== undefined ? num(row[gradeCol] ?? null) : null
      current.push({
        name,
        grade,
        level: parseLevel(flagCol !== undefined ? text(row[flagCol] ?? null) : '', name),
        target: targetCol !== undefined ? num(row[targetCol] ?? null) : null,
      })
    }
  }

  const prevH = findHeader(grid, (s) => /^(previous|past|prior)(class|course)(es)?$/.test(s))
  if (prevH) {
    const heads = tableHeaders(grid, prevH)
    const gradeCol = heads.find((h) => h.col !== prevH.col && /grade|final/.test(h.key))?.col
    const flagCol = heads.find((h) => /^(ap|ib|apib|weighted|level|honors|type)$/.test(h.key))?.col
    for (let r = prevH.row + 1; r < grid.length; r++) {
      const row = grid[r] ?? []
      const name = text(row[prevH.col] ?? null)
      const grade = gradeCol !== undefined ? num(row[gradeCol] ?? null) : null
      if (!name || grade === null) continue
      past.push({
        id: uid(),
        name,
        grade,
        level: parseLevel(flagCol !== undefined ? text(row[flagCol] ?? null) : '', name),
      })
    }
  }

  return { current, past, found: !!classH || !!prevH }
}

export async function importFile(file: File): Promise<ImportResult> {
  const warnings: string[] = []
  const isCsv = /\.csv$/i.test(file.name) || file.type === 'text/csv'

  const sheets = isCsv
    ? [{ name: file.name.replace(/\.csv$/i, ''), grid: readCsv(await file.text()) }]
    : readXlsx(await file.arrayBuffer())

  let summary: ReturnType<typeof parseSummary> | null = null
  const classTabs: { name: string; assignments: Assignment[] }[] = []

  for (const sheet of sheets) {
    const assignments = parseAssignments(sheet.grid)
    if (assignments) {
      classTabs.push({ name: sheet.name, assignments })
      continue
    }
    const s = parseSummary(sheet.grid)
    if (s.found && !summary) summary = s
  }

  const courses: Course[] = []
  const used = new Set<string>()

  for (const row of summary?.current ?? []) {
    const tab = classTabs.find((t) => norm(t.name) === norm(row.name))
    if (tab) used.add(tab.name)
    const assignments = tab?.assignments ?? []
    courses.push({
      id: uid(),
      name: tab?.name ?? row.name,
      level: row.level,
      target: row.target,
      manualGrade: assignments.length ? null : row.grade,
      assignments,
    })
  }

  for (const tab of classTabs) {
    if (used.has(tab.name)) continue
    courses.push({
      id: uid(),
      name: tab.name,
      level: parseLevel('', tab.name),
      target: null,
      manualGrade: null,
      assignments: tab.assignments,
    })
    if (summary) warnings.push(`“${tab.name}” wasn’t on the summary tab, so its level was guessed from the name.`)
  }

  for (const c of courses) {
    if (!c.assignments.length && c.manualGrade === null)
      warnings.push(`“${c.name}” has no grades yet.`)
  }

  if (!courses.length && !(summary?.past.length))
    throw new Error(
      'No grades found. Expected a tab with “Test/Quiz”, “Name” and “Score” columns, or a summary tab with a “Class” column.',
    )

  return { courses, pastCourses: summary?.past ?? [], warnings }
}
