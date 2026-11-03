import { useState } from 'react'
import { DIFFICULTIES, DIFFICULTY_META, formatTime } from '../lib/sudoku'
import type { Difficulty } from '../lib/sudoku'
import { storageUsage } from '../lib/storage'
import { accentInk } from '../lib/theme'
import type { Settings, StatsStore } from '../lib/storage'

const RATING_LABEL: Record<number, string> = {
  0: 'ไม่ต้องใช้เทคนิค',
  1: 'Singles',
  2: 'Locked Candidates / Pairs',
  3: 'X-Wing',
  4: 'ต้องลองผิดลองถูก',
  5: 'กระดานขัดแย้ง',
}

interface SidePanelProps {
  difficulty: Difficulty
  clues: number
  ratingLevel: number
  stats: StatsStore
  settings: Settings
  canReveal: boolean
  onChangeSettings: (patch: Partial<Settings>) => void
  onClearStats: () => void
  onRestart: () => void
  onReveal: () => void
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label className="setting-row">
      <span className="setting-text">
        <span className="setting-label">{label}</span>
        <span className="setting-hint">{description}</span>
      </span>
      <span className={`switch${checked ? ' switch--on' : ''}`}>
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="switch-knob" aria-hidden="true" />
      </span>
    </label>
  )
}

export function SidePanel({
  difficulty,
  clues,
  ratingLevel,
  stats,
  settings,
  canReveal,
  onChangeSettings,
  onClearStats,
  onRestart,
  onReveal,
}: SidePanelProps) {
  const [confirmClear, setConfirmClear] = useState(false)
  const meta = DIFFICULTY_META[difficulty]
  const usage = storageUsage()
  const recent = stats.recent.slice(0, 4)

  return (
    <aside className="panel">
      <section className="panel-card">
        <h2 className="panel-title">กระดานนี้</h2>
        <div className="fact-row">
          <span className="fact-key">ระดับ</span>
          <span className="fact-value accent-ink" style={accentInk(meta.accent)}>
            {meta.labelTh} · {meta.label}
          </span>
        </div>
        <div className="fact-row">
          <span className="fact-key">เลขตั้งต้น</span>
          <span className="fact-value">{clues} ช่อง</span>
        </div>
        <div className="fact-row">
          <span className="fact-key">เทคนิคที่ต้องใช้</span>
          <span className="fact-value">{RATING_LABEL[ratingLevel] ?? '—'}</span>
        </div>
        <div className="fact-row">
          <span className="fact-key">ตรวจสอบแล้ว</span>
          <span className="fact-value fact-value--ok">✓ คำตอบเดียว</span>
        </div>
      </section>

      <section className="panel-card">
        <h2 className="panel-title">สถิติในเครื่องนี้</h2>
        <div className="stat-table">
          {DIFFICULTIES.map((d) => {
            const s = stats.byDifficulty[d]
            return (
              <div className="stat-row" key={d}>
                <span className="stat-name accent-ink" style={accentInk(DIFFICULTY_META[d].accent)}>
                  {DIFFICULTY_META[d].labelTh}
                </span>
                <span className="stat-best">{s.bestTime !== null ? formatTime(s.bestTime) : '—'}</span>
                <span className="stat-count">
                  {s.completed}/{s.played}
                </span>
              </div>
            )
          })}
        </div>
        <p className="panel-note">เวลาที่ดีที่สุด · จำนวนที่แก้สำเร็จ/เริ่มเล่น</p>

        {recent.length > 0 && (
          <ul className="recent">
            {recent.map((r) => (
              <li key={r.at} className="recent-item">
                <span
                  className="recent-dot"
                  style={{ background: DIFFICULTY_META[r.difficulty].accent }}
                  aria-hidden="true"
                />
                <span className="recent-diff">{DIFFICULTY_META[r.difficulty].labelTh}</span>
                <span className="recent-time">{formatTime(r.time)}</span>
                <span className="recent-hint">💡{r.hints}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel-card">
        <h2 className="panel-title">ช่วยเหลือ</h2>
        <button type="button" className="btn btn--soft btn--block" onClick={onReveal} disabled={!canReveal}>
          เฉลยช่องที่เลือก
        </button>
        <button type="button" className="btn btn--ghost btn--block" onClick={onRestart}>
          เริ่มกระดานนี้ใหม่
        </button>
        <p className="panel-note">การเฉลยจะถูกนับเป็นการใช้คำใบ้</p>
      </section>

      <section className="panel-card">
        <h2 className="panel-title">การตั้งค่า</h2>
        <Toggle
          label="ไฮไลต์เลขที่ผิด"
          description="ขึ้นสีแดงทันทีที่ใส่เลขผิด"
          checked={settings.showMistakes}
          onChange={(v) => onChangeSettings({ showMistakes: v })}
        />
        <Toggle
          label="ไฮไลต์แถว/คอลัมน์"
          description="เน้นช่องที่เกี่ยวข้องกับช่องที่เลือก"
          checked={settings.highlightPeers}
          onChange={(v) => onChangeSettings({ highlightPeers: v })}
        />
        <Toggle
          label="ไฮไลต์เลขเดียวกัน"
          description="เน้นช่องที่มีเลขซ้ำกับช่องที่เลือก"
          checked={settings.highlightSame}
          onChange={(v) => onChangeSettings({ highlightSame: v })}
        />
        <Toggle
          label="ลบโน้ตอัตโนมัติ"
          description="วางเลขแล้วตัดโน้ตนั้นในช่องเพื่อนบ้าน"
          checked={settings.autoCleanNotes}
          onChange={(v) => onChangeSettings({ autoCleanNotes: v })}
        />
      </section>

      <section className="panel-card panel-card--muted">
        <h2 className="panel-title">ข้อมูลใน localStorage</h2>
        <p className="panel-note">
          {usage.entries} รายการ · {(usage.bytes / 1024).toFixed(1)} KB — เก็บในเบราว์เซอร์นี้เท่านั้น ไม่มีเซิร์ฟเวอร์
        </p>
        {confirmClear ? (
          <div className="confirm-row">
            <button
              type="button"
              className="btn btn--danger btn--sm"
              onClick={() => {
                onClearStats()
                setConfirmClear(false)
              }}
            >
              ยืนยันล้างสถิติ
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirmClear(false)}>
              ยกเลิก
            </button>
          </div>
        ) : (
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirmClear(true)}>
            ล้างสถิติ
          </button>
        )}
      </section>
    </aside>
  )
}
