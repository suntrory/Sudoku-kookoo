import type { Hint } from '../lib/hints'

interface ToolbarProps {
  notesMode: boolean
  canUndo: boolean
  disabled: boolean
  hintsUsed: number
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
  onToggleNotes,
  onErase,
  onUndo,
  onHint,
  onCheck,
}: ToolbarProps) {
  return (
    <div className="tools" role="group" aria-label="เครื่องมือช่วยเล่น">
      <button
        type="button"
        className={`tool${notesMode ? ' tool--active' : ''}`}
        onClick={onToggleNotes}
        disabled={disabled}
        aria-pressed={notesMode}
        title="โหมดจดโน้ต (N)"
      >
        <span className="tool-icon" aria-hidden="true">
          ✏️
        </span>
        <span className="tool-label">โน้ต</span>
      </button>

      <button type="button" className="tool" onClick={onErase} disabled={disabled} title="ลบเลข (Backspace)">
        <span className="tool-icon" aria-hidden="true">
          🧽
        </span>
        <span className="tool-label">ลบ</span>
      </button>

      <button type="button" className="tool" onClick={onUndo} disabled={disabled || !canUndo} title="ย้อนกลับ (U)">
        <span className="tool-icon" aria-hidden="true">
          ↩️
        </span>
        <span className="tool-label">ย้อนกลับ</span>
      </button>

      <button type="button" className="tool tool--hint" onClick={onHint} disabled={disabled} title="ขอคำใบ้ (H)">
        <span className="tool-icon" aria-hidden="true">
          💡
        </span>
        <span className="tool-label">คำใบ้</span>
        {hintsUsed > 0 && <span className="tool-badge">{hintsUsed}</span>}
      </button>

      <button type="button" className="tool" onClick={onCheck} disabled={disabled} title="ตรวจกระดาน">
        <span className="tool-icon" aria-hidden="true">
          ✅
        </span>
        <span className="tool-label">ตรวจ</span>
      </button>
    </div>
  )
}

interface HintCardProps {
  hint: Hint
  hintsUsed: number
  onApply: () => void
  onDismiss: () => void
}

export function HintCard({ hint, hintsUsed, onApply, onDismiss }: HintCardProps) {
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
              ? 'ตัดตัวเลือกในโน้ตให้แล้ว'
              : hint.kind === 'mistake'
                ? 'ยังไม่นับเป็นการใช้คำใบ้'
                : `ใช้คำใบ้ไปแล้ว ${hintsUsed} ครั้ง`}
          </span>
        </div>
        <button type="button" className="hint-close" onClick={onDismiss} aria-label="ปิดคำใบ้">
          ×
        </button>
      </div>
      <p className="hint-body">{hint.body}</p>
      <div className="hint-actions">
        {canApply && (
          <button type="button" className="btn btn--primary btn--sm" onClick={onApply}>
            เติมเลข {hint.digit} ให้
          </button>
        )}
        <button type="button" className="btn btn--ghost btn--sm" onClick={onDismiss}>
          {canApply ? 'ลองเองก่อน' : 'เข้าใจแล้ว'}
        </button>
      </div>
    </div>
  )
}
