// Made-up example gradebook so a new visitor can explore every screen
// before importing their own sheet.
import { emptyTracker, uid } from './grades'
import type { Assignment, Kind, Tracker } from './grades'

const a = (kind: Kind, name: string, score: number, simulated = false): Assignment => ({
  id: uid(),
  kind,
  name,
  score,
  simulated,
})

export function sampleTracker(): Tracker {
  return {
    ...emptyTracker(),
    courses: [
      {
        id: uid(),
        name: 'AP Biology',
        level: 'ap',
        target: 90,
        manualGrade: null,
        assignments: [
          a('quiz', 'Macromolecules quiz', 84),
          a('quiz', 'Enzymes check-in', 91),
          a('test', 'Unit 1 exam', 78),
          a('quiz', 'Cell membrane quiz', 88),
          a('test', 'Unit 2 exam', 86, true),
        ],
      },
      {
        id: uid(),
        name: 'Honors English 11',
        level: 'honors',
        target: 90,
        manualGrade: null,
        assignments: [
          a('quiz', 'Gatsby ch. 1–3 reading', 95),
          a('quiz', 'Vocab set 2', 88),
          a('test', 'Rhetorical analysis essay', 91),
        ],
      },
      {
        id: uid(),
        name: 'Precalculus',
        level: 'regular',
        target: 85,
        manualGrade: null,
        assignments: [
          a('quiz', 'Functions quiz', 72),
          a('quiz', 'Transformations quiz', 81),
          a('test', 'Unit 1 test', 79),
          a('test', 'Unit 2 test', 83),
        ],
      },
      {
        id: uid(),
        name: 'Spanish III',
        level: 'regular',
        target: 90,
        manualGrade: null,
        assignments: [a('quiz', 'Preterite vs. imperfect', 97), a('quiz', 'Vocab 1B', 92)],
      },
      { id: uid(), name: 'Jazz Band', level: 'regular', target: null, manualGrade: 98, assignments: [] },
    ],
    pastCourses: [
      { id: uid(), name: 'Biology', grade: 88, level: 'regular' },
      { id: uid(), name: 'English 10 Honors', grade: 86, level: 'honors' },
      { id: uid(), name: 'Algebra II', grade: 77, level: 'regular' },
      { id: uid(), name: 'AP World History', grade: 82, level: 'ap' },
      { id: uid(), name: 'Spanish II', grade: 93, level: 'regular' },
      { id: uid(), name: 'Concert Band', grade: 96, level: 'regular' },
    ],
  }
}
