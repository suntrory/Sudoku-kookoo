import { useCallback, useEffect, useReducer } from 'react'
import { PEERS, generatePuzzle, isSolved } from '../lib/sudoku'
import type { Difficulty, Grid, Puzzle } from '../lib/sudoku'
import { findHint } from '../lib/hints'
import type { Hint } from '../lib/hints'
import {
  clearGame,
  defaultStatsStore,
  loadGame,
  loadSettings,
  loadStats,
  saveGame,
  saveSettings,
  saveStats,
} from '../lib/storage'
import type { GameSnapshot, Settings, Stats, StatsStore } from '../lib/storage'

export interface Toast {
  text: string
  tone: 'info' | 'good' | 'bad'
}

export interface GameState {
  puzzle: Puzzle
  values: Grid
  notes: number[]
  selected: number | null
  elapsed: number
  paused: boolean
  status: 'playing' | 'won'
  hintsUsed: number
  mistakes: number
  notesMode: boolean
  hint: Hint | null
  toast: Toast | null
  hasChecked: boolean
  /** snapshot สำหรับ undo (เก็บใน memory เท่านั้น) */
  history: Array<{ values: Grid; notes: number[] }>
  stats: StatsStore
  settings: Settings
  createdAt: number
}

export type Action =
  | { type: 'new'; difficulty: Difficulty }
  | { type: 'restart' }
  | { type: 'select'; cell: number | null }
  | { type: 'move'; delta: number }
  | { type: 'input'; digit: number }
  | { type: 'erase' }
  | { type: 'toggleNotes' }
  | { type: 'undo' }
  | { type: 'hint' }
  | { type: 'applyHint' }
  | { type: 'dismiss' }
  | { type: 'dismissToast' }
  | { type: 'check' }
  | { type: 'reveal' }
  | { type: 'togglePause' }
  | { type: 'tick' }
  | { type: 'settings'; patch: Partial<Settings> }
  | { type: 'clearStats' }

/* ------------------------------------------------------------------ *
 * helpers
 * ------------------------------------------------------------------ */

function bumpPlayed(stats: StatsStore, difficulty: Difficulty): StatsStore {
  const current = stats.byDifficulty[difficulty]
  return {
    ...stats,
    byDifficulty: {
      ...stats.byDifficulty,
      [difficulty]: { ...current, played: current.played + 1 },
    },
  }
}

function bumpCompleted(state: GameState): StatsStore {
  const difficulty = state.puzzle.difficulty
  const current = state.stats.byDifficulty[difficulty]
  const bestTime =
    current.bestTime === null ? state.elapsed : Math.min(current.bestTime, state.elapsed)

  return {
    byDifficulty: {
      ...state.stats.byDifficulty,
      [difficulty]: {
        ...current,
        completed: current.completed + 1,
        bestTime,
        totalTime: current.totalTime + state.elapsed,
        hints: current.hints + state.hintsUsed,
      },
    },
    recent: [
      {
        difficulty,
        time: state.elapsed,
        hints: state.hintsUsed,
        mistakes: state.mistakes,
        at: Date.now(),
      },
      ...state.stats.recent,
    ].slice(0, 12),
  }
}

function freshGame(difficulty: Difficulty, stats: StatsStore, settings: Settings): GameState {
  const puzzle = generatePuzzle(difficulty)
  return {
    puzzle,
    values: puzzle.givens.slice(),
    notes: new Array<number>(81).fill(0),
    selected: null,
    elapsed: 0,
    paused: false,
    status: 'playing',
    hintsUsed: 0,
    mistakes: 0,
    notesMode: false,
    hint: null,
    toast: null,
    hasChecked: false,
    history: [],
    stats: bumpPlayed(stats, difficulty),
    settings,
    createdAt: Date.now(),
  }
}

function hydrate(saved: GameSnapshot, stats: StatsStore, settings: Settings): GameState {
  return {
    puzzle: saved.puzzle,
    values: saved.values,
    notes: saved.notes,
    selected: null,
    elapsed: saved.elapsed,
    paused: false,
    status: saved.status,
    hintsUsed: saved.hintsUsed,
    mistakes: saved.mistakes,
    notesMode: saved.notesMode,
    hint: null,
    toast: null,
    hasChecked: false,
    history: [],
    stats,
    settings,
    createdAt: saved.createdAt,
  }
}

function initState(): GameState {
  const settings = loadSettings()
  const stats = loadStats()
  const saved = loadGame()
  if (saved) return hydrate(saved, stats, settings)
  return freshGame('easy', stats, settings)
}

function pushHistory(state: GameState): GameState['history'] {
  return [{ values: state.values.slice(), notes: state.notes.slice() }, ...state.history].slice(0, 80)
}

function finish(state: GameState): GameState {
  if (state.status === 'won') return state
  return {
    ...state,
    status: 'won',
    paused: false,
    hint: null,
    toast: { text: 'แก้สำเร็จแล้ว! 🎉', tone: 'good' },
    stats: bumpCompleted(state),
  }
}

function placeDigit(state: GameState, cell: number, digit: number): GameState {
  if (state.puzzle.givens[cell] !== 0) return state
  if (state.values[cell] === digit) return state

  const values = state.values.slice()
  values[cell] = digit
  const notes = state.notes.slice()
  notes[cell] = 0

  const correct = digit === state.puzzle.solution[cell]
  let mistakes = state.mistakes
  if (!correct) mistakes += 1

  if (correct && state.settings.autoCleanNotes) {
    for (const peer of PEERS[cell]) {
      if (notes[peer] & (1 << digit)) notes[peer] &= ~(1 << digit)
    }
  }

  const next: GameState = { ...state, values, notes, mistakes, hint: null, hasChecked: false }
  if (correct && isSolved(values, state.puzzle.solution)) return finish(next)
  return next
}

export function wrongCells(values: Grid, solution: Grid): number[] {
  const out: number[] = []
  for (let i = 0; i < 81; i++) if (values[i] && values[i] !== solution[i]) out.push(i)
  return out
}

/* ------------------------------------------------------------------ *
 * reducer
 * ------------------------------------------------------------------ */

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'new':
      return { ...freshGame(action.difficulty, state.stats, state.settings) }

    case 'restart': {
      const puzzle = state.puzzle
      return {
        ...state,
        values: puzzle.givens.slice(),
        notes: new Array<number>(81).fill(0),
        selected: null,
        elapsed: 0,
        paused: false,
        status: 'playing',
        hintsUsed: 0,
        mistakes: 0,
        hint: null,
        toast: { text: 'เริ่มกระดานนี้ใหม่แล้ว', tone: 'info' },
        hasChecked: false,
        history: [],
        createdAt: Date.now(),
      }
    }

    case 'select':
      if (state.status !== 'playing') return state
      return { ...state, selected: action.cell, hint: null }

    case 'move': {
      const current = state.selected ?? 40
      const row = Math.floor(current / 9)
      const col = current % 9
      const step = action.delta
      let nextRow = row
      let nextCol = col
      if (step === -1) nextCol = (col + 8) % 9
      if (step === 1) nextCol = (col + 1) % 9
      if (step === -9) nextRow = (row + 8) % 9
      if (step === 9) nextRow = (row + 1) % 9
      return { ...state, selected: nextRow * 9 + nextCol, hint: null }
    }

    case 'input': {
      const cell = state.selected
      if (state.status !== 'playing' || state.paused || cell === null) return state
      if (state.puzzle.givens[cell] !== 0) return state
      const digit = action.digit
      if (digit < 1 || digit > 9) return state

      if (state.notesMode) {
        if (state.values[cell] !== 0) return state
        const notes = state.notes.slice()
        notes[cell] ^= 1 << digit
        return { ...state, notes, history: pushHistory(state), hint: null }
      }

      if (state.values[cell] === digit) {
        const values = state.values.slice()
        values[cell] = 0
        return { ...state, values, history: pushHistory(state), hint: null }
      }

      const history = pushHistory(state)
      return placeDigit({ ...state, history }, cell, digit)
    }

    case 'erase': {
      const cell = state.selected
      if (state.status !== 'playing' || state.paused || cell === null) return state
      if (state.puzzle.givens[cell] !== 0) return state
      if (state.values[cell] === 0 && state.notes[cell] === 0) return state
      const values = state.values.slice()
      const notes = state.notes.slice()
      values[cell] = 0
      notes[cell] = 0
      return { ...state, values, notes, history: pushHistory(state), hint: null }
    }

    case 'toggleNotes':
      return { ...state, notesMode: !state.notesMode }

    case 'undo': {
      if (!state.history.length || state.status !== 'playing') return state
      const [prev, ...rest] = state.history
      return { ...state, values: prev.values, notes: prev.notes, history: rest, hint: null }
    }

    case 'hint': {
      if (state.status !== 'playing') return state
      const hint = findHint(state.values, state.puzzle.solution)
      if (!hint) return state

      if (hint.kind === 'mistake') {
        return {
          ...state,
          hint,
          hasChecked: true,
          toast: { text: hint.title, tone: 'bad' },
        }
      }

      let notes = state.notes
      if (hint.kind === 'eliminate' && hint.eliminable?.length) {
        notes = state.notes.slice()
        for (const { cell, digit } of hint.eliminable) notes[cell] &= ~(1 << digit)
      }

      return {
        ...state,
        hint,
        notes,
        hintsUsed: state.hintsUsed + 1,
        toast: null,
      }
    }

    case 'applyHint': {
      const hint = state.hint
      if (!hint || state.status !== 'playing') return state
      if ((hint.kind === 'place' || hint.kind === 'reveal') && hint.cells.length && hint.digit) {
        return placeDigit({ ...state, history: pushHistory(state) }, hint.cells[0], hint.digit)
      }
      return { ...state, hint: null }
    }

    case 'dismiss':
      return { ...state, hint: null, toast: null }

    case 'dismissToast':
      return { ...state, toast: null }

    case 'check': {
      const wrong = wrongCells(state.values, state.puzzle.solution)
      return {
        ...state,
        hasChecked: true,
        toast: wrong.length
          ? { text: `พบ ${wrong.length} ช่องที่ยังไม่ถูก`, tone: 'bad' }
          : { text: 'ทุกช่องที่เติมถูกต้องแล้ว 👍', tone: 'good' },
      }
    }

    case 'reveal': {
      const cell = state.selected
      if (state.status !== 'playing' || cell === null) return state
      if (state.puzzle.givens[cell] !== 0 || state.values[cell] === state.puzzle.solution[cell]) return state
      return placeDigit(
        { ...state, hintsUsed: state.hintsUsed + 1, history: pushHistory(state) },
        cell,
        state.puzzle.solution[cell],
      )
    }

    case 'togglePause':
      if (state.status !== 'playing') return state
      return { ...state, paused: !state.paused, hint: null }

    case 'tick':
      if (state.status !== 'playing' || state.paused) return state
      return { ...state, elapsed: state.elapsed + 1 }

    case 'settings':
      return { ...state, settings: { ...state.settings, ...action.patch } }

    case 'clearStats':
      return { ...state, stats: defaultStatsStore(), toast: { text: 'ล้างสถิติแล้ว', tone: 'info' } }

    default:
      return state
  }
}

/* ------------------------------------------------------------------ *
 * persistence helpers
 * ------------------------------------------------------------------ */

function toSnapshot(state: GameState): GameSnapshot {
  return {
    puzzle: state.puzzle,
    values: state.values,
    notes: state.notes,
    elapsed: state.elapsed,
    hintsUsed: state.hintsUsed,
    mistakes: state.mistakes,
    status: state.status,
    notesMode: state.notesMode,
    createdAt: state.createdAt,
    updatedAt: Date.now(),
  }
}

/* ------------------------------------------------------------------ *
 * hook
 * ------------------------------------------------------------------ */

export function useGame() {
  const [state, dispatch] = useReducer(reducer, undefined, initState)

  // บันทึกเกมลง localStorage (elapsed เขียนทุก 5 วินาที ไม่ใช่ทุกTick)
  const elapsedBucket = Math.floor(state.elapsed / 5)
  useEffect(() => {
    saveGame(toSnapshot(state))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    state.puzzle,
    state.values,
    state.notes,
    state.status,
    state.hintsUsed,
    state.mistakes,
    state.notesMode,
    state.createdAt,
    elapsedBucket,
  ])

  useEffect(() => {
    saveStats(state.stats)
  }, [state.stats])

  useEffect(() => {
    saveSettings(state.settings)
  }, [state.settings])

  // timer
  useEffect(() => {
    if (state.status !== 'playing' || state.paused) return
    const id = window.setInterval(() => dispatch({ type: 'tick' }), 1000)
    return () => window.clearInterval(id)
  }, [state.status, state.paused])

  // pause เมื่อสลับแท็บ (กันเวลาบวม)
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) dispatch({ type: 'togglePause' })
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  const newGame = useCallback((difficulty: Difficulty) => dispatch({ type: 'new', difficulty }), [])
  const restart = useCallback(() => dispatch({ type: 'restart' }), [])
  const select = useCallback((cell: number | null) => dispatch({ type: 'select', cell }), [])
  const move = useCallback((delta: number) => dispatch({ type: 'move', delta }), [])
  const input = useCallback((digit: number) => dispatch({ type: 'input', digit }), [])
  const erase = useCallback(() => dispatch({ type: 'erase' }), [])
  const toggleNotes = useCallback(() => dispatch({ type: 'toggleNotes' }), [])
  const undo = useCallback(() => dispatch({ type: 'undo' }), [])
  const hint = useCallback(() => dispatch({ type: 'hint' }), [])
  const applyHint = useCallback(() => dispatch({ type: 'applyHint' }), [])
  const dismiss = useCallback(() => dispatch({ type: 'dismiss' }), [])
  const dismissToast = useCallback(() => dispatch({ type: 'dismissToast' }), [])
  const check = useCallback(() => dispatch({ type: 'check' }), [])
  const reveal = useCallback(() => dispatch({ type: 'reveal' }), [])
  const togglePause = useCallback(() => dispatch({ type: 'togglePause' }), [])
  const updateSettings = useCallback(
    (patch: Partial<Settings>) => dispatch({ type: 'settings', patch }),
    [],
  )
  const clearStats = useCallback(() => dispatch({ type: 'clearStats' }), [])
  const resetEverything = useCallback(() => {
    clearGame()
    dispatch({ type: 'clearStats' })
  }, [])

  return {
    state,
    actions: {
      newGame,
      restart,
      select,
      move,
      input,
      erase,
      toggleNotes,
      undo,
      hint,
      applyHint,
      dismiss,
      dismissToast,
      check,
      reveal,
      togglePause,
      updateSettings,
      clearStats,
      resetEverything,
    },
  }
}

export type { Stats }
