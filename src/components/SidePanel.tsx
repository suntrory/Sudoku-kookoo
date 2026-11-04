import { useState } from 'react'
import { DIFFICULTIES, DIFFICULTY_META, formatTime } from '../lib/sudoku'
import type { Difficulty } from '../lib/sudoku'
import { storageUsage } from '../lib/storage'
import { accentInk } from '../lib/theme'
import { t } from '../lib/i18n'
import type { Lang } from '../lib/i18n'
import type { Settings, StatsStore } from '../lib/storage'

interface SidePanelProps {
  difficulty: Difficulty
  clues: number
  ratingLevel: number
  stats: StatsStore
  settings: Settings
  canReveal: boolean
  lang: Lang
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

const LANGS: Array<{ key: Lang; label: string }> = [
  { key: 'en', label: 'English' },
  { key: 'th', label: 'ไทย' },
]

export function SidePanel({
  difficulty,
  clues,
  ratingLevel,
  stats,
  settings,
  canReveal,
  lang,
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
        <h2 className="panel-title">{t(lang, 'side.puzzle')}</h2>
        <div className="fact-row">
          <span className="fact-key">{t(lang, 'side.difficulty')}</span>
          <span className="fact-value accent-ink" style={accentInk(meta.accent)}>
            {lang === 'th' ? `${meta.labelTh} · ${meta.label}` : meta.label}
          </span>
        </div>
        <div className="fact-row">
          <span className="fact-key">{t(lang, 'side.givens')}</span>
          <span className="fact-value">{t(lang, 'side.givensValue', { n: clues })}</span>
        </div>
        <div className="fact-row">
          <span className="fact-key">{t(lang, 'side.technique')}</span>
          <span className="fact-value">{t(lang, `rating.${ratingLevel}`)}</span>
        </div>
        <div className="fact-row">
          <span className="fact-key">{t(lang, 'side.verified')}</span>
          <span className="fact-value fact-value--ok">{t(lang, 'side.unique')}</span>
        </div>
      </section>

      <section className="panel-card">
        <h2 className="panel-title">{t(lang, 'side.stats')}</h2>
        <div className="stat-table">
          {DIFFICULTIES.map((d) => {
            const s = stats.byDifficulty[d]
            return (
              <div className="stat-row" key={d}>
                <span className="stat-name accent-ink" style={accentInk(DIFFICULTY_META[d].accent)}>
                  {t(lang, `diff.${d}`)}
                </span>
                <span className="stat-best">{s.bestTime !== null ? formatTime(s.bestTime) : '—'}</span>
                <span className="stat-count">
                  {s.completed}/{s.played}
                </span>
              </div>
            )
          })}
        </div>
        <p className="panel-note">{t(lang, 'side.statsNote')}</p>

        {recent.length > 0 && (
          <ul className="recent">
            {recent.map((r) => (
              <li key={r.at} className="recent-item">
                <span
                  className="recent-dot"
                  style={{ background: DIFFICULTY_META[r.difficulty].accent }}
                  aria-hidden="true"
                />
                <span className="recent-diff">{t(lang, `diff.${r.difficulty}`)}</span>
                <span className="recent-time">{formatTime(r.time)}</span>
                <span className="recent-hint">💡{r.hints}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel-card">
        <h2 className="panel-title">{t(lang, 'side.help')}</h2>
        <button type="button" className="btn btn--soft btn--block" onClick={onReveal} disabled={!canReveal}>
          {t(lang, 'side.reveal')}
        </button>
        <button type="button" className="btn btn--ghost btn--block" onClick={onRestart}>
          {t(lang, 'side.restart')}
        </button>
        <p className="panel-note">{t(lang, 'side.revealNote')}</p>
      </section>

      <section className="panel-card">
        <h2 className="panel-title">{t(lang, 'side.settings')}</h2>
        <Toggle
          label={t(lang, 'settings.showMistakes')}
          description={t(lang, 'settings.showMistakesDesc')}
          checked={settings.showMistakes}
          onChange={(v) => onChangeSettings({ showMistakes: v })}
        />
        <Toggle
          label={t(lang, 'settings.highlightPeers')}
          description={t(lang, 'settings.highlightPeersDesc')}
          checked={settings.highlightPeers}
          onChange={(v) => onChangeSettings({ highlightPeers: v })}
        />
        <Toggle
          label={t(lang, 'settings.highlightLines')}
          description={t(lang, 'settings.highlightLinesDesc')}
          checked={settings.highlightLines}
          onChange={(v) => onChangeSettings({ highlightLines: v })}
        />
        <Toggle
          label={t(lang, 'settings.highlightSame')}
          description={t(lang, 'settings.highlightSameDesc')}
          checked={settings.highlightSame}
          onChange={(v) => onChangeSettings({ highlightSame: v })}
        />
        <Toggle
          label={t(lang, 'settings.autoCleanNotes')}
          description={t(lang, 'settings.autoCleanNotesDesc')}
          checked={settings.autoCleanNotes}
          onChange={(v) => onChangeSettings({ autoCleanNotes: v })}
        />

        <div className="setting-row setting-row--lang">
          <span className="setting-text">
            <span className="setting-label">{t(lang, 'settings.language')}</span>
            <span className="setting-hint">{t(lang, 'settings.languageDesc')}</span>
          </span>
          <span className="lang-choices" role="group" aria-label={t(lang, 'settings.language')}>
            {LANGS.map((item) => (
              <button
                key={item.key}
                type="button"
                data-lang={item.key}
                className={`lang-choice${settings.lang === item.key ? ' lang-choice--active' : ''}`}
                aria-pressed={settings.lang === item.key}
                onClick={() => onChangeSettings({ lang: item.key })}
              >
                {item.label}
              </button>
            ))}
          </span>
        </div>
      </section>

      <section className="panel-card panel-card--muted">
        <h2 className="panel-title">{t(lang, 'side.storage')}</h2>
        <p className="panel-note">
          {t(lang, 'side.storageNote', {
            n: usage.entries,
            kb: (usage.bytes / 1024).toFixed(1),
          })}
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
              {t(lang, 'side.confirmClear')}
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirmClear(false)}>
              {t(lang, 'side.cancel')}
            </button>
          </div>
        ) : (
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirmClear(true)}>
            {t(lang, 'side.clearStats')}
          </button>
        )}
      </section>
    </aside>
  )
}
