// src/features/empleados/validators.ts
import * as React from 'react'

/* ── Patrones (alineados al backend) ───────────────────────────────────────── */
export const RE_CURP   = /^[A-Z]{4}\d{6}[HM][A-Z]{5}\d{2}$/          // 18, mayúsculas
export const RE_RFC    = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/            // 12–13
export const RE_NSS    = /^\d{11}$/                                  // 11 dígitos
export const RE_CLABE  = /^\d{18}$/                                  // 18 dígitos
export const RE_CUENTA = /^\d{10,20}$/                               // 10–20 dígitos

// Teléfonos
export const RE_PHONE10 = /^\d{10}$/                                 // exactamente 10 dígitos
export const RE_PHONE   = /^[0-9+\s-]{7,20}$/                        // genérico (si lo necesitas)

// Código Postal (México)
export const RE_CP_MX = /^\d{5}$/                                    // 5 dígitos

/* ── Helpers para usar en <TextField inputProps={{ pattern: ... }}> ───────── */
export const patternAttr = (re: RegExp | string): string =>
  typeof re === 'string' ? re : re.source

/* ── Normalizadores onBlur ────────────────────────────────────────────────── */
export const toUpperOnBlur = (e: React.FocusEvent<HTMLInputElement>) => {
  const v = (e.currentTarget.value ?? '').toString()
  e.currentTarget.value = v.trim().toUpperCase()
}

export const stripSpacesDashesOnBlur = (e: React.FocusEvent<HTMLInputElement>) => {
  const v = (e.currentTarget.value ?? '').toString()
  e.currentTarget.value = v.replace(/[\s-]+/g, '')
}
