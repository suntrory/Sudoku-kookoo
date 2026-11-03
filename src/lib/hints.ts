/**
 * ระบบช่วยเหลือผู้เล่น (hint engine)
 * - ตรวจช่องที่ใส่ผิดก่อน
 * - ถ้ากระดานยังถูก ให้ใช้เทคนิค logic จริง (Naked/Hidden Single, Locked Candidates,
 *   Naked/Hidden Pair, X-Wing) แล้วอธิบายเป็นภาษาไทย
 * - ถ้า logic ตันทุกทาง ค่อยเฉลยช่องที่แคบที่สุด (Guess)
 *
 * ความปลอดภัย: hint ทุกอันถูก "sanitize" เทียบกับเฉลยก่อนส่งให้ UI
 * ถ้า logic คำนวณพลาด จะไม่มีการแนะนำเลขผิดออกไปเด็ดขาด
 */
import {
  UNIT_NAMES,
  cellCol,
  cellRow,
  computeCandidates,
  findLogicalStep,
  popcount,
} from './sudoku'
import type { Grid, Step, Technique } from './sudoku'

export const TECHNIQUE_TH: Record<Technique, string> = {
  'naked-single': 'Naked Single',
  'hidden-single': 'Hidden Single',
  'locked-candidates': 'Locked Candidates',
  'naked-pair': 'Naked Pair',
  'hidden-pair': 'Hidden Pair',
  'x-wing': 'X-Wing',
}

export const TECHNIQUE_HINT_TH: Record<Technique, string> = {
  'naked-single': 'ช่องนี้เหลือตัวเลือกเดียว',
  'hidden-single': 'เลขนี้เหลือที่เดียวในยูนิต',
  'locked-candidates': 'ตัดตัวเลือกด้วยตำแหน่งที่ถูกล็อก',
  'naked-pair': 'สองช่องนี้จับคู่กัน',
  'hidden-pair': 'สองเลขนี้อยู่ได้แค่สองช่อง',
  'x-wing': 'รูปแบบ X-Wing',
}

export type HintKind = 'mistake' | 'place' | 'eliminate' | 'reveal'

export interface Hint {
  kind: HintKind
  /** ช่องที่ควรไฮไลต์ */
  cells: number[]
  digit?: number
  technique?: Technique
  title: string
  body: string
  /** สำหรับ kind = eliminate : รายการโน้ตที่ควรตัด */
  eliminable?: Array<{ cell: number; digit: number }>
}

export function cellName(cell: number): string {
  return `R${cellRow(cell) + 1}C${cellCol(cell) + 1}`
}

function cellList(cells: number[], limit = 4): string {
  const names = cells.slice(0, limit).map(cellName)
  return cells.length > limit ? `${names.join(', ')} และอีก ${cells.length - limit} ช่อง` : names.join(', ')
}

function digitList(digits: number[]): string {
  return digits.join(', ')
}

function describeStep(step: Step): Hint {
  const unitName = step.unit !== undefined ? UNIT_NAMES[step.unit] : 'ยูนิต'

  if (step.type === 'place' && step.cell !== undefined && step.digit !== undefined) {
    const base = {
      kind: 'place' as const,
      cells: step.cells,
      digit: step.digit,
      technique: step.technique,
    }
    if (step.technique === 'naked-single') {
      return {
        ...base,
        title: `Naked Single · ${cellName(step.cell)}`,
        body: `ช่อง ${cellName(step.cell)} เหลือตัวเลือกเดียวคือ ${step.digit} เพราะเลขอื่นถูกตัดออกหมดจากแถว คอลัมน์ และบล็อกแล้ว`,
      }
    }
    return {
      ...base,
      title: `Hidden Single · ${cellName(step.cell)}`,
      body: `ใน${unitName} มีช่องเดียวที่ใส่เลข ${step.digit} ได้ คือ ${cellName(step.cell)}`,
    }
  }

  const elims = step.eliminations ?? []
  const digits = [...new Set(elims.map((e) => e.digit))]
  const targets = [...new Set(elims.map((e) => e.cell))]
  const base = {
    kind: 'eliminate' as const,
    cells: [...new Set([...step.cells, ...targets])].slice(0, 12),
    digit: step.digit,
    technique: step.technique,
    eliminable: elims,
  }

  switch (step.technique) {
    case 'locked-candidates':
      return {
        ...base,
        title: `Locked Candidates (${digits.length ? digitList(digits) : '—'})`,
        body: `ใน${unitName} เลข ${digitList(digits)} รวมตัวอยู่แค่ ${cellList(step.cells, 3)} จึงตัดเลข ${digitList(digits)} ออกจากช่อง ${cellList(targets)} ได้`,
      }
    case 'naked-pair':
      return {
        ...base,
        title: `Naked Pair · {${digitList(digits)}}`,
        body: `ช่อง ${cellList(step.cells, 2)} มีตัวเลือกแค่ {${digitList(digits)}} เหมือนกัน สองช่องนี้จึงต้องเป็นสองเลขนี้ → ตัดออกจากช่องอื่นใน${unitName}`,
      }
    case 'hidden-pair':
      return {
        ...base,
        title: `Hidden Pair · {${digitList(digits)}}`,
        body: `ใน${unitName} เลข ${digitList(digits)} อยู่ได้แค่ ${cellList(step.cells, 2)} → สองช่องนี้เหลือแค่สองเลขนี้ ตัดตัวเลือกอื่นทิ้ง`,
      }
    case 'x-wing':
      return {
        ...base,
        title: `X-Wing · เลข ${digitList(digits)}`,
        body: `เลข ${digitList(digits)} วางเป็นมุมสี่เหลี่ยมที่ ${cellList(step.cells, 4)} → ตัดเลข ${digitList(digits)} ออกจากช่อง ${cellList(targets)}`,
      }
    default:
      return {
        ...base,
        title: TECHNIQUE_TH[step.technique],
        body: `ตัดเลข ${digitList(digits)} ออกจาก ${cellList(targets)}`,
      }
  }
}

/** เทียบกับเฉลย — กัน logic bug หลุดไปหลอกผู้เล่น */
function sanitize(step: Step, solution: Grid): Step | null {
  if (step.type === 'place') {
    if (step.cell === undefined || step.digit === undefined) return null
    if (solution[step.cell] !== step.digit) return null
    return step
  }
  if (!step.eliminations?.length) return null
  const safe = step.eliminations.filter((e) => solution[e.cell] !== e.digit)
  if (safe.length !== step.eliminations.length) return null
  if (!safe.length) return null
  return { ...step, eliminations: safe }
}

/** หา hint ที่เหมาะสมกับกระดานปัจจุบัน (null = กระดานเต็มแล้ว) */
export function findHint(values: Grid, solution: Grid): Hint | null {
  // 1) มีเลขที่ผิดอยู่ → บอกให้แก้ก่อน (ไม่นับเป็น hint)
  const wrong: number[] = []
  for (let i = 0; i < 81; i++) if (values[i] && values[i] !== solution[i]) wrong.push(i)
  if (wrong.length) {
    return {
      kind: 'mistake',
      cells: wrong.slice(0, 16),
      title: `มีเลขผิด ${wrong.length} ช่อง`,
      body: `ช่อง ${cellList(wrong)} ยังไม่ตรงกับเฉลย — กด "ตรวจ" เพื่อไฮไลต์ หรือลบเลขนั้นออกแล้วลองใหม่`,
    }
  }

  // 2) เทคนิค logic
  const step = findLogicalStep(values)
  if (step) {
    const checked = sanitize(step, solution)
    if (checked) return describeStep(checked)
  }

  // 3) ทางตัน → เฉลยช่องที่ตัวเลือกน้อยที่สุด
  const cand = computeCandidates(values)
  let best = -1
  let bestCount = 11
  for (let i = 0; i < 81; i++) {
    if (values[i]) continue
    const n = popcount(cand[i]) || 9
    if (n < bestCount) {
      bestCount = n
      best = i
    }
  }
  if (best === -1) return null

  return {
    kind: 'reveal',
    cells: [best],
    digit: solution[best],
    title: `ทางตัน · เฉลยช่อง ${cellName(best)}`,
    body: `เทคนิคพื้นฐานที่ระบบมีใช้ต่อไม่ได้แล้ว ช่อง ${cellName(best)} เป็นช่องที่เหลือตัวเลือกน้อยที่สุด (${bestCount} ตัว) — คำตอบคือ ${solution[best]} ถ้าอยากลองเองให้เดาช่องนี้`,
  }
}

/** ข้อความสั้น ๆ สำหรับปุ่มถูกใช้ */
export const HINT_KIND_LABEL: Record<HintKind, string> = {
  mistake: 'ตรวจพบข้อผิดพลาด',
  place: 'เติมเลขให้',
  eliminate: 'ตัดตัวเลือกให้',
  reveal: 'เฉลยให้',
}
