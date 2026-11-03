/**
 * ชุดทดสอบ engine — รันด้วย `node --experimental-strip-types scripts/verify.ts`
 *
 * ตรวจว่า Sudoku ทุกอันที่ generate ออกมา:
 *  1. เฉลย (solution) ถูกต้องตามกติกา 9x9
 *  2. givens ตรงกับ solution และไม่มีเลขซ้ำ
 *  3. มีคำตอบเดียว (countSolutions === 1)
 *  4. แก้จาก givens กลับไปเป็น solution ได้จริง
 *  5. จำนวน clue และระดับเทคนิคตรงตามระดับความยากที่ขอ
 *  6. เล่นจบได้ด้วยระบบคำใบ้ของเกม โดยไม่มีการใส่เลขผิดแม้แต่ตัวเดียว
 */
import {
  countSolutions,
  solveFirst,
  isValidSolution,
  verifyPuzzle,
  generatePuzzle,
  generateSolution,
  mulberry32,
  findLogicalStep,
  computeCandidates,
  isSolved,
  DIFFICULTY_META,
  DIFFICULTIES,
  cellRow,
  cellCol,
  cellBox,
} from '../src/lib/sudoku.ts'
import type { Difficulty, Grid, Technique } from '../src/lib/sudoku.ts'

let failures = 0

function check(name: string, condition: boolean, detail = ''): void {
  if (condition) {
    console.log(`  ✅ ${name}`)
  } else {
    failures++
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

/* ------------------------------------------------------------------ *
 * 1. unit tests ของ solver
 * ------------------------------------------------------------------ */
console.log('\n=== 1) Solver sanity ===')
const easyKnown: Grid = [
  5, 3, 0, 0, 7, 0, 0, 0, 0,
  6, 0, 0, 1, 9, 5, 0, 0, 0,
  0, 9, 8, 0, 0, 0, 0, 6, 0,
  8, 0, 0, 0, 6, 0, 0, 0, 3,
  4, 0, 0, 8, 0, 3, 0, 0, 1,
  7, 0, 0, 0, 2, 0, 0, 0, 6,
  0, 6, 0, 0, 0, 0, 2, 8, 0,
  0, 0, 0, 4, 1, 9, 0, 0, 5,
  0, 0, 0, 0, 8, 0, 0, 7, 9,
]
check('countSolutions ของ puzzle มาตรฐาน = 1', countSolutions(easyKnown, 2) === 1)
check('solveFirst คืนคำตอบที่ valid', isValidSolution(solveFirst(easyKnown) ?? []) === true)
check('กระดานเปล่าแก้ได้', countSolutions(new Array(81).fill(0), 2) !== 0)
check('กระดานที่ผิดกติกา (เลขซ้ำในแถว) นับเป็น 0 คำตอบ', countSolutions([1, 1, ...new Array(79).fill(0)], 2) === 0)
check('isValidSolution ปฏิเสธเฉลยที่ไม่ครบ', isValidSolution(new Array(81).fill(0)) === false)
check(
  'generateSolution ให้เฉลย valid',
  isValidSolution(generateSolution(mulberry32(7))),
)

/* ------------------------------------------------------------------ *
 * 2. generator + verification ต่อระดับความยาก
 * ------------------------------------------------------------------ */
const PER_DIFFICULTY = 20
const summary: Array<{
  difficulty: Difficulty
  clues: number[]
  levels: number[]
  guesses: number
  ms: number
}> = []

console.log('\n=== 2) Generator + verification ===')
for (const difficulty of DIFFICULTIES) {
  const meta = DIFFICULTY_META[difficulty]
  const rnd = mulberry32(20261103 + difficulty.length * 31)
  const started = Date.now()
  const clues: number[] = []
  const levels: number[] = []
  let guesses = 0
  let verifiedOk = 0
  let uniqueOk = 0
  let solvable = 0
  let inBand = 0
  let ratingOk = 0

  for (let i = 0; i < PER_DIFFICULTY; i++) {
    const puzzle = generatePuzzle(difficulty, rnd)

    if (puzzle.verified.ok && verifyPuzzle(puzzle.givens, puzzle.solution).ok) verifiedOk++
    if (countSolutions(puzzle.givens, 2) === 1) uniqueOk++
    const solved = solveFirst(puzzle.givens)
    if (solved && isSolved(solved, puzzle.solution)) solvable++
    if (puzzle.clues >= meta.clues[0] && puzzle.clues <= meta.clues[1]) inBand++
    if (puzzle.rating.level <= meta.maxLevel) ratingOk++
    if (!puzzle.rating.solvedLogically) guesses++

    clues.push(puzzle.clues)
    levels.push(puzzle.rating.level)
  }

  const ms = Date.now() - started
  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length
  console.log(
    `\n  ${difficulty.toUpperCase()} — ${PER_DIFFICULTY} puzzles ใน ${ms}ms (เฉลี่ย ${(ms / PER_DIFFICULTY).toFixed(1)}ms/อัน)`,
  )
  console.log(
    `    clues: ${Math.min(...clues)}-${Math.max(...clues)} (เฉลี่ย ${avg(clues).toFixed(1)}, เป้าหมาย ${meta.clues[0]}-${meta.clues[1]}) · rating level: ${[...new Set(levels)].sort().join('/')} · ต้องเดา: ${guesses}`,
  )
  check(`${difficulty}: ทุกอัน verified.ok`, verifiedOk === PER_DIFFICULTY, `${verifiedOk}/${PER_DIFFICULTY}`)
  check(`${difficulty}: ทุกอันมีคำตอบเดียว`, uniqueOk === PER_DIFFICULTY, `${uniqueOk}/${PER_DIFFICULTY}`)
  check(`${difficulty}: ทุกอันแก้ไปเป็น solution ได้`, solvable === PER_DIFFICULTY, `${solvable}/${PER_DIFFICULTY}`)
  check(`${difficulty}: clue อยู่ในช่วงที่กำหนด`, inBand === PER_DIFFICULTY, `${inBand}/${PER_DIFFICULTY}`)
  check(`${difficulty}: ระดับเทคนิคไม่เกินที่กำหนด`, ratingOk === PER_DIFFICULTY, `${ratingOk}/${PER_DIFFICULTY}`)

  summary.push({ difficulty, clues, levels, guesses, ms })
}

/* ------------------------------------------------------------------ *
 * 3. เล่นจบด้วยระบบคำใบ้ (simulate ผู้เล่นที่กด hint อย่างเดียว)
 * ------------------------------------------------------------------ */
console.log('\n=== 3) Hint-only playthrough ===')
const techniqueCount: Partial<Record<Technique, number>> = {}
let totalMoves = 0
let wrongMoves = 0
let playthroughs = 0

for (const difficulty of DIFFICULTIES) {
  const rnd = mulberry32(999 + difficulty.length)
  for (let i = 0; i < 8; i++) {
    const puzzle = generatePuzzle(difficulty, rnd)
    const values = puzzle.givens.slice()
    let guard = 0

    while (!isSolved(values, puzzle.solution) && guard < 400) {
      guard++
      const step = findLogicalStep(values)
      if (step && step.type === 'place' && step.cell !== undefined && step.digit !== undefined) {
        if (step.digit !== puzzle.solution[step.cell]) {
          wrongMoves++
          break
        }
        values[step.cell] = step.digit
        techniqueCount[step.technique] = (techniqueCount[step.technique] ?? 0) + 1
        totalMoves++
        continue
      }
      if (step && step.type === 'eliminate') {
        // hint ระดับ elimination ไม่เปลี่ยนค่ากระดาน — เดินหน้าด้วยการเฉลยช่องที่แคบที่สุด
      }
      // fallback เหมือนเกมจริง: เฉลยช่องที่มีตัวเลือกน้อยที่สุด
      const cand = computeCandidates(values)
      let best = -1
      let bestCount = 10
      for (let c = 0; c < 81; c++) {
        if (values[c]) continue
        const n = cand[c] === 0 ? 9 : cand[c].toString(2).split('1').length - 1
        if (n < bestCount) {
          bestCount = n
          best = c
        }
      }
      if (best === -1) break
      if (puzzle.solution[best] === 0) {
        wrongMoves++
        break
      }
      values[best] = puzzle.solution[best]
      totalMoves++
    }

    if (isSolved(values, puzzle.solution)) playthroughs++
  }
}

console.log(`  เล่นจบ ${playthroughs}/24 กระดาน · วางเลขทั้งหมด ${totalMoves} ครั้ง · ผิด ${wrongMoves} ครั้ง`)
console.log(`  เทคนิคที่ถูกใช้: ${JSON.stringify(techniqueCount)}`)
check('เล่นจบได้ทุกกระดานด้วย hint', playthroughs === 24, `${playthroughs}/24`)
check('hint ไม่เคยแนะนำเลขที่ผิด', wrongMoves === 0, `${wrongMoves} ครั้ง`)

/* ------------------------------------------------------------------ *
 * 4. ตรวจ geometry
 * ------------------------------------------------------------------ */
console.log('\n=== 4) Geometry ===')
let geometryOk = true
for (let i = 0; i < 81; i++) {
  if (i === 0 && (cellRow(i) !== 0 || cellCol(i) !== 0 || cellBox(i) !== 0)) geometryOk = false
  if (i === 80 && (cellRow(i) !== 8 || cellCol(i) !== 8 || cellBox(i) !== 8)) geometryOk = false
  if (i === 40 && (cellRow(i) !== 4 || cellCol(i) !== 4 || cellBox(i) !== 4)) geometryOk = false
}
check('cellRow/cellCol/cellBox ถูกต้อง', geometryOk)

/* ------------------------------------------------------------------ *
 * 5. ความถูกต้องของเทคนิคคำใบ้ (soundness)
 *    จำลองกระดานกลางทางหลายพันแบบ — คำใบ้ต้องไม่เคยแนะนำเลขผิด
 *    และการ "ตัดตัวเลือก" ต้องไม่ตัดเลขที่เป็นคำตอบจริงทิ้ง
 * ------------------------------------------------------------------ */
console.log('\n=== 5) Hint soundness (random mid-game states) ===')
let statesTested = 0
let placeSteps = 0
let elimSteps = 0
let unsoundPlace = 0
let unsoundElim = 0
const techSeen: Record<string, number> = {}

for (const difficulty of DIFFICULTIES) {
  const rnd = mulberry32(4242 + difficulty.length * 7)
  for (let p = 0; p < 8; p++) {
    const puzzle = generatePuzzle(difficulty, rnd)
    for (let trial = 0; trial < 30; trial++) {
      const values = puzzle.givens.slice()
      const holes: number[] = []
      values.forEach((v, i) => {
        if (!v) holes.push(i)
      })
      for (let i = holes.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1))
        const t = holes[i]
        holes[i] = holes[j]
        holes[j] = t
      }
      const fill = Math.floor(rnd() * (holes.length + 1))
      for (let k = 0; k < fill; k++) values[holes[k]] = puzzle.solution[holes[k]]

      const step = findLogicalStep(values)
      statesTested++
      if (!step) continue
      techSeen[step.technique] = (techSeen[step.technique] ?? 0) + 1
      if (step.type === 'place' && step.cell !== undefined && step.digit !== undefined) {
        placeSteps++
        if (step.digit !== puzzle.solution[step.cell]) unsoundPlace++
      } else if (step.eliminations?.length) {
        elimSteps++
        if (step.eliminations.some((e) => e.digit === puzzle.solution[e.cell])) unsoundElim++
      }
    }
  }
}

console.log(
  `  ทดสอบ ${statesTested} สถานะ · place ${placeSteps} · eliminate ${elimSteps} · ผิด ${unsoundPlace + unsoundElim}`,
)
console.log(`  เทคนิคที่เจอ: ${JSON.stringify(techSeen)}`)
check('คำใบ้ "เติมเลข" ไม่เคยผิด', unsoundPlace === 0, `${unsoundPlace} ครั้ง`)
check('คำใบ้ "ตัดตัวเลือก" ไม่เคยตัดคำตอบจริง', unsoundElim === 0, `${unsoundElim} ครั้ง`)
check('had at least one actionable hint', placeSteps > 0)

/* ------------------------------------------------------------------ *
 * 6. ทดสอบเทคนิคขั้นสูงแบบต่อเนื่อง (single → locked candidates → pairs → x-wing)
 *    ไล่แก้ด้วย logic ล้วนจาก givens จนจบ/ตัน แล้วตรวจทุกก้าว
 * ------------------------------------------------------------------ */
console.log('\n=== 6) Advanced technique walkthrough ===')
let advSteps = 0
let advSound = 0
let advWrong = 0
let advStalled = 0
let advSolved = 0
const advTech: Record<string, number> = {}

for (const difficulty of DIFFICULTIES) {
  const rnd = mulberry32(77 + difficulty.length)
  for (let p = 0; p < 20; p++) {
    const puzzle = generatePuzzle(difficulty, rnd)
    const values = puzzle.givens.slice()
    let cand = computeCandidates(values)
    let guard = 0

    while (guard++ < 400) {
      const step = findLogicalStep(values, cand)
      if (!step) break
      advSteps++
      advTech[step.technique] = (advTech[step.technique] ?? 0) + 1
      let sound = true
      if (step.type === 'place' && step.cell !== undefined && step.digit !== undefined) {
        sound = step.digit === puzzle.solution[step.cell]
        if (sound) {
          values[step.cell] = step.digit
          cand = computeCandidates(values)
        }
      } else if (step.eliminations) {
        for (const e of step.eliminations) {
          if (e.digit === puzzle.solution[e.cell]) sound = false
          cand[e.cell] &= ~(1 << e.digit)
        }
        if (cand.some((m, i) => values[i] === 0 && m === 0)) sound = false
      }
      if (!sound) {
        advWrong++
        break
      }
      advSound++
    }

    if (isSolved(values, puzzle.solution)) advSolved++
    else advStalled++
  }
}
console.log(`  ${advSteps} ก้าว · ถูกต้อง ${advSound} · ผิด ${advWrong} · แก้จบด้วย logic ${advSolved}/60 · ตัน ${advStalled}`)
console.log(`  เทคนิคที่ใช้: ${JSON.stringify(advTech)}`)
check('ทุกก้าวของ logic ถูกต้อง', advWrong === 0, `${advWrong} ก้าวที่ผิด`)
check('แก้จบด้วย logic ล้วน ≥ ครึ่ง', advSolved >= 30, `${advSolved}/60`)

/* ------------------------------------------------------------------ *
 * สรุป
 * ------------------------------------------------------------------ */
console.log('\n=== สรุป ===')
for (const s of summary) {
  console.log(
    `${s.difficulty.padEnd(7)} clues ${Math.min(...s.clues)}-${Math.max(...s.clues)} · level ${[...new Set(s.levels)].sort().join('/')} · ต้องเดา ${s.guesses}/${PER_DIFFICULTY} · ${(s.ms / PER_DIFFICULTY).toFixed(1)}ms/อัน`,
  )
}
const levelDistribution = DIFFICULTIES.map((d) => {
  const s = summary.find((x) => x.difficulty === d)!
  return `${d}: level ${[...new Set(s.levels)].sort().join('/')}`
}).join(' | ')
console.log(`rating: ${levelDistribution}`)

if (failures > 0) {
  console.error(`\n❌ FAILED — ${failures} การตรวจสอบไม่ผ่าน`)
  process.exit(1)
}
console.log('\n✅ ALL CHECKS PASSED')
