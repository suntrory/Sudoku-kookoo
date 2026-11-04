/**
 * Sudoku core engine
 * -------------------------------------------------------------
 * - bitmask solver (fast) : countSolutions / solveFirst / isValidSolution
 * - randomized generator  : generateSolution / generatePuzzle
 * - difficulty rating     : human techniques only (singles -> locked candidates -> pairs -> x-wing)
 *
 * ทุก puzzle ที่ generate ออกมาจะถูก "verify" ทันที (unique solution + solution ถูกต้อง
 * + givens ตรงกับ solution + แก้จาก givens ไปเป็น solution ได้จริง) ถ้าไม่ผ่านจะไม่คืนค่า
 */

export type Difficulty = 'easy' | 'medium' | 'hard'
export type Grid = number[]

export const ALL_DIGITS = 0b11_1111_1110 // bits 1..9 = 1022

export const DIFFICULTIES: readonly Difficulty[] = ['easy', 'medium', 'hard'] as const

export interface DifficultyMeta {
  key: Difficulty
  label: string
  labelTh: string
  /** ช่วงจำนวนเลขตั้งต้น (clues) ที่ยอมรับ */
  clues: readonly [number, number]
  /** ระดับเทคนิคสูงสุดที่อนุญาตให้ต้องใช้ */
  maxLevel: number
  accent: string
}

export const DIFFICULTY_META: Record<Difficulty, DifficultyMeta> = {
  easy: {
    key: 'easy',
    label: 'Easy',
    labelTh: 'ง่าย',
    clues: [41, 47],
    maxLevel: 1,
    accent: '#34d399',
  },
  medium: {
    key: 'medium',
    label: 'Medium',
    labelTh: 'ปานกลาง',
    clues: [33, 39],
    maxLevel: 2,
    accent: '#60a5fa',
  },
  hard: {
    key: 'hard',
    label: 'Hard',
    labelTh: 'ยาก',
    clues: [26, 31],
    maxLevel: 5,
    accent: '#f472b6',
  },
}

/* ------------------------------------------------------------------ *
 * geometry helpers
 * ------------------------------------------------------------------ */

export const cellRow = (i: number): number => (i / 9) | 0
export const cellCol = (i: number): number => i % 9
export const cellBox = (i: number): number => (((i / 9) | 0) / 3 | 0) * 3 + (((i % 9) / 3) | 0)

export const UNITS: number[][] = (() => {
  const units: number[][] = []
  for (let r = 0; r < 9; r++) units.push(Array.from({ length: 9 }, (_, c) => r * 9 + c))
  for (let c = 0; c < 9; c++) units.push(Array.from({ length: 9 }, (_, r) => r * 9 + c))
  for (let b = 0; b < 9; b++) {
    const br = Math.floor(b / 3) * 3
    const bc = (b % 3) * 3
    const cells: number[] = []
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) cells.push((br + r) * 9 + bc + c)
    units.push(cells)
  }
  return units
})()

const UNITS_OF: number[][] = (() => {
  const list: number[][] = Array.from({ length: 81 }, () => [])
  UNITS.forEach((unit, u) => unit.forEach((cell) => list[cell].push(u)))
  return list
})()

export const PEERS: number[][] = (() => {
  const list: number[][] = Array.from({ length: 81 }, () => [])
  for (let i = 0; i < 81; i++) {
    const set = new Set<number>()
    for (const u of UNITS_OF[i]) for (const j of UNITS[u]) if (j !== i) set.add(j)
    list[i] = [...set]
  }
  return list
})()

/* ------------------------------------------------------------------ *
 * bit helpers
 * ------------------------------------------------------------------ */

const POPCOUNT = new Uint8Array(1024)
for (let i = 1; i < 1024; i++) POPCOUNT[i] = POPCOUNT[i >> 1] + (i & 1)

export const popcount = (mask: number): number => POPCOUNT[mask & 0x3ff]

export function digitsOf(mask: number): number[] {
  const out: number[] = []
  for (let d = 1; d <= 9; d++) if (mask & (1 << d)) out.push(d)
  return out
}

export function bitToDigit(mask: number): number {
  for (let d = 1; d <= 9; d++) if (mask & (1 << d)) return d
  return 0
}

export function candidatesOf(values: Grid, cell: number): number[] {
  return digitsOf(computeCandidates(values)[cell])
}

/* ------------------------------------------------------------------ *
 * validity / solving
 * ------------------------------------------------------------------ */

export function isValidSolution(values: Grid): boolean {
  if (values.length !== 81) return false
  for (const unit of UNITS) {
    let mask = 0
    for (const cell of unit) {
      const v = values[cell]
      if (!Number.isInteger(v) || v < 1 || v > 9) return false
      const bit = 1 << v
      if (mask & bit) return false
      mask |= bit
    }
  }
  return true
}

/** นับจำนวนคำตอบ (หยุดเมื่อถึง limit) — ใช้ตรวจ uniqueness */
export function countSolutions(grid: Grid, limit = 2): number {
  if (grid.length !== 81) return 0
  const rows = new Int32Array(9)
  const cols = new Int32Array(9)
  const boxes = new Int32Array(9)
  const g = new Uint8Array(81)

  for (let i = 0; i < 81; i++) {
    const v = grid[i] | 0
    if (v < 0 || v > 9) return 0
    g[i] = v
    if (v) {
      const bit = 1 << v
      const r = cellRow(i)
      const c = cellCol(i)
      const b = cellBox(i)
      if ((rows[r] | cols[c] | boxes[b]) & bit) return 0
      rows[r] |= bit
      cols[c] |= bit
      boxes[b] |= bit
    }
  }

  let count = 0

  const search = (): void => {
    let best = -1
    let bestMask = 0
    let bestCount = 10

    for (let i = 0; i < 81; i++) {
      if (g[i]) continue
      const mask = ALL_DIGITS & ~(rows[cellRow(i)] | cols[cellCol(i)] | boxes[cellBox(i)])
      if (mask === 0) return
      const n = POPCOUNT[mask]
      if (n < bestCount) {
        bestCount = n
        best = i
        bestMask = mask
        if (n === 1) break
      }
    }

    if (best === -1) {
      count++
      return
    }

    const r = cellRow(best)
    const c = cellCol(best)
    const b = cellBox(best)

    for (let v = 1; v <= 9; v++) {
      const bit = 1 << v
      if (!(bestMask & bit)) continue
      g[best] = v
      rows[r] |= bit
      cols[c] |= bit
      boxes[b] |= bit
      search()
      g[best] = 0
      rows[r] &= ~bit
      cols[c] &= ~bit
      boxes[b] &= ~bit
      if (count >= limit) return
    }
  }

  search()
  return count
}

/** หาคำตอบแรก (null ถ้าแก้ไม่ได้) */
export function solveFirst(grid: Grid): Grid | null {
  if (grid.length !== 81) return null
  const values = grid.slice()
  const rows = new Int32Array(9)
  const cols = new Int32Array(9)
  const boxes = new Int32Array(9)

  for (let i = 0; i < 81; i++) {
    const v = values[i] | 0
    if (!v) continue
    if (v < 1 || v > 9) return null
    const bit = 1 << v
    if ((rows[cellRow(i)] | cols[cellCol(i)] | boxes[cellBox(i)]) & bit) return null
    rows[cellRow(i)] |= bit
    cols[cellCol(i)] |= bit
    boxes[cellBox(i)] |= bit
  }

  const search = (): boolean => {
    let best = -1
    let bestMask = 0
    let bestCount = 10
    for (let i = 0; i < 81; i++) {
      if (values[i]) continue
      const mask = ALL_DIGITS & ~(rows[cellRow(i)] | cols[cellCol(i)] | boxes[cellBox(i)])
      if (mask === 0) return false
      const n = POPCOUNT[mask]
      if (n < bestCount) {
        bestCount = n
        best = i
        bestMask = mask
        if (n === 1) break
      }
    }
    if (best === -1) return true

    const r = cellRow(best)
    const c = cellCol(best)
    const b = cellBox(best)
    for (let v = 1; v <= 9; v++) {
      const bit = 1 << v
      if (!(bestMask & bit)) continue
      values[best] = v
      rows[r] |= bit
      cols[c] |= bit
      boxes[b] |= bit
      if (search()) return true
      values[best] = 0
      rows[r] &= ~bit
      cols[c] &= ~bit
      boxes[b] &= ~bit
    }
    return false
  }

  return search() ? values : null
}

/* ------------------------------------------------------------------ *
 * candidates
 * ------------------------------------------------------------------ */

export function computeCandidates(values: Grid): number[] {
  const rows = new Int32Array(9)
  const cols = new Int32Array(9)
  const boxes = new Int32Array(9)
  for (let i = 0; i < 81; i++) {
    const v = values[i] | 0
    if (!v) continue
    const bit = 1 << v
    rows[cellRow(i)] |= bit
    cols[cellCol(i)] |= bit
    boxes[cellBox(i)] |= bit
  }
  const cand = new Array<number>(81).fill(0)
  for (let i = 0; i < 81; i++) {
    if (values[i]) continue
    cand[i] = ALL_DIGITS & ~(rows[cellRow(i)] | cols[cellCol(i)] | boxes[cellBox(i)])
  }
  return cand
}

/* ------------------------------------------------------------------ *
 * human techniques
 * ------------------------------------------------------------------ */

export type Technique =
  | 'naked-single'
  | 'hidden-single'
  | 'locked-candidates'
  | 'naked-pair'
  | 'hidden-pair'
  | 'x-wing'

export const TECHNIQUE_LEVEL: Record<Technique, number> = {
  'naked-single': 1,
  'hidden-single': 1,
  'locked-candidates': 2,
  'naked-pair': 2,
  'hidden-pair': 2,
  'x-wing': 3,
}

export interface Elimination {
  cell: number
  digit: number
}

export interface Step {
  technique: Technique
  level: number
  type: 'place' | 'eliminate'
  cell?: number
  digit?: number
  /** ช่องที่ควรไฮไลต์เพื่ออธิบาย */
  cells: number[]
  unit?: number
  eliminations?: Elimination[]
}

function findNakedSingle(values: Grid, cand: number[]): Step | null {
  for (let i = 0; i < 81; i++) {
    if (values[i]) continue
    const mask = cand[i]
    if (mask && POPCOUNT[mask] === 1) {
      return { technique: 'naked-single', level: 1, type: 'place', cell: i, digit: bitToDigit(mask), cells: [i] }
    }
  }
  return null
}

function findHiddenSingle(values: Grid, cand: number[]): Step | null {
  for (let u = 0; u < 27; u++) {
    const unit = UNITS[u]
    let placed = 0
    for (const i of unit) if (values[i]) placed |= 1 << values[i]
    for (let d = 1; d <= 9; d++) {
      const bit = 1 << d
      if (placed & bit) continue
      let only = -1
      let hits = 0
      for (const i of unit) {
        if (values[i]) continue
        if (cand[i] & bit) {
          only = i
          hits++
          if (hits > 1) break
        }
      }
      if (hits === 1) {
        return { technique: 'hidden-single', level: 1, type: 'place', cell: only, digit: d, cells: [only], unit: u }
      }
    }
  }
  return null
}

function findLockedCandidates(values: Grid, cand: number[]): Step | null {
  // pointing : บล็อก -> แถว/คอลัมน์
  for (let b = 0; b < 9; b++) {
    const unit = UNITS[18 + b]
    for (let d = 1; d <= 9; d++) {
      const bit = 1 << d
      const spots = unit.filter((i) => !values[i] && cand[i] & bit)
      if (spots.length < 2) continue

      const rows = new Set(spots.map(cellRow))
      if (rows.size === 1) {
        const r = cellRow(spots[0])
        const eliminations: Elimination[] = []
        for (const i of UNITS[r]) {
          if (values[i] || cellBox(i) === b) continue
          if (cand[i] & bit) eliminations.push({ cell: i, digit: d })
        }
        if (eliminations.length) {
          return {
            technique: 'locked-candidates',
            level: 2,
            type: 'eliminate',
            digit: d,
            cells: spots,
            unit: 18 + b,
            eliminations,
          }
        }
      }

      const cols = new Set(spots.map(cellCol))
      if (cols.size === 1) {
        const c = cellCol(spots[0])
        const eliminations: Elimination[] = []
        for (const i of UNITS[9 + c]) {
          if (values[i] || cellBox(i) === b) continue
          if (cand[i] & bit) eliminations.push({ cell: i, digit: d })
        }
        if (eliminations.length) {
          return {
            technique: 'locked-candidates',
            level: 2,
            type: 'eliminate',
            digit: d,
            cells: spots,
            unit: 18 + b,
            eliminations,
          }
        }
      }
    }
  }

  // claiming : แถว/คอลัมน์ -> บล็อก
  for (let u = 0; u < 18; u++) {
    const unit = UNITS[u]
    for (let d = 1; d <= 9; d++) {
      const bit = 1 << d
      const spots = unit.filter((i) => !values[i] && cand[i] & bit)
      if (spots.length < 2) continue
      const boxes = new Set(spots.map(cellBox))
      if (boxes.size !== 1) continue
      const b = cellBox(spots[0])
      const isRowUnit = u < 9
      const lineIndex = isRowUnit ? cellRow(spots[0]) : cellCol(spots[0])
      const eliminations: Elimination[] = []
      for (const i of UNITS[18 + b]) {
        if (values[i]) continue
        if (isRowUnit && cellRow(i) === lineIndex) continue
        if (!isRowUnit && cellCol(i) === lineIndex) continue
        if (!(cand[i] & bit)) continue
        eliminations.push({ cell: i, digit: d })
      }
      if (eliminations.length) {
        return { technique: 'locked-candidates', level: 2, type: 'eliminate', digit: d, cells: spots, unit: u, eliminations }
      }
    }
  }

  return null
}

function findNakedPair(values: Grid, cand: number[]): Step | null {
  for (let u = 0; u < 27; u++) {
    const unit = UNITS[u]
    const pairs = new Map<number, number[]>()
    for (const i of unit) {
      if (values[i]) continue
      const mask = cand[i]
      if (POPCOUNT[mask] !== 2) continue
      const existing = pairs.get(mask)
      if (existing) existing.push(i)
      else pairs.set(mask, [i])
    }
    for (const [mask, cells] of pairs) {
      if (cells.length !== 2) continue
      const eliminations: Elimination[] = []
      for (const i of unit) {
        if (values[i] || cells.includes(i)) continue
        for (const d of digitsOf(mask)) if (cand[i] & (1 << d)) eliminations.push({ cell: i, digit: d })
      }
      if (eliminations.length) {
        return { technique: 'naked-pair', level: 2, type: 'eliminate', cells, unit: u, eliminations }
      }
    }
  }
  return null
}

function findHiddenPair(values: Grid, cand: number[]): Step | null {
  for (let u = 0; u < 27; u++) {
    const unit = UNITS[u]
    const spotsByDigit = new Map<number, number[]>()
    for (let d = 1; d <= 9; d++) {
      const bit = 1 << d
      const spots = unit.filter((i) => !values[i] && cand[i] & bit)
      spotsByDigit.set(d, spots)
    }
    for (let d1 = 1; d1 <= 9; d1++) {
      for (let d2 = d1 + 1; d2 <= 9; d2++) {
        const s1 = spotsByDigit.get(d1)!
        const s2 = spotsByDigit.get(d2)!
        if (s1.length !== 2 || s2.length !== 2) continue
        if (s1[0] !== s2[0] || s1[1] !== s2[1]) continue
        const pairMask = (1 << d1) | (1 << d2)
        const eliminations: Elimination[] = []
        for (const i of s1) {
          for (const d of digitsOf(cand[i])) if (!(pairMask & (1 << d))) eliminations.push({ cell: i, digit: d })
        }
        if (eliminations.length) {
          return { technique: 'hidden-pair', level: 2, type: 'eliminate', cells: s1, unit: u, eliminations }
        }
      }
    }
  }
  return null
}

function findXWing(values: Grid, cand: number[]): Step | null {
  for (let d = 1; d <= 9; d++) {
    const bit = 1 << d
    // rows
    const rowsSpots: number[][] = []
    for (let r = 0; r < 9; r++) {
      const cols = UNITS[r].filter((i) => !values[i] && cand[i] & bit).map(cellCol)
      rowsSpots.push(cols.length === 2 ? cols : [])
    }
    for (let r1 = 0; r1 < 9; r1++) {
      for (let r2 = r1 + 1; r2 < 9; r2++) {
        const a = rowsSpots[r1]
        const b = rowsSpots[r2]
        if (!a.length || !b.length) continue
        if (a[0] !== b[0] || a[1] !== b[1]) continue
        const eliminations: Elimination[] = []
        for (const c of a) {
          for (let r = 0; r < 9; r++) {
            if (r === r1 || r === r2) continue
            const i = r * 9 + c
            if (!values[i] && cand[i] & bit) eliminations.push({ cell: i, digit: d })
          }
        }
        if (eliminations.length) {
          return {
            technique: 'x-wing',
            level: 3,
            type: 'eliminate',
            digit: d,
            cells: [r1 * 9 + a[0], r1 * 9 + a[1], r2 * 9 + a[0], r2 * 9 + a[1]],
            eliminations,
          }
        }
      }
    }
    // columns
    const colsSpots: number[][] = []
    for (let c = 0; c < 9; c++) {
      const rows = UNITS[9 + c].filter((i) => !values[i] && cand[i] & bit).map(cellRow)
      colsSpots.push(rows.length === 2 ? rows : [])
    }
    for (let c1 = 0; c1 < 9; c1++) {
      for (let c2 = c1 + 1; c2 < 9; c2++) {
        const a = colsSpots[c1]
        const b = colsSpots[c2]
        if (!a.length || !b.length) continue
        if (a[0] !== b[0] || a[1] !== b[1]) continue
        const eliminations: Elimination[] = []
        for (const r of a) {
          for (let c = 0; c < 9; c++) {
            if (c === c1 || c === c2) continue
            const i = r * 9 + c
            if (!values[i] && cand[i] & bit) eliminations.push({ cell: i, digit: d })
          }
        }
        if (eliminations.length) {
          return {
            technique: 'x-wing',
            level: 3,
            type: 'eliminate',
            digit: d,
            cells: [a[0] * 9 + c1, a[1] * 9 + c1, a[0] * 9 + c2, a[1] * 9 + c2],
            eliminations,
          }
        }
      }
    }
  }
  return null
}

/** หา logical step ถัดไปจากกระดานปัจจุบัน (null = ต้องเดา) */
export function findLogicalStep(values: Grid, precomputed?: number[]): Step | null {
  if (values.some((v) => v !== 0) && values.every((v) => v !== 0)) return null
  const cand = precomputed ?? computeCandidates(values)
  return (
    findNakedSingle(values, cand) ??
    findHiddenSingle(values, cand) ??
    findLockedCandidates(values, cand) ??
    findNakedPair(values, cand) ??
    findHiddenPair(values, cand) ??
    findXWing(values, cand)
  )
}

/* ------------------------------------------------------------------ *
 * rating (human difficulty)
 * ------------------------------------------------------------------ */

export interface PuzzleRating {
  /** 1 = singles, 2 = locked/pairs, 3 = x-wing, 4 = ต้องเดา, 5 = กระดานขัดแย้ง */
  level: number
  techniques: Technique[]
  solvedLogically: boolean
  steps: number
}

export function ratePuzzle(givens: Grid): PuzzleRating {
  const values = givens.slice()
  let cand = computeCandidates(values)
  const used = new Set<Technique>()
  let level = 0
  let steps = 0
  let solvedLogically = true

  for (;;) {
    if (values.every((v) => v !== 0)) break
    if (steps > 800) {
      solvedLogically = false
      level = Math.max(level, 4)
      break
    }
    if (values.some((v, i) => v === 0 && cand[i] === 0)) {
      solvedLogically = false
      level = Math.max(level, 5)
      break
    }
    const step = findLogicalStep(values, cand)
    if (!step) {
      solvedLogically = false
      level = Math.max(level, 4)
      break
    }
    used.add(step.technique)
    level = Math.max(level, step.level)
    steps++

    if (step.type === 'place' && step.cell !== undefined && step.digit) {
      values[step.cell] = step.digit
      cand = computeCandidates(values)
    } else if (step.eliminations) {
      for (const { cell, digit } of step.eliminations) cand[cell] &= ~(1 << digit)
    } else {
      break
    }
  }

  return { level, techniques: [...used], solvedLogically, steps }
}

/* ------------------------------------------------------------------ *
 * verification
 * ------------------------------------------------------------------ */

export interface PuzzleVerification {
  unique: boolean
  solutionValid: boolean
  givensConsistent: boolean
  solvableToSolution: boolean
  ok: boolean
}

export function verifyPuzzle(givens: Grid, solution: Grid): PuzzleVerification {
  const solutionValid = isValidSolution(solution)
  const givensConsistent =
    givens.length === 81 &&
    solution.length === 81 &&
    givens.every((v, i) => v === 0 || v === solution[i])
  const unique = countSolutions(givens, 2) === 1
  const solved = solveFirst(givens)
  const solvableToSolution = !!solved && solved.every((v, i) => v === solution[i])
  return {
    unique,
    solutionValid,
    givensConsistent,
    solvableToSolution,
    ok: unique && solutionValid && givensConsistent && solvableToSolution,
  }
}

export interface Puzzle {
  id: string
  difficulty: Difficulty
  givens: Grid
  solution: Grid
  clues: number
  rating: PuzzleRating
  verified: PuzzleVerification
}

/* ------------------------------------------------------------------ *
 * random
 * ------------------------------------------------------------------ */

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffleInPlace<T>(arr: T[], rnd: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    const tmp = arr[i]
    arr[i] = arr[j]
    arr[j] = tmp
  }
  return arr
}

/* ------------------------------------------------------------------ *
 * generation
 * ------------------------------------------------------------------ */

/** สร้างเฉลยเต็ม 9x9 แบบสุ่ม (รับประกัน valid) */
export function generateSolution(rnd: () => number = Math.random): Grid {
  const values: Grid = new Array(81).fill(0)
  const rows = new Int32Array(9)
  const cols = new Int32Array(9)
  const boxes = new Int32Array(9)

  const fill = (): boolean => {
    let best = -1
    let bestMask = 0
    let bestCount = 10
    for (let i = 0; i < 81; i++) {
      if (values[i]) continue
      const mask = ALL_DIGITS & ~(rows[cellRow(i)] | cols[cellCol(i)] | boxes[cellBox(i)])
      if (mask === 0) return false
      const n = POPCOUNT[mask]
      if (n < bestCount) {
        bestCount = n
        best = i
        bestMask = mask
        if (n === 1) break
      }
    }
    if (best === -1) return true

    const r = cellRow(best)
    const c = cellCol(best)
    const b = cellBox(best)
    const order = shuffleInPlace(digitsOf(bestMask), rnd)
    for (const v of order) {
      const bit = 1 << v
      values[best] = v
      rows[r] |= bit
      cols[c] |= bit
      boxes[b] |= bit
      if (fill()) return true
      values[best] = 0
      rows[r] &= ~bit
      cols[c] &= ~bit
      boxes[b] &= ~bit
    }
    return false
  }

  if (!fill()) throw new Error('generateSolution failed')
  return values
}

export function emptyGrid(): Grid {
  return new Array(81).fill(0)
}

/**
 * สร้าง puzzle ตามระดับความยาก + ตรวจสอบทุกครั้ง
 * - ขุดแบบสมมาตร 180°
 * - ทุกครั้งที่ขุดจะเช็คว่าคำตอบยัง unique
 * - ระดับง่าย/กลาง บังคับว่าแก้ได้ด้วยเทคนิคที่ไม่เกินระดับที่กำหนด
 */
export function generatePuzzle(difficulty: Difficulty, rnd: () => number = Math.random): Puzzle {
  const meta = DIFFICULTY_META[difficulty]
  const [minClues, maxClues] = meta.clues

  let fallback: Puzzle | null = null

  for (let attempt = 0; attempt < 10; attempt++) {
    const solution = generateSolution(rnd)
    const givens = solution.slice()

    const pairs: Array<[number, number]> = []
    for (let i = 0; i < 40; i++) pairs.push([i, 80 - i])
    pairs.push([40, 40])
    shuffleInPlace(pairs, rnd)

    let clues = 81
    for (const [a, b] of pairs) {
      const size = a === b ? 1 : 2
      if (clues - size < minClues) continue

      const va = givens[a]
      const vb = givens[b]
      givens[a] = 0
      if (a !== b) givens[b] = 0

      if (countSolutions(givens, 2) !== 1) {
        givens[a] = va
        if (a !== b) givens[b] = vb
        continue
      }

      // โซนท้ายของช่วง clue → บังคับระดับเทคนิค
      if (clues - size <= maxClues + 2) {
        const rating = ratePuzzle(givens)
        if (rating.level > meta.maxLevel) {
          givens[a] = va
          if (a !== b) givens[b] = vb
          continue
        }
      }

      clues -= size
    }

    const solutionCheck = solveFirst(givens)
    if (!solutionCheck || solutionCheck.some((v, i) => v !== solution[i])) continue

    const puzzle: Puzzle = {
      id: `pz_${Math.floor(rnd() * 1e9).toString(36)}`,
      difficulty,
      givens,
      solution,
      clues,
      rating: ratePuzzle(givens),
      verified: verifyPuzzle(givens, solution),
    }

    if (!puzzle.verified.ok) continue

    if (puzzle.rating.level <= meta.maxLevel && clues <= maxClues) return puzzle
    if (!fallback || puzzle.clues < fallback.clues) fallback = puzzle
  }

  if (fallback && fallback.verified.ok) return fallback
  throw new Error('ไม่สามารถสร้าง Sudoku ที่ผ่านการตรวจสอบได้ ลองกดใหม่อีกครั้ง')
}

/* ------------------------------------------------------------------ *
 * board helpers (ใช้ใน UI)
 * ------------------------------------------------------------------ */

export function isSolved(values: Grid, solution: Grid): boolean {
  return values.every((v, i) => v === solution[i])
}

export function countFilled(values: Grid): number {
  return values.reduce((n, v) => (v ? n + 1 : n), 0)
}

export function formatTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(sec).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}
