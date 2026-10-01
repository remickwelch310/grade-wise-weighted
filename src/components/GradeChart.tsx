import {
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import { tone } from './ui'

ChartJS.register(
  BarController,
  BarElement,
  CategoryScale,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
)

ChartJS.defaults.font.family = '"Instrument Sans", sans-serif'
ChartJS.defaults.color = '#4b5264'

export interface ChartRow {
  label: string
  grade: number | null
  target: number | null
  simulated?: boolean
}

/** Class grades as bars, each class's target as a red-pen tick. */
export function GradeChart({ rows }: { rows: ChartRow[] }) {
  const values = rows.flatMap((r) => [r.grade, r.target]).filter((v): v is number => v !== null)
  const lo = values.length ? Math.max(0, Math.floor((Math.min(...values) - 8) / 10) * 10) : 0
  const hi = values.length ? Math.max(100, Math.ceil(Math.max(...values) / 5) * 5) : 100

  return (
    <div className="h-72">
      <Bar
        data={{
          labels: rows.map((r) => r.label),
          datasets: [
            {
              type: 'bar' as const,
              label: 'Grade',
              data: rows.map((r) => r.grade),
              backgroundColor: rows.map((r) => tone(r.grade).bar + (r.simulated ? '99' : 'e6')),
              borderRadius: 6,
              maxBarThickness: 44,
              order: 2,
            },
            {
              type: 'line' as const,
              label: 'Target',
              data: rows.map((r) => r.target) as number[],
              showLine: false,
              pointStyle: 'line',
              pointRadius: 16,
              pointHoverRadius: 18,
              pointBorderWidth: 3,
              borderColor: '#b5412c',
              backgroundColor: '#b5412c',
              order: 1,
            },
          ] as never,
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: true, position: 'bottom', labels: { boxWidth: 12, usePointStyle: true } },
            tooltip: {
              callbacks: { label: (ctx) => `${ctx.dataset.label}: ${Number(ctx.parsed.y).toFixed(1)}` },
            },
          },
          scales: {
            y: { min: lo, max: hi, grid: { color: 'rgba(28,34,48,0.07)' }, border: { display: false } },
            x: { grid: { display: false }, ticks: { autoSkip: false, maxRotation: 40 } },
          },
        }}
      />
    </div>
  )
}
