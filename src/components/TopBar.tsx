import type { CSSProperties } from 'react'
import { DIFFICULTIES, DIFFICULTY_META, formatTime } from '../lib/sudoku'
import type { Difficulty } from '../lib/sudoku'
import type { Theme } from '../lib/theme'
import { t } from '../lib/i18n'
import type { Lang } from '../lib/i18n'

interface TopBarProps {
  difficulty: Difficulty
  elapsed: number
  paused: boolean
  status: 'playing' | 'won'
  theme: Theme
  lang: Lang
  onNewGame: (difficulty: Difficulty) => void
  onTogglePause: () => void
  onToggleTheme: () => void
  onToggleLang: () => void
}

export function TopBar({
  difficulty,
  elapsed,
  paused,
  status,
  theme,
  lang,
  onNewGame,
  onTogglePause,
  onToggleTheme,
  onToggleLang,
}: TopBarProps) {
  const nextLabel = t(lang, theme === 'dark' ? 'topbar.themeToLight' : 'topbar.themeToDark')
  return (
    <header className="app-header">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          9
        </span>
        <div className="brand-text">
          <h1>Sudoku</h1>
          <p>{t(lang, 'app.subtitle')}</p>
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
          className="btn btn--ghost theme-toggle"
          onClick={onToggleTheme}
          aria-label={nextLabel}
          title={nextLabel}
        >
          {theme === 'dark' ? '☀' : '☾'}
        </button>
        <button
          type="button"
          className="btn btn--ghost lang-toggle"
          onClick={onToggleLang}
          aria-label={t(lang, lang === 'en' ? 'topbar.langToThai' : 'topbar.langToEnglish')}
          title={t(lang, lang === 'en' ? 'topbar.langToThai' : 'topbar.langToEnglish')}
        >
          {lang === 'en' ? 'EN' : 'TH'}
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={onTogglePause}
          disabled={status === 'won'}
          aria-label={t(lang, paused ? 'topbar.resume' : 'topbar.pause')}
        >
          {paused ? `▶ ${t(lang, 'topbar.resume')}` : `⏸ ${t(lang, 'topbar.pause')}`}
        </button>
        <button type="button" className="btn btn--primary" onClick={() => onNewGame(difficulty)}>
          {t(lang, 'topbar.newGame')}
        </button>
      </div>
    </header>
  )
}

interface DifficultyPickerProps {
  current: Difficulty
  lang: Lang
  onPick: (difficulty: Difficulty) => void
}

export function DifficultyPicker({ current, lang, onPick }: DifficultyPickerProps) {
  return (
    <div className="difficulty">
      <div className="segmented" role="tablist" aria-label={t(lang, 'topbar.difficultyLabel')}>
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
              {lang === 'th' ? meta.labelTh : meta.label}
              <span className="seg-en">{lang === 'th' ? meta.label : meta.labelTh}</span>
            </button>
          )
        })}
      </div>
      <p className="difficulty-note">{t(lang, `blurb.${current}`)}</p>
    </div>
  )
}
