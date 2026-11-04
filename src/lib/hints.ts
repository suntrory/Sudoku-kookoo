/**
 * ระบบช่วยเหลือผู้เล่น (hint engine) — 2 ภาษา (EN/TH)
 * - ตรวจช่องที่ใส่ผิดก่อน
 * - ถ้ากระดานยังถูก ให้ใช้เทคนิค logic จริง (Naked/Hidden Single, Locked Candidates,
 *   Naked/Hidden Pair, X-Wing) แล้วอธิบายตามภาษาที่ผู้ใช้เลือก
 * - ถ้า logic ตันทุกทาง ค่อยเฉลยช่องที่แคบที่สุด (Guess)
 *
 * ความปลอดภัย: hint ทุกอันถูก "sanitize" เทียบกับเฉลยก่อนส่งให้ UI
 * ถ้า logic คำนวณพลาด จะไม่มีการแนะนำเลขผิดออกไปเด็ดขาด
 */
import { cellCol, cellRow, computeCandidates, findLogicalStep, popcount } from './sudoku'
import type { Grid, Step, Technique } from './sudoku'
import { cellListText, t, unitName } from './i18n'
import type { Lang } from './i18n'

export const TECHNIQUE_LABEL: Record<Technique, string> = {
  'naked-single': 'Naked Single',
  'hidden-single': 'Hidden Single',
  'locked-candidates': 'Locked Candidates',
  'naked-pair': 'Naked Pair',
  'hidden-pair': 'Hidden Pair',
  'x-wing': 'X-Wing',
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

const digitsText = (digits: number[]): string => digits.join(', ')

function describeStep(step: Step, lang: Lang): Hint {
  const unit = step.unit !== undefined ? unitName(lang, step.unit) : t(lang, 'unit.unit')

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
        title: `${TECHNIQUE_LABEL[step.technique]} · ${cellName(step.cell)}`,
        body: t(lang, 'hint.nakedSingle.body', {
          cell: cellName(step.cell),
          digit: step.digit,
        }),
      }
    }
    return {
      ...base,
      title: `${TECHNIQUE_LABEL[step.technique]} · ${cellName(step.cell)}`,
      body: t(lang, 'hint.hiddenSingle.body', {
        unit,
        digit: step.digit,
        cell: cellName(step.cell),
      }),
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
        title: t(lang, 'hint.locked.title', { digits: digitsText(digits) }),
        body: t(lang, 'hint.locked.body', {
          unit,
          digits: digitsText(digits),
          cells: cellListText(lang, step.cells, 3),
          targets: cellListText(lang, targets),
        }),
      }
    case 'naked-pair':
      return {
        ...base,
        title: t(lang, 'hint.nakedPair.title', { digits: digitsText(digits) }),
        body: t(lang, 'hint.nakedPair.body', {
          cells: cellListText(lang, step.cells, 2),
          digits: digitsText(digits),
          unit,
        }),
      }
    case 'hidden-pair':
      return {
        ...base,
        title: t(lang, 'hint.hiddenPair.title', { digits: digitsText(digits) }),
        body: t(lang, 'hint.hiddenPair.body', {
          unit,
          digits: digitsText(digits),
          cells: cellListText(lang, step.cells, 2),
        }),
      }
    case 'x-wing':
      return {
        ...base,
        title: t(lang, 'hint.xwing.title', { digits: digitsText(digits) }),
        body: t(lang, 'hint.xwing.body', {
          digits: digitsText(digits),
          cells: cellListText(lang, step.cells, 4),
          targets: cellListText(lang, targets),
        }),
      }
    default:
      return {
        ...base,
        title: t(lang, 'hint.generic.title'),
        body: t(lang, 'hint.generic.body', {
          digits: digitsText(digits),
          targets: cellListText(lang, targets),
        }),
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
export function findHint(values: Grid, solution: Grid, lang: Lang = 'en'): Hint | null {
  // 1) มีเลขที่ผิดอยู่ → บอกให้แก้ก่อน (ไม่นับเป็น hint)
  const wrong: number[] = []
  for (let i = 0; i < 81; i++) if (values[i] && values[i] !== solution[i]) wrong.push(i)
  if (wrong.length) {
    return {
      kind: 'mistake',
      cells: wrong.slice(0, 16),
      title: t(lang, 'hint.mistake.title', { n: wrong.length }),
      body: t(lang, 'hint.mistake.body', { cells: cellListText(lang, wrong) }),
    }
  }

  // 2) เทคนิค logic
  const step = findLogicalStep(values)
  if (step) {
    const checked = sanitize(step, solution)
    if (checked) return describeStep(checked, lang)
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
    title: t(lang, 'hint.reveal.title', { cell: cellName(best) }),
    body: t(lang, 'hint.reveal.body', {
      cell: cellName(best),
      count: bestCount,
      digit: solution[best],
    }),
  }
}
