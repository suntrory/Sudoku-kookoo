import type { Grid } from '../lib/sudoku'
import { t } from '../lib/i18n'
import type { Lang } from '../lib/i18n'

interface NumberPadProps {
  values: Grid
  notesMode: boolean
  disabled: boolean
  lang: Lang
  onInput: (digit: number) => void
}

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

export function NumberPad({ values, notesMode, disabled, lang, onInput }: NumberPadProps) {
  const counts = new Array<number>(10).fill(0)
  for (const v of values) if (v >= 1 && v <= 9) counts[v] += 1

  return (
    <div className={`pad${notesMode ? ' pad--notes' : ''}`} role="group" aria-label={t(lang, 'tools.group')}>
      {DIGITS.map((d) => {
        const remaining = 9 - counts[d]
        return (
          <button
            key={d}
            type="button"
            className={`pad-btn${remaining <= 0 ? ' pad-btn--done' : ''}`}
            data-digit={d}
            aria-label={t(lang, 'pad.digit', { digit: d, left: remaining })}
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
