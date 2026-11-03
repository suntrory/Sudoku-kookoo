import { DIFFICULTY_META, formatTime } from '../lib/sudoku'
import type { Difficulty } from '../lib/sudoku'

interface WinDialogProps {
  difficulty: Difficulty
  elapsed: number
  hints: number
  mistakes: number
  onAgain: () => void
  onClose: () => void
}

function starsFor(hints: number, mistakes: number): number {
  if (hints === 0 && mistakes === 0) return 3
  if (hints <= 2 && mistakes <= 1) return 2
  return 1
}

export function WinDialog({ difficulty, elapsed, hints, mistakes, onAgain, onClose }: WinDialogProps) {
  const meta = DIFFICULTY_META[difficulty]
  const stars = starsFor(hints, mistakes)

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="win-title">
      <div className="modal">
        <div className="modal-glow" aria-hidden="true" />
        <div className="win-stars" aria-label={`${stars} ดาว`}>
          {[1, 2, 3].map((s) => (
            <span key={s} className={`star${s <= stars ? ' star--on' : ''}`} aria-hidden="true">
              ★
            </span>
          ))}
        </div>
        <h2 id="win-title" className="modal-title">
          แก้สำเร็จแล้ว!
        </h2>
        <p className="modal-sub" style={{ color: meta.accent }}>
          ระดับ{meta.labelTh} · {meta.label}
        </p>

        <div className="win-grid">
          <div className="win-stat">
            <span className="win-stat-key">เวลา</span>
            <span className="win-stat-value">{formatTime(elapsed)}</span>
          </div>
          <div className="win-stat">
            <span className="win-stat-key">คำใบ้</span>
            <span className="win-stat-value">{hints}</span>
          </div>
          <div className="win-stat">
            <span className="win-stat-key">เลขผิด</span>
            <span className="win-stat-value">{mistakes}</span>
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn btn--primary" onClick={onAgain}>
            เล่นอีกกระดาน
          </button>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            ดูกระดานที่แก้แล้ว
          </button>
        </div>
      </div>
    </div>
  )
}
