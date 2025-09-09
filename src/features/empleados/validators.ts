// src/features/empleados/validators.ts
export const RE_CURP   = /^[A-Z]{4}\d{6}[HM][A-Z]{5}\d{2}$/;   // 18, mayúsculas
export const RE_RFC    = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;     // 12-13
export const RE_NSS    = /^\d{11}$/;                           // 11 dígitos
export const RE_CLABE  = /^\d{18}$/;                           // 18 dígitos
export const RE_CUENTA = /^\d{10,20}$/;                        // 10-20 dígitos

// Telefónos: el modelo no tiene validador → sugerimos algo flexible
// + opcional, dígitos, espacios o guiones, 7 a 20 chars (coincide c/ max_length)
export const RE_PHONE  = /^\+?[0-9\s-]{7,20}$/;

// HTML pattern recibe string, así que usamos .source
export const patternAttr = (re: RegExp) => re.source;

// Normalizadores útiles para inputs
export const toUpperOnBlur = (e: React.FocusEvent<HTMLInputElement>) => {
  e.currentTarget.value = e.currentTarget.value.toUpperCase().trim();
};

// Para campos numéricos: quita espacios y guiones en blur
export const stripSpacesDashesOnBlur = (e: React.FocusEvent<HTMLInputElement>) => {
  e.currentTarget.value = e.currentTarget.value.replace(/[\s-]+/g, '');
};
