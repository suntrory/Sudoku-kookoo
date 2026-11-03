import type { CSSProperties } from 'react'

/**
 * ธีมสว่าง/มืด — เก็บค่าที่ผู้ใช้เลือกใน localStorage
 * ถ้ายังไม่เคยเลือก จะใช้ตามระบบ (prefers-color-scheme)
 */
export type Theme = 'light' | 'dark'

const THEME_KEY = 'sudoku.v1.theme'
const THEME_COLOR: Record<Theme, string> = { dark: '#070a14', light: '#f3f5fb' }

function systemTheme(): Theme {
  try {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

export function loadTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    /* storage ปิดอยู่ — ใช้ค่าระบบ */
  }
  return systemTheme()
}

export function saveTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    /* ignore */
  }
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme])
}

/** ใช้คู่กับ className="accent-ink" เพื่อให้สีประจำระดับอ่านออกทั้งสองธีม */
export const accentInk = (accent: string) => ({ '--diff-accent': accent }) as CSSProperties
