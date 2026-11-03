/**
 * localStorage layer — เก็บเกมที่กำลังเล่น, สถิติ, การตั้งค่า
 * ทุกอย่างอยู่ใน localStorage ตาม requirement (ไม่ต้องมี backend)
 */
import { DIFFICULTIES, verifyPuzzle } from './sudoku'
import type { Difficulty, Grid, Puzzle } from './sudoku'

const GAME_KEY = 'sudoku.v1.game'
const STATS_KEY = 'sudoku.v1.stats'
const SETTINGS_KEY = 'sudoku.v1.settings'

export interface GameSnapshot {
  puzzle: Puzzle
  values: Grid
  notes: number[]
  elapsed: number
  hintsUsed: number
  mistakes: number
  status: 'playing' | 'won'
  notesMode: boolean
  createdAt: number
  updatedAt: number
}

export interface DifficultyStats {
  played: number
  completed: number
  bestTime: number | null
  totalTime: number
  hints: number
}

export type Stats = Record<Difficulty, DifficultyStats>

export interface RecentGame {
  difficulty: Difficulty
  time: number
  hints: number
  mistakes: number
  at: number
}

export interface StatsStore {
  byDifficulty: Stats
  recent: RecentGame[]
}

export interface Settings {
  /** ไฮไลต์ช่องที่ผิดทันที */
  showMistakes: boolean
  /** ไฮไลต์แถว/คอลัมน์/บล็อกของช่องที่เลือก */
  highlightPeers: boolean
  /** ไฮไลต์ช่องที่เป็นเลขเดียวกัน */
  highlightSame: boolean
  /** ไฮไลต์ทั้งแถว (แนวนอน) และคอลัมน์ (แนวตั้ง) ของช่องที่เลือก */
  highlightLines: boolean
  /** ลบโน้ตของเลขที่วางแล้วให้อัตโนมัติ */
  autoCleanNotes: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  showMistakes: true,
  highlightPeers: true,
  highlightSame: true,
  highlightLines: true,
  autoCleanNotes: true,
}

export function emptyStats(): Stats {
  return DIFFICULTIES.reduce((acc, d) => {
    acc[d] = { played: 0, completed: 0, bestTime: null, totalTime: 0, hints: 0 }
    return acc
  }, {} as Stats)
}

export function defaultStatsStore(): StatsStore {
  return { byDifficulty: emptyStats(), recent: [] }
}

/* ------------------------------------------------------------------ *
 * low level
 * ------------------------------------------------------------------ */

function readJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function writeJSON(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    // quota exceeded / storage disabled — เกมยังเล่นได้ แค่ไม่ถูกบันทึก
    return false
  }
}

const isGrid = (g: unknown): g is Grid =>
  Array.isArray(g) && g.length === 81 && g.every((v) => Number.isInteger(v) && v >= 0 && v <= 9)

/* ------------------------------------------------------------------ *
 * game
 * ------------------------------------------------------------------ */

export function loadGame(): GameSnapshot | null {
  const snap = readJSON<GameSnapshot>(GAME_KEY)
  if (!snap || typeof snap !== 'object') return null
  if (!snap.puzzle || !isGrid(snap.puzzle.givens) || !isGrid(snap.puzzle.solution)) return null
  if (!isGrid(snap.values) || !Array.isArray(snap.notes) || snap.notes.length !== 81) return null
  if (!snap.notes.every((n) => Number.isInteger(n) && n >= 0 && n < 1024)) return null
  if (!DIFFICULTIES.includes(snap.puzzle.difficulty)) return null

  // ตรวจว่า givens ยังอยู่ครบและ puzzle ยัง valid (กันข้อมูลเสีย/ถูกแก้)
  for (let i = 0; i < 81; i++) {
    if (snap.puzzle.givens[i] !== 0 && snap.values[i] !== snap.puzzle.givens[i]) return null
  }
  const verification = verifyPuzzle(snap.puzzle.givens, snap.puzzle.solution)
  if (!verification.ok) return null

  return {
    ...snap,
    elapsed: Number.isFinite(snap.elapsed) ? Math.max(0, Math.floor(snap.elapsed)) : 0,
    hintsUsed: Math.max(0, snap.hintsUsed | 0),
    mistakes: Math.max(0, snap.mistakes | 0),
    createdAt: snap.createdAt || Date.now(),
    updatedAt: snap.updatedAt || Date.now(),
  }
}

export function saveGame(snapshot: GameSnapshot): void {
  writeJSON(GAME_KEY, snapshot)
}

export function clearGame(): void {
  try {
    localStorage.removeItem(GAME_KEY)
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------ *
 * stats
 * ------------------------------------------------------------------ */

export function loadStats(): StatsStore {
  const raw = readJSON<StatsStore>(STATS_KEY)
  if (!raw || !raw.byDifficulty) return defaultStatsStore()
  const byDifficulty = emptyStats()
  for (const d of DIFFICULTIES) {
    const s = raw.byDifficulty[d]
    if (!s) continue
    byDifficulty[d] = {
      played: Math.max(0, s.played | 0),
      completed: Math.max(0, s.completed | 0),
      bestTime: Number.isFinite(s.bestTime) ? (s.bestTime as number) : null,
      totalTime: Math.max(0, s.totalTime | 0),
      hints: Math.max(0, s.hints | 0),
    }
  }
  const recent = Array.isArray(raw.recent) ? raw.recent.filter((r) => DIFFICULTIES.includes(r.difficulty)).slice(0, 12) : []
  return { byDifficulty, recent }
}

export function saveStats(stats: StatsStore): void {
  writeJSON(STATS_KEY, stats)
}

/* ------------------------------------------------------------------ *
 * settings
 * ------------------------------------------------------------------ */

export function loadSettings(): Settings {
  const raw = readJSON<Partial<Settings>>(SETTINGS_KEY)
  if (!raw) return { ...DEFAULT_SETTINGS }
  return {
    showMistakes: typeof raw.showMistakes === 'boolean' ? raw.showMistakes : DEFAULT_SETTINGS.showMistakes,
    highlightPeers: typeof raw.highlightPeers === 'boolean' ? raw.highlightPeers : DEFAULT_SETTINGS.highlightPeers,
    highlightSame: typeof raw.highlightSame === 'boolean' ? raw.highlightSame : DEFAULT_SETTINGS.highlightSame,
    highlightLines:
      typeof raw.highlightLines === 'boolean' ? raw.highlightLines : DEFAULT_SETTINGS.highlightLines,
    autoCleanNotes: typeof raw.autoCleanNotes === 'boolean' ? raw.autoCleanNotes : DEFAULT_SETTINGS.autoCleanNotes,
  }
}

export function saveSettings(settings: Settings): void {
  writeJSON(SETTINGS_KEY, settings)
}

/** ข้อมูลทั้งหมดที่เก็บไว้ (ใช้ในหน้า "ข้อมูลของฉัน") */
export function storageUsage(): { bytes: number; entries: number } {
  let bytes = 0
  let entries = 0
  try {
    for (const key of [GAME_KEY, STATS_KEY, SETTINGS_KEY]) {
      const v = localStorage.getItem(key)
      if (v) {
        bytes += v.length * 2
        entries++
      }
    }
  } catch {
    /* ignore */
  }
  return { bytes, entries }
}

export const STORAGE_KEYS = { GAME_KEY, STATS_KEY, SETTINGS_KEY }
