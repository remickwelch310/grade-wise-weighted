// Core grade math. Mirrors the student's spreadsheet:
//   class grade = 80% test average + 20% quiz average
//   GPA points  = 90+ → 4, 80+ → 3, 70+ → 2, 60+ → 1, else 0
//   weighted    = +1 for AP/IB, +0.5 for Honors

export type Kind = 'quiz' | 'test'
export type Level = 'regular' | 'honors' | 'ap'

export const QUIZ_WEIGHT = 0.2
export const TEST_WEIGHT = 0.8

export interface Assignment {
  id: string
  kind: Kind
  name: string
  score: number
  /** What-if grade: only counted when simulation is turned on. */
  simulated?: boolean
}

export interface Course {
  id: string
  name: string
  level: Level
  target: number | null
  /** Used when a class has no assignments entered (e.g. Band). */
  manualGrade: number | null
  assignments: Assignment[]
}

export interface PastCourse {
  id: string
  name: string
  grade: number
  level: Level
}

export interface Tracker {
  schoolYear: string
  courses: Course[]
  pastCourses: PastCourse[]
}

export const LEVEL_LABEL: Record<Level, string> = {
  regular: 'Regular',
  honors: 'Honors',
  ap: 'AP / IB',
}

export const LEVEL_BONUS: Record<Level, number> = {
  regular: 0,
  honors: 0.5,
  ap: 1,
}

export function uid() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function emptyTracker(): Tracker {
  const now = new Date()
  const start = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1
  return {
    schoolYear: `${start}–${String(start + 1).slice(2)}`,
    courses: [],
    pastCourses: [],
  }
}

const avg = (xs: number[]) =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null

export function counted(course: Course, simulate: boolean) {
  return course.assignments.filter((a) => simulate || !a.simulated)
}

export interface Breakdown {
  quizAvg: number | null
  testAvg: number | null
  quizCount: number
  testCount: number
  grade: number | null
}

export function breakdown(assignments: Assignment[]): Breakdown {
  const quizzes = assignments.filter((a) => a.kind === 'quiz').map((a) => a.score)
  const tests = assignments.filter((a) => a.kind === 'test').map((a) => a.score)
  const quizAvg = avg(quizzes)
  const testAvg = avg(tests)
  let grade: number | null = null
  if (quizAvg !== null && testAvg !== null)
    grade = testAvg * TEST_WEIGHT + quizAvg * QUIZ_WEIGHT
  else grade = testAvg ?? quizAvg
  return {
    quizAvg,
    testAvg,
    quizCount: quizzes.length,
    testCount: tests.length,
    grade,
  }
}

export function courseGrade(course: Course, simulate = false): number | null {
  const list = counted(course, simulate)
  if (!list.length) return course.manualGrade
  return breakdown(list).grade
}

export function basePoints(grade: number): number {
  if (grade >= 90) return 4
  if (grade >= 80) return 3
  if (grade >= 70) return 2
  if (grade >= 60) return 1
  return 0
}

export function weightedPoints(grade: number, level: Level): number {
  return basePoints(grade) + LEVEL_BONUS[level]
}

export function letter(grade: number | null): string {
  if (grade === null) return '—'
  if (grade >= 90) return 'A'
  if (grade >= 80) return 'B'
  if (grade >= 70) return 'C'
  if (grade >= 60) return 'D'
  return 'F'
}

export interface GpaSummary {
  base: number | null
  weighted: number | null
  count: number
}

function gpaOf(rows: { grade: number; level: Level }[]): GpaSummary {
  if (!rows.length) return { base: null, weighted: null, count: 0 }
  return {
    base: avg(rows.map((r) => basePoints(r.grade))),
    weighted: avg(rows.map((r) => weightedPoints(r.grade, r.level))),
    count: rows.length,
  }
}

export function currentRows(tracker: Tracker, simulate: boolean) {
  return tracker.courses.flatMap((c) => {
    const grade = courseGrade(c, simulate)
    return grade === null ? [] : [{ grade, level: c.level }]
  })
}

export function yearGpa(tracker: Tracker, simulate = false) {
  return gpaOf(currentRows(tracker, simulate))
}

export function pastGpa(tracker: Tracker) {
  return gpaOf(tracker.pastCourses)
}

export function cumulativeGpa(tracker: Tracker, simulate = false) {
  return gpaOf([...tracker.pastCourses, ...currentRows(tracker, simulate)])
}

/**
 * Impact of a single assignment: how many points the class grade moves
 * because of it (grade with it − grade without it).
 */
export function impact(course: Course, assignmentId: string, simulate: boolean) {
  const list = counted(course, simulate)
  const withIt = breakdown(list).grade
  const without = list.filter((a) => a.id !== assignmentId)
  const withoutGrade = without.length ? breakdown(without).grade : course.manualGrade
  if (withIt === null || withoutGrade === null) return null
  return withIt - withoutGrade
}

export type Needed =
  | { status: 'possible'; score: number; resulting: number }
  | { status: 'guaranteed'; score: number; resulting: number; floor: number }
  | { status: 'impossible'; best: number }

/**
 * Score needed on the next quiz or test for the class grade to reach `target`.
 * `maxScore` caps what's achievable (100 by default, raise for extra credit).
 */
export function neededScore(
  assignments: Assignment[],
  kind: Kind,
  target: number,
  maxScore = 100,
): Needed {
  const b = breakdown(assignments)
  const sumOf = (k: Kind) =>
    assignments.filter((a) => a.kind === k).reduce((s, a) => s + a.score, 0)
  const n = kind === 'test' ? b.testCount : b.quizCount
  const sum = sumOf(kind)
  const otherAvg = kind === 'test' ? b.quizAvg : b.testAvg
  const myWeight = kind === 'test' ? TEST_WEIGHT : QUIZ_WEIGHT
  const otherWeight = 1 - myWeight

  // resulting grade as a function of the next score x
  const result = (x: number) => {
    const newAvg = (sum + x) / (n + 1)
    return otherAvg === null ? newAvg : newAvg * myWeight + otherAvg * otherWeight
  }

  // solve result(x) = target
  let x: number
  if (otherAvg === null) {
    x = target * (n + 1) - sum
  } else {
    x = ((target - otherAvg * otherWeight) / myWeight) * (n + 1) - sum
  }

  if (x > maxScore) return { status: 'impossible', best: result(maxScore) }
  if (x <= 0) return { status: 'guaranteed', score: 0, resulting: result(0), floor: result(0) }
  return { status: 'possible', score: x, resulting: result(x) }
}

export const fmt = (n: number | null | undefined, digits = 1) =>
  n === null || n === undefined || Number.isNaN(n) ? '—' : n.toFixed(digits)

export const fmtGpa = (n: number | null | undefined) => fmt(n, 2)
