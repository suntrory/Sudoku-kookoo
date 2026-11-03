import type { CSSProperties } from 'react'
import { DIFFICULTIES, DIFFICULTY_META, formatTime } from '../lib/sudoku'
import type { Difficulty } from '../lib/sudoku'

interface TopBarProps {
  difficulty: Difficulty
  elapsed: number
  paused: boolean
  status: 'playing' | 'won'
  onNewGame: (difficulty: Difficulty) => void
  onTogglePause: () => void
}

export function TopBar({ difficulty, elapsed, paused, status, onNewGame, onTogglePause }: TopBarProps) {
  return (
    <header className="app-header">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          9
        </span>
        <div className="brand-text">
          <h1>Sudoku</h1>
          <p>เลข 1–9 ไม่ซ้ำในแถว คอลัมน์ และบล็อก</p>
        </div>
      </div>

      <div className="header-actions">
        <div className="timer" aria-live="off">
          <span className="timer-icon" aria-hidden="true">
            ⏱
          </span>
          <span className="timer-value">{formatTime(elapsed)}</span>
        </div>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={onTogglePause}
          disabled={status === 'won'}
          aria-label={paused ? 'เล่นต่อ' : 'หยุดพัก'}
        >
          {paused ? '▶ เล่นต่อ' : '⏸ หยุด'}
        </button>
        <button type="button" className="btn btn--primary" onClick={() => onNewGame(difficulty)}>
          + เกมใหม่
        </button>
      </div>
    </header>
  )
}

interface DifficultyPickerProps {
  current: Difficulty
  onPick: (difficulty: Difficulty) => void
}

export function DifficultyPicker({ current, onPick }: DifficultyPickerProps) {
  return (
    <div className="difficulty">
      <div className="segmented" role="tablist" aria-label="ระดับความยาก">
        {DIFFICULTIES.map((d) => {
          const meta = DIFFICULTY_META[d]
          const active = d === current
          return (
            <button
              key={d}
              type="button"
              role="tab"
              aria-selected={active}
              data-difficulty={d}
              className={`seg-btn${active ? ' seg-btn--active' : ''}`}
              style={active ? ({ '--seg-accent': meta.accent } as CSSProperties) : undefined}
              onClick={() => onPick(d)}
            >
              <span className="seg-dot" style={{ background: meta.accent }} aria-hidden="true" />
              {meta.labelTh}
              <span className="seg-en">{meta.label}</span>
            </button>
          )
        })}
      </div>
      <p className="difficulty-note">{DIFFICULTY_META[current].blurb}</p>
    </div>
  )
}
