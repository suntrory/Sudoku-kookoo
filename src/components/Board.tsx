import { memo, useMemo } from 'react'
import { PEERS } from '../lib/sudoku'
import type { Grid } from '../lib/sudoku'

interface BoardProps {
  values: Grid
  givens: Grid
  notes: number[]
  selected: number | null
  wrong: Set<number>
  hintCells: number[]
  highlightPeers: boolean
  highlightSame: boolean
  highlightLines: boolean
  paused: boolean
  onSelect: (cell: number) => void
  onResume: () => void
}

const NOTE_DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

function BoardComponent({
  values,
  givens,
  notes,
  selected,
  wrong,
  hintCells,
  highlightPeers,
  highlightSame,
  highlightLines,
  paused,
  onSelect,
  onResume,
}: BoardProps) {
  const peerSet = useMemo(
    () => new Set(selected === null ? [] : PEERS[selected]),
    [selected],
  )
  const hintSet = useMemo(() => new Set(hintCells), [hintCells])
  const selectedDigit = selected !== null ? values[selected] : 0
  const selectedRow = selected !== null ? Math.floor(selected / 9) : -1
  const selectedCol = selected !== null ? selected % 9 : -1

  return (
    <div className="board-wrap">
      <div className={`board${paused ? ' board--paused' : ''}`} role="grid" aria-label="กระดานซูโดกุ 9 คูณ 9">
        {Array.from({ length: 81 }, (_, i) => {
          const value = values[i]
          const classes = ['cell']
          if (givens[i]) classes.push('cell--given')
          if (value && !givens[i]) classes.push('cell--user')
          if (wrong.has(i)) classes.push('cell--wrong')
          if (i === selected) classes.push('cell--selected')
          if (highlightPeers && peerSet.has(i)) classes.push('cell--peer')
          if (highlightLines && selected !== null && i !== selected) {
            const sameRow = Math.floor(i / 9) === selectedRow
            const sameCol = i % 9 === selectedCol
            if (sameRow && sameCol) classes.push('cell--cross')
            else if (sameRow) classes.push('cell--row')
            else if (sameCol) classes.push('cell--col')
          }
          if (highlightSame && selectedDigit && value === selectedDigit && i !== selected) classes.push('cell--same')
          if (hintSet.has(i)) classes.push('cell--hint')

          const row = Math.floor(i / 9) + 1
          const col = (i % 9) + 1

          return (
            <button
              key={i}
              type="button"
              role="gridcell"
              data-cell={i}
              data-value={value || ''}
              aria-label={`แถว ${row} คอลัมน์ ${col}${value ? ` ค่า ${value}` : ' ว่าง'}`}
              aria-selected={i === selected}
              className={classes.join(' ')}
              onClick={() => onSelect(i)}
            >
              {value ? (
                <span className="cell__value">{value}</span>
              ) : notes[i] ? (
                <span className="cell__notes">
                  {NOTE_DIGITS.map((d) => (
                    <span
                      key={d}
                      className={`note${notes[i] & (1 << d) ? ' note--on' : ''}${
                        selectedDigit === d ? ' note--focus' : ''
                      }`}
                    >
                      {notes[i] & (1 << d) ? d : ''}
                    </span>
                  ))}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      {paused && (
        <div className="board-paused">
          <div className="board-paused__card">
            <span className="board-paused__icon" aria-hidden="true">
              ⏸
            </span>
            <p>หยุดเวลาไว้แล้ว</p>
            <button type="button" className="btn btn--primary" onClick={onResume}>
              เล่นต่อ
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export const Board = memo(BoardComponent)
