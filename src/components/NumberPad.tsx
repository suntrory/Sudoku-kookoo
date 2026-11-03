import type { Grid } from '../lib/sudoku'

interface NumberPadProps {
  values: Grid
  notesMode: boolean
  disabled: boolean
  onInput: (digit: number) => void
}

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

export function NumberPad({ values, notesMode, disabled, onInput }: NumberPadProps) {
  const counts = new Array<number>(10).fill(0)
  for (const v of values) if (v >= 1 && v <= 9) counts[v] += 1

  return (
    <div className={`pad${notesMode ? ' pad--notes' : ''}`} role="group" aria-label="แป้นตัวเลข">
      {DIGITS.map((d) => {
        const remaining = 9 - counts[d]
        return (
          <button
            key={d}
            type="button"
            className={`pad-btn${remaining <= 0 ? ' pad-btn--done' : ''}`}
            data-digit={d}
            aria-label={`เลข ${d} เหลือ ${remaining} ช่อง`}
            onClick={() => onInput(d)}
            disabled={disabled}
          >
            <span className="pad-digit">{d}</span>
            <span className="pad-count">{remaining > 0 ? remaining : '✓'}</span>
          </button>
        )
      })}
    </div>
  )
}
