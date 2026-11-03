import { useEffect, useMemo, useState } from 'react'
import { Board } from './components/Board'
import { NumberPad } from './components/NumberPad'
import { SidePanel } from './components/SidePanel'
import { DifficultyPicker, TopBar } from './components/TopBar'
import { HintCard, Toolbar } from './components/Toolbar'
import { WinDialog } from './components/WinDialog'
import { useGame, wrongCells } from './hooks/useGame'
import { DIFFICULTY_META, countFilled } from './lib/sudoku'
import type { Difficulty } from './lib/sudoku'
import { applyTheme, loadTheme, saveTheme } from './lib/theme'
import type { Theme } from './lib/theme'
import ReactGA from 'react-ga4';

export default function App() {
  const { state, actions } = useGame()
  const [theme, setTheme] = useState<Theme>(loadTheme)

  const toggleTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    applyTheme(next)
    saveTheme(next)
    setTheme(next)
  }
  const [winDismissed, setWinDismissed] = useState(false)
  const [pendingDifficulty, setPendingDifficulty] = useState<Difficulty | null>(null)
  const [lastGameId, setLastGameId] = useState(state.createdAt)

  const { input, erase, move, toggleNotes, hint, undo, togglePause, select, dismissToast } = actions

  //Google Analytics
  useEffect(() => {
      const measurementId = import.meta.env.GA_MEASUREMENT_ID
      if (!measurementId) return
      ReactGA.initialize(measurementId);
      ReactGA.send({ hitType: "pageview", page: window.location.pathname });
  }, []);

  // เกมใหม่ (createdAt เปลี่ยน) → เคลียร์ dialog/confirm ที่ค้างอยู่
  if (lastGameId !== state.createdAt) {
    setLastGameId(state.createdAt)
    setWinDismissed(false)
    setPendingDifficulty(null)
  }

  // กันเผลอกดเปลี่ยนระดับแล้วเสียเกมที่เล่นอยู่
  const requestNewGame = (difficulty: Difficulty) => {
    const untouched = state.history.length === 0 && state.elapsed < 3
    if (untouched || state.status === 'won' || difficulty === state.puzzle.difficulty) {
      setPendingDifficulty(null)
      actions.newGame(difficulty)
      return
    }
    setPendingDifficulty(difficulty)
  }

  // ไฮไลต์ช่องที่ผิด (ถ้าเปิด setting หรือเคยกดตรวจ)
  const wrong = useMemo(() => {
    if (!state.settings.showMistakes && !state.hasChecked) return new Set<number>()
    return new Set(wrongCells(state.values, state.puzzle.solution))
  }, [state.values, state.puzzle.solution, state.settings.showMistakes, state.hasChecked])

  const filled = countFilled(state.values)
  const won = state.status === 'won'
  const locked = won || state.paused
  const hintCells = state.hint ? state.hint.cells : []
  const canReveal =
    state.selected !== null &&
    state.puzzle.givens[state.selected] === 0 &&
    state.values[state.selected] !== state.puzzle.solution[state.selected]

  // auto-hide toast
  useEffect(() => {
    if (!state.toast) return
    const id = window.setTimeout(() => dismissToast(), 3200)
    return () => window.clearTimeout(id)
  }, [state.toast, dismissToast])

  // keyboard controls
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey) {
        if (event.key.toLowerCase() === 'z') {
          event.preventDefault()
          undo()
        }
        return
      }
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
      if (state.status === 'won') return

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault()
          move(-1)
          break
        case 'ArrowRight':
          event.preventDefault()
          move(1)
          break
        case 'ArrowUp':
          event.preventDefault()
          move(-9)
          break
        case 'ArrowDown':
          event.preventDefault()
          move(9)
          break
        case 'Backspace':
        case 'Delete':
          event.preventDefault()
          erase()
          break
        case 'Escape':
          actions.dismiss()
          break
        default: {
          if (/^[1-9]$/.test(event.key)) {
            event.preventDefault()
            input(Number(event.key))
          } else if (event.key.toLowerCase() === 'n') {
            toggleNotes()
          } else if (event.key.toLowerCase() === 'h') {
            hint()
          } else if (event.key.toLowerCase() === 'u') {
            undo()
          } else if (event.key.toLowerCase() === 'p') {
            togglePause()
          }
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [actions, erase, hint, input, move, state.status, toggleNotes, togglePause, undo])

  return (
    <div className="app">
      <div className="app-glow" aria-hidden="true" />

      <div className="app-inner">
        <TopBar
          difficulty={state.puzzle.difficulty}
          elapsed={state.elapsed}
          paused={state.paused}
          status={state.status}
          theme={theme}
          onNewGame={requestNewGame}
          onTogglePause={actions.togglePause}
          onToggleTheme={toggleTheme}
        />

        <main className="layout">
          <section className="game-column">
            <DifficultyPicker current={state.puzzle.difficulty} onPick={requestNewGame} />

            {pendingDifficulty && (
              <div className="confirm-bar" role="alert">
                <span>
                  เริ่มเกมใหม่ระดับ{DIFFICULTY_META[pendingDifficulty].labelTh}? เกมที่เล่นอยู่จะหายไป
                </span>
                <div className="confirm-bar__actions">
                  <button
                    type="button"
                    className="btn btn--danger btn--sm"
                    onClick={() => {
                      actions.newGame(pendingDifficulty)
                      setPendingDifficulty(null)
                    }}
                  >
                    เริ่มใหม่
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => setPendingDifficulty(null)}
                  >
                    เล่นต่อ
                  </button>
                </div>
              </div>
            )}

            {state.hint && (
              <HintCard
                hint={state.hint}
                hintsUsed={state.hintsUsed}
                onApply={actions.applyHint}
                onDismiss={actions.dismiss}
              />
            )}

            <div className="board-card">
              <div className="board-meta">
                <span className="board-meta-chip">
                  💡 คำใบ้ {state.hintsUsed} · ✗ ผิด {state.mistakes}
                </span>
                <span className="board-meta-chip">
                  {filled}/81 ช่อง
                </span>
              </div>
              <div className="progress" aria-hidden="true">
                <span className="progress-bar" style={{ width: `${(filled / 81) * 100}%` }} />
              </div>

              <Board
                values={state.values}
                givens={state.puzzle.givens}
                notes={state.notes}
                selected={state.selected}
                wrong={wrong}
                hintCells={hintCells}
                highlightPeers={state.settings.highlightPeers}
                highlightSame={state.settings.highlightSame}
                paused={state.paused}
                onSelect={select}
                onResume={actions.togglePause}
              />

              {state.notesMode && (
                <p className="notes-banner">โหมดจดโน้ต — กดเลขเพื่อจด/ลบโน้ตในช่องที่เลือก</p>
              )}
            </div>

            <NumberPad values={state.values} notesMode={state.notesMode} disabled={locked} onInput={input} />

            <Toolbar
              notesMode={state.notesMode}
              canUndo={state.history.length > 0}
              disabled={locked}
              hintsUsed={state.hintsUsed}
              onToggleNotes={toggleNotes}
              onErase={erase}
              onUndo={undo}
              onHint={hint}
              onCheck={actions.check}
            />

            <p className="keyboard-hint">
              คีย์บอร์ด: ลูกศรเลื่อนช่อง · 1–9 ใส่เลข · Backspace ลบ · N โน้ต · H คำใบ้ · U ย้อนกลับ · P หยุด
            </p>
          </section>

          <SidePanel
            difficulty={state.puzzle.difficulty}
            clues={state.puzzle.clues}
            ratingLevel={state.puzzle.rating.level}
            stats={state.stats}
            settings={state.settings}
            canReveal={canReveal}
            onChangeSettings={actions.updateSettings}
            onClearStats={actions.clearStats}
            onRestart={actions.restart}
            onReveal={actions.reveal}
          />
        </main>

        <footer className="footer">
          <span>React + Vite · ข้อมูลทั้งหมดเก็บใน localStorage ของเครื่องนี้</span>
          <span className="footer-dot" aria-hidden="true">
            •
          </span>
          <span>ทุกกระดานผ่านการตรวจสอบ: มีคำตอบเดียว และเล่นจบได้จริง</span>
        </footer>
      </div>

      {state.toast && (
        <div className={`toast toast--${state.toast.tone}`} role="status" aria-live="polite">
          {state.toast.text}
        </div>
      )}

      {won && !winDismissed && (
        <WinDialog
          difficulty={state.puzzle.difficulty}
          elapsed={state.elapsed}
          hints={state.hintsUsed}
          mistakes={state.mistakes}
          onAgain={() => requestNewGame(state.puzzle.difficulty)}
          onClose={() => setWinDismissed(true)}
        />
      )}
    </div>
  )
}
