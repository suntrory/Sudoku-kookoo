/**
 * i18n — English / Thai
 * ภาษาอังกฤษเป็นค่าเริ่มต้น (DEFAULT_LANG = 'en')
 * เก็บภาษาที่ผู้ใช้เลือกไว้ใน settings (localStorage: sudoku.v1.settings)
 */

export type Lang = 'en' | 'th'
export const LANGS: readonly Lang[] = ['en', 'th'] as const
export const DEFAULT_LANG: Lang = 'en'

export function isLang(value: unknown): value is Lang {
  return value === 'en' || value === 'th'
}

type Vars = Record<string, string | number>

const en: Record<string, string> = {
  /* header / app shell */
  'app.subtitle': 'No repeats in any row, column or box',
  'app.hintsWrong': '💡 Hints {hints} · ✗ Wrong {mistakes}',
  'app.cells': '{filled}/81 cells',
  'app.notesBanner': 'Notes mode — tap a number to add or remove a pencil mark',
  'app.keyboard':
    'Keyboard: arrows move · 1–9 fill · Backspace erase · N notes · H hint · U undo · P pause',
  'app.footerStorage': "React + Vite · everything is stored in this browser's localStorage",
  'app.footerVerified': 'Every puzzle is verified: unique solution and always solvable',
  'app.confirmSwitch': 'Start a new {difficulty} game? Your current game will be lost.',
  'action.startOver': 'Start over',
  'action.keepPlaying': 'Keep playing',

  /* top bar */
  'topbar.pause': 'Pause',
  'topbar.resume': 'Resume',
  'topbar.newGame': '+ New game',
  'topbar.themeToLight': 'Switch to light theme',
  'topbar.themeToDark': 'Switch to dark theme',
  'topbar.langToThai': 'เปลี่ยนเป็นภาษาไทย',
  'topbar.langToEnglish': 'Switch to English',
  'topbar.difficultyLabel': 'Difficulty',

  /* board */
  'board.label': 'Sudoku board, 9 by 9',
  'board.cell': 'Row {row}, column {col}',
  'board.value': ', {value}',
  'board.empty': ', empty',
  'board.paused': 'Timer paused',
  'pad.digit': 'Digit {digit}, {left} left',

  /* tools */
  'tools.group': 'Helper tools',
  'tools.notes': 'Notes',
  'tools.erase': 'Erase',
  'tools.undo': 'Undo',
  'tools.hint': 'Hint',
  'tools.check': 'Check',
  'tools.notesTitle': 'Notes mode (N)',
  'tools.eraseTitle': 'Erase (Backspace)',
  'tools.undoTitle': 'Undo (U)',
  'tools.hintTitle': 'Get a hint (H)',
  'tools.checkTitle': 'Check the board',

  /* hint card */
  'hint.eliminated': 'Candidates removed from your notes',
  'hint.notCounted': 'Not counted as a hint',
  'hint.used': '{n} hints used',
  'hint.usedOne': '1 hint used',
  'hint.fill': 'Fill in {digit}',
  'hint.try': "I'll try first",
  'hint.gotIt': 'Got it',
  'hint.close': 'Close hint',

  /* side panel */
  'side.puzzle': 'This puzzle',
  'side.difficulty': 'Difficulty',
  'side.givens': 'Givens',
  'side.givensValue': '{n} cells',
  'side.technique': 'Technique needed',
  'side.verified': 'Verified',
  'side.unique': '✓ Unique solution',
  'side.stats': 'Stats on this device',
  'side.statsNote': 'Best time · solved/started',
  'side.help': 'Help',
  'side.reveal': 'Reveal selected cell',
  'side.restart': 'Restart this board',
  'side.revealNote': 'Revealing counts as a hint',
  'side.settings': 'Settings',
  'side.storage': 'Stored in localStorage',
  'side.storageNote': '{n} items · {kb} KB — saved in this browser only, no server',
  'side.clearStats': 'Clear stats',
  'side.confirmClear': 'Confirm clear',
  'side.cancel': 'Cancel',

  /* settings */
  'settings.showMistakes': 'Highlight wrong digits',
  'settings.showMistakesDesc': 'Mark a cell red as soon as the digit is wrong',
  'settings.highlightPeers': 'Highlight 3×3 box',
  'settings.highlightPeersDesc': 'Emphasise cells in the same box',
  'settings.highlightLines': 'Highlight row & column',
  'settings.highlightLinesDesc': 'Emphasise the whole row and column of the selected cell',
  'settings.highlightSame': 'Highlight same digits',
  'settings.highlightSameDesc': 'Emphasise cells holding the same digit',
  'settings.autoCleanNotes': 'Auto-clear notes',
  'settings.autoCleanNotesDesc': 'Remove that digit from neighbouring notes when you place it',
  'settings.language': 'Language',
  'settings.languageDesc': 'English is the default',

  /* difficulty */
  'diff.easy': 'Easy',
  'diff.medium': 'Medium',
  'diff.hard': 'Hard',
  'blurb.easy': 'Lots of givens — solvable with singles alone',
  'blurb.medium': 'Fewer givens, more scanning',
  'blurb.hard': 'Sparse board — deep chains or trial and error',

  /* rating */
  'rating.0': 'No technique needed',
  'rating.1': 'Singles',
  'rating.2': 'Locked candidates / pairs',
  'rating.3': 'X-Wing',
  'rating.4': 'Trial & error',
  'rating.5': 'Contradiction',

  /* win dialog */
  'win.title': 'Solved!',
  'win.sub': '{difficulty} difficulty',
  'win.time': 'Time',
  'win.hints': 'Hints',
  'win.mistakes': 'Mistakes',
  'win.again': 'Play another',
  'win.viewBoard': 'View solved board',
  'win.stars': '{n} of 3 stars',

  /* toasts */
  'toast.solved': 'Solved it! 🎉',
  'toast.restarted': 'Board restarted',
  'toast.foundWrong': 'Found {n} cells that are still wrong',
  'toast.allCorrect': 'All filled cells are correct 👍',
  'toast.statsCleared': 'Stats cleared',

  /* units */
  'unit.row': 'row {n}',
  'unit.col': 'column {n}',
  'unit.box': 'box {n}',
  'unit.unit': 'unit',
  'hint.more': '{list} and {n} more',

  /* hints */
  'hint.mistake.title': 'Wrong digits in {n} cells',
  'hint.mistake.body':
    "Cells {cells} don't match the solution — press Check to highlight them, or erase and try again.",
  'hint.nakedSingle.body':
    'Cell {cell} has a single candidate left: {digit}. Its row, column and box rule out every other digit.',
  'hint.hiddenSingle.body': 'In {unit} the digit {digit} fits only in {cell}.',
  'hint.locked.title': 'Locked Candidates ({digits})',
  'hint.locked.body':
    'In {unit}, {digits} is confined to {cells}, so it can be removed from {targets}.',
  'hint.nakedPair.title': 'Naked Pair · {digits}',
  'hint.nakedPair.body':
    '{cells} share exactly the candidates {digits}, so they must hold these two digits — remove them from the rest of {unit}.',
  'hint.hiddenPair.title': 'Hidden Pair · {digits}',
  'hint.hiddenPair.body':
    'In {unit}, digits {digits} can only go in {cells} — those two cells keep just these digits.',
  'hint.xwing.title': 'X-Wing · digit {digits}',
  'hint.xwing.body':
    'Digit {digits} forms a rectangle at {cells}, so it can be removed from {targets}.',
  'hint.generic.title': 'Elimination',
  'hint.generic.body': 'Remove {digits} from {targets}.',
  'hint.reveal.title': 'Stuck · reveal {cell}',
  'hint.reveal.body':
    'None of the built-in techniques apply. {cell} has the fewest candidates ({count}) — the answer is {digit}. Try guessing there first.',
}

const th: Record<string, string> = {
  'app.subtitle': 'เลข 1–9 ไม่ซ้ำในแถว คอลัมน์ และบล็อก',
  'app.hintsWrong': '💡 คำใบ้ {hints} · ✗ ผิด {mistakes}',
  'app.cells': '{filled}/81 ช่อง',
  'app.notesBanner': 'โหมดจดโน้ต — กดเลขเพื่อจด/ลบโน้ตในช่องที่เลือก',
  'app.keyboard':
    'คีย์บอร์ด: ลูกศรเลื่อนช่อง · 1–9 ใส่เลข · Backspace ลบ · N โน้ต · H คำใบ้ · U ย้อนกลับ · P หยุด',
  'app.footerStorage': 'React + Vite · ข้อมูลทั้งหมดเก็บใน localStorage ของเครื่องนี้',
  'app.footerVerified': 'ทุกกระดานผ่านการตรวจสอบ: มีคำตอบเดียว และเล่นจบได้จริง',
  'app.confirmSwitch': 'เริ่มเกมใหม่ระดับ{difficulty}? เกมที่เล่นอยู่จะหายไป',
  'action.startOver': 'เริ่มใหม่',
  'action.keepPlaying': 'เล่นต่อ',

  'topbar.pause': 'หยุด',
  'topbar.resume': 'เล่นต่อ',
  'topbar.newGame': '+ เกมใหม่',
  'topbar.themeToLight': 'เปลี่ยนเป็นธีมสว่าง',
  'topbar.themeToDark': 'เปลี่ยนเป็นธีมมืด',
  'topbar.langToThai': 'เปลี่ยนเป็นภาษาไทย',
  'topbar.langToEnglish': 'Switch to English',
  'topbar.difficultyLabel': 'ระดับความยาก',

  'board.label': 'กระดานซูโดกุ 9 คูณ 9',
  'board.cell': 'แถว {row} คอลัมน์ {col}',
  'board.value': ' ค่า {value}',
  'board.empty': ' ว่าง',
  'board.paused': 'หยุดเวลาไว้แล้ว',
  'pad.digit': 'เลข {digit} เหลือ {left} ช่อง',

  'tools.group': 'เครื่องมือช่วยเล่น',
  'tools.notes': 'โน้ต',
  'tools.erase': 'ลบ',
  'tools.undo': 'ย้อนกลับ',
  'tools.hint': 'คำใบ้',
  'tools.check': 'ตรวจ',
  'tools.notesTitle': 'โหมดจดโน้ต (N)',
  'tools.eraseTitle': 'ลบเลข (Backspace)',
  'tools.undoTitle': 'ย้อนกลับ (U)',
  'tools.hintTitle': 'ขอคำใบ้ (H)',
  'tools.checkTitle': 'ตรวจกระดาน',

  'hint.eliminated': 'ตัดตัวเลือกในโน้ตให้แล้ว',
  'hint.notCounted': 'ยังไม่นับเป็นการใช้คำใบ้',
  'hint.used': 'ใช้คำใบ้ไปแล้ว {n} ครั้ง',
  'hint.usedOne': 'ใช้คำใบ้ไปแล้ว 1 ครั้ง',
  'hint.fill': 'เติมเลข {digit} ให้',
  'hint.try': 'ลองเองก่อน',
  'hint.gotIt': 'เข้าใจแล้ว',
  'hint.close': 'ปิดคำใบ้',

  'side.puzzle': 'กระดานนี้',
  'side.difficulty': 'ระดับ',
  'side.givens': 'เลขตั้งต้น',
  'side.givensValue': '{n} ช่อง',
  'side.technique': 'เทคนิคที่ต้องใช้',
  'side.verified': 'ตรวจสอบแล้ว',
  'side.unique': '✓ คำตอบเดียว',
  'side.stats': 'สถิติในเครื่องนี้',
  'side.statsNote': 'เวลาที่ดีที่สุด · จำนวนที่แก้สำเร็จ/เริ่มเล่น',
  'side.help': 'ช่วยเหลือ',
  'side.reveal': 'เฉลยช่องที่เลือก',
  'side.restart': 'เริ่มกระดานนี้ใหม่',
  'side.revealNote': 'การเฉลยจะถูกนับเป็นการใช้คำใบ้',
  'side.settings': 'การตั้งค่า',
  'side.storage': 'ข้อมูลใน localStorage',
  'side.storageNote': '{n} รายการ · {kb} KB — เก็บในเบราว์เซอร์นี้เท่านั้น ไม่มีเซิร์ฟเวอร์',
  'side.clearStats': 'ล้างสถิติ',
  'side.confirmClear': 'ยืนยันล้างสถิติ',
  'side.cancel': 'ยกเลิก',

  'settings.showMistakes': 'ไฮไลต์เลขที่ผิด',
  'settings.showMistakesDesc': 'ขึ้นสีแดงทันทีที่ใส่เลขผิด',
  'settings.highlightPeers': 'ไฮไลต์บล็อก 3×3',
  'settings.highlightPeersDesc': 'เน้นช่องในบล็อกเดียวกับช่องที่เลือก',
  'settings.highlightLines': 'ไฮไลต์แนวนอน/แนวตั้ง',
  'settings.highlightLinesDesc': 'กดช่องไหน จะเน้นทั้งแถวและทั้งคอลัมน์ของช่องนั้น',
  'settings.highlightSame': 'ไฮไลต์เลขเดียวกัน',
  'settings.highlightSameDesc': 'เน้นช่องที่มีเลขซ้ำกับช่องที่เลือก',
  'settings.autoCleanNotes': 'ลบโน้ตอัตโนมัติ',
  'settings.autoCleanNotesDesc': 'วางเลขแล้วตัดโน้ตนั้นในช่องเพื่อนบ้าน',
  'settings.language': 'ภาษา',
  'settings.languageDesc': 'ค่าเริ่มต้นคือภาษาอังกฤษ',

  'diff.easy': 'ง่าย',
  'diff.medium': 'ปานกลาง',
  'diff.hard': 'ยาก',
  'blurb.easy': 'เลขตั้งต้นเยอะ ไล่ทีละช่องก็จบ (Singles เท่านั้น)',
  'blurb.medium': 'เลขตั้งต้นน้อยลง ต้องไล่หาตัวเลือกมากขึ้น',
  'blurb.hard': 'เลขตั้งต้นน้อย ต้องคิดหลายชั้น หรือลองผิดลองถูก',

  'rating.0': 'ไม่ต้องใช้เทคนิค',
  'rating.1': 'Singles',
  'rating.2': 'Locked Candidates / Pairs',
  'rating.3': 'X-Wing',
  'rating.4': 'ต้องลองผิดลองถูก',
  'rating.5': 'กระดานขัดแย้ง',

  'win.title': 'แก้สำเร็จแล้ว!',
  'win.sub': 'ระดับ{difficulty}',
  'win.time': 'เวลา',
  'win.hints': 'คำใบ้',
  'win.mistakes': 'เลขผิด',
  'win.again': 'เล่นอีกกระดาน',
  'win.viewBoard': 'ดูกระดานที่แก้แล้ว',
  'win.stars': '{n} ดาวจาก 3',

  'toast.solved': 'แก้สำเร็จแล้ว! 🎉',
  'toast.restarted': 'เริ่มกระดานนี้ใหม่แล้ว',
  'toast.foundWrong': 'พบ {n} ช่องที่ยังไม่ถูก',
  'toast.allCorrect': 'ทุกช่องที่เติมถูกต้องแล้ว 👍',
  'toast.statsCleared': 'ล้างสถิติแล้ว',

  'unit.row': 'แถว {n}',
  'unit.col': 'คอลัมน์ {n}',
  'unit.box': 'บล็อก {n}',
  'unit.unit': 'ยูนิต',
  'hint.more': '{list} และอีก {n} ช่อง',

  'hint.mistake.title': 'มีเลขผิด {n} ช่อง',
  'hint.mistake.body':
    'ช่อง {cells} ยังไม่ตรงกับเฉลย — กด "ตรวจ" เพื่อไฮไลต์ หรือลบเลขนั้นออกแล้วลองใหม่',
  'hint.nakedSingle.body':
    'ช่อง {cell} เหลือตัวเลือกเดียวคือ {digit} เพราะเลขอื่นถูกตัดออกหมดจากแถว คอลัมน์ และบล็อกแล้ว',
  'hint.hiddenSingle.body': 'ใน{unit} มีช่องเดียวที่ใส่เลข {digit} ได้ คือ {cell}',
  'hint.locked.title': 'Locked Candidates ({digits})',
  'hint.locked.body':
    'ใน{unit} เลข {digits} รวมตัวอยู่แค่ {cells} จึงตัดเลข {digits} ออกจากช่อง {targets} ได้',
  'hint.nakedPair.title': 'Naked Pair · {digits}',
  'hint.nakedPair.body':
    'ช่อง {cells} มีตัวเลือกแค่ {digits} เหมือนกัน สองช่องนี้จึงต้องเป็นสองเลขนี้ → ตัดออกจากช่องอื่นใน{unit}',
  'hint.hiddenPair.title': 'Hidden Pair · {digits}',
  'hint.hiddenPair.body':
    'ใน{unit} เลข {digits} อยู่ได้แค่ {cells} → สองช่องนี้เหลือแค่สองเลขนี้ ตัดตัวเลือกอื่นทิ้ง',
  'hint.xwing.title': 'X-Wing · เลข {digits}',
  'hint.xwing.body':
    'เลข {digits} วางเป็นมุมสี่เหลี่ยมที่ {cells} → ตัดเลข {digits} ออกจากช่อง {targets}',
  'hint.generic.title': 'ตัดตัวเลือก',
  'hint.generic.body': 'ตัดเลข {digits} ออกจาก {targets}',
  'hint.reveal.title': 'ทางตัน · เฉลยช่อง {cell}',
  'hint.reveal.body':
    'เทคนิคพื้นฐานที่ระบบมีใช้ต่อไม่ได้แล้ว ช่อง {cell} เป็นช่องที่เหลือตัวเลือกน้อยที่สุด ({count} ตัว) — คำตอบคือ {digit} ถ้าอยากลองเองให้เดาช่องนี้',
}

const DICT: Record<Lang, Record<string, string>> = { en, th }

/** แปลข้อความ + แทนค่า {placeholder} */
export function t(lang: Lang, key: string, vars?: Vars): string {
  const raw = DICT[lang]?.[key] ?? DICT.en[key] ?? key
  if (!vars) return raw
  return raw.replace(/\{(\w+)\}/g, (match, name: string) =>
    vars[name] === undefined ? match : String(vars[name]),
  )
}

/** ชื่อยูนิตสำหรับข้อความ hint: 0–8 แถว, 9–17 คอลัมน์, 18–26 บล็อก */
export function unitName(lang: Lang, unit: number): string {
  if (unit < 9) return t(lang, 'unit.row', { n: unit + 1 })
  if (unit < 18) return t(lang, 'unit.col', { n: unit - 8 })
  return t(lang, 'unit.box', { n: unit - 17 })
}

/** รายการช่องแบบอ่านออกเสียง เช่น "R3C5, R4C5 and 3 more" */
export function cellListText(lang: Lang, cells: number[], limit = 4): string {
  const names = cells.map((cell) => `R${Math.floor(cell / 9) + 1}C${(cell % 9) + 1}`)
  if (names.length <= limit) return names.join(', ')
  return t(lang, 'hint.more', { list: names.slice(0, limit).join(', '), n: names.length - limit })
}
