import { formatTime } from '../lib/sudoku'
import type { Difficulty } from '../lib/sudoku'
import { accentInk } from '../lib/theme'
import { t } from '../lib/i18n'
import type { Lang } from '../lib/i18n'

interface WinDialogProps {
  difficulty: Difficulty
  elapsed: number
  hints: number
  mistakes: number
  lang: Lang
  onAgain: () => void
  onClose: () => void
}

function starsFor(hints: number, mistakes: number): number {
  if (hints === 0 && mistakes === 0) return 3
  if (hints <= 2 && mistakes <= 1) return 2
  return 1
}

const ACCENT: Record<Difficulty, string> = {
  easy: '#34d399',
  medium: '#60a5fa',
  hard: '#f472b6',
}

export function WinDialog({
  difficulty,
  elapsed,
  hints,
  mistakes,
  lang,
  onAgain,
  onClose,
}: WinDialogProps) {
  const stars = starsFor(hints, mistakes)

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="win-title">
      <div className="modal">
        <div className="modal-glow" aria-hidden="true" />
        <div className="win-stars" aria-label={t(lang, 'win.stars', { n: stars })}>
          {[1, 2, 3].map((s) => (
            <span key={s} className={`star${s <= stars ? ' star--on' : ''}`} aria-hidden="true">
              ★
            </span>
          ))}
        </div>
        <h2 id="win-title" className="modal-title">
          {t(lang, 'win.title')}
        </h2>
        <p className="modal-sub accent-ink" style={accentInk(ACCENT[difficulty])}>
          {t(lang, 'win.sub', { difficulty: t(lang, `diff.${difficulty}`) })}
        </p>

        <div className="win-grid">
          <div className="win-stat">
            <span className="win-stat-key">{t(lang, 'win.time')}</span>
            <span className="win-stat-value">{formatTime(elapsed)}</span>
          </div>
          <div className="win-stat">
            <span className="win-stat-key">{t(lang, 'win.hints')}</span>
            <span className="win-stat-value">{hints}</span>
          </div>
          <div className="win-stat">
            <span className="win-stat-key">{t(lang, 'win.mistakes')}</span>
            <span className="win-stat-value">{mistakes}</span>
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn btn--primary" onClick={onAgain}>
            {t(lang, 'win.again')}
          </button>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            {t(lang, 'win.viewBoard')}
          </button>
        </div>
      </div>
    </div>
  )
}
