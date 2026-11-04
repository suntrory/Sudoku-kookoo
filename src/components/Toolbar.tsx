import type { Hint } from '../lib/hints'
import { t } from '../lib/i18n'
import type { Lang } from '../lib/i18n'

interface ToolbarProps {
  notesMode: boolean
  canUndo: boolean
  disabled: boolean
  hintsUsed: number
  lang: Lang
  onToggleNotes: () => void
  onErase: () => void
  onUndo: () => void
  onHint: () => void
  onCheck: () => void
}

export function Toolbar({
  notesMode,
  canUndo,
  disabled,
  hintsUsed,
  lang,
  onToggleNotes,
  onErase,
  onUndo,
  onHint,
  onCheck,
}: ToolbarProps) {
  return (
    <div className="tools" role="group" aria-label={t(lang, 'tools.group')}>
      <button
        type="button"
        className={`tool${notesMode ? ' tool--active' : ''}`}
        onClick={onToggleNotes}
        disabled={disabled}
        aria-pressed={notesMode}
        title={t(lang, 'tools.notesTitle')}
      >
        <span className="tool-icon" aria-hidden="true">
          ✏️
        </span>
        <span className="tool-label">{t(lang, 'tools.notes')}</span>
      </button>

      <button
        type="button"
        className="tool"
        onClick={onErase}
        disabled={disabled}
        title={t(lang, 'tools.eraseTitle')}
      >
        <span className="tool-icon" aria-hidden="true">
          🧽
        </span>
        <span className="tool-label">{t(lang, 'tools.erase')}</span>
      </button>

      <button
        type="button"
        className="tool"
        onClick={onUndo}
        disabled={disabled || !canUndo}
        title={t(lang, 'tools.undoTitle')}
      >
        <span className="tool-icon" aria-hidden="true">
          ↩️
        </span>
        <span className="tool-label">{t(lang, 'tools.undo')}</span>
      </button>

      <button
        type="button"
        className="tool tool--hint"
        onClick={onHint}
        disabled={disabled}
        title={t(lang, 'tools.hintTitle')}
      >
        <span className="tool-icon" aria-hidden="true">
          💡
        </span>
        <span className="tool-label">{t(lang, 'tools.hint')}</span>
        {hintsUsed > 0 && <span className="tool-badge">{hintsUsed}</span>}
      </button>

      <button
        type="button"
        className="tool"
        onClick={onCheck}
        disabled={disabled}
        title={t(lang, 'tools.checkTitle')}
      >
        <span className="tool-icon" aria-hidden="true">
          ✅
        </span>
        <span className="tool-label">{t(lang, 'tools.check')}</span>
      </button>
    </div>
  )
}

interface HintCardProps {
  hint: Hint
  hintsUsed: number
  lang: Lang
  onApply: () => void
  onDismiss: () => void
}

export function HintCard({ hint, hintsUsed, lang, onApply, onDismiss }: HintCardProps) {
  const canApply = (hint.kind === 'place' || hint.kind === 'reveal') && hint.digit
  return (
    <div className={`hint-card hint-card--${hint.kind}`} role="status" aria-live="polite">
      <div className="hint-head">
        <span className="hint-icon" aria-hidden="true">
          {hint.kind === 'mistake' ? '⚠️' : hint.kind === 'eliminate' ? '🧠' : '💡'}
        </span>
        <div className="hint-titles">
          <strong>{hint.title}</strong>
          <span className="hint-sub">
            {hint.kind === 'eliminate'
              ? t(lang, 'hint.eliminated')
              : hint.kind === 'mistake'
                ? t(lang, 'hint.notCounted')
                : t(lang, hintsUsed === 1 ? 'hint.usedOne' : 'hint.used', { n: hintsUsed })}
          </span>
        </div>
        <button
          type="button"
          className="hint-close"
          onClick={onDismiss}
          aria-label={t(lang, 'hint.close')}
        >
          ×
        </button>
      </div>
      <p className="hint-body">{hint.body}</p>
      <div className="hint-actions">
        {canApply && (
          <button type="button" className="btn btn--primary btn--sm" onClick={onApply}>
            {t(lang, 'hint.fill', { digit: hint.digit ?? '' })}
          </button>
        )}
        <button type="button" className="btn btn--ghost btn--sm" onClick={onDismiss}>
          {canApply ? t(lang, 'hint.try') : t(lang, 'hint.gotIt')}
        </button>
      </div>
    </div>
  )
}
