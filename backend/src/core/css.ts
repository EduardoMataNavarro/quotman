/**
 * Branding CSS: plain declarations only (`background: linear-gradient(...); border-radius: 12px`),
 * applied inline to the client page and the sheet. Anything that could escape a style
 * attribute, load remote resources or beat the print rules is refused.
 */
export const BRANDING_CSS_MAX = 2000;

const ALLOWED_PROPERTIES = new Set([
  'background',
  'background-color',
  'background-image',
  'background-size',
  'background-position',
  'background-repeat',
  'background-attachment',
  'background-blend-mode',
  'background-clip',
  'background-origin',
  'border',
  'border-color',
  'border-width',
  'border-style',
  'border-radius',
  'box-shadow',
  'outline',
]);

// `url()` (remote loads), `@` rules, markup or block delimiters, comments, escapes,
// legacy script hooks, and !important (it would beat the print stylesheet).
const FORBIDDEN_VALUE = /url\s*\(|expression\s*\(|javascript:|[<>{}\\@]|\/\*|!important/i;

export type CssResult = { ok: true; css: string } | { ok: false; error: string };

/** Validates and normalizes to `prop: value; prop: value;` (empty input → ''). */
export function sanitizeDeclarations(input: string): CssResult {
  if (input.length > BRANDING_CSS_MAX) return { ok: false, error: `Máximo ${BRANDING_CSS_MAX} caracteres.` };
  const declarations: string[] = [];
  for (const raw of input.split(';')) {
    const text = raw.trim();
    if (!text) continue;
    const match = /^([a-zA-Z-]+)\s*:\s*([\s\S]+)$/.exec(text);
    if (!match) return { ok: false, error: `Declaración no válida: "${text.slice(0, 60)}".` };
    const property = match[1]!.toLowerCase();
    const value = match[2]!.trim().replace(/\s+/g, ' ');
    if (!ALLOWED_PROPERTIES.has(property)) return { ok: false, error: `Propiedad no permitida: ${property}.` };
    if (FORBIDDEN_VALUE.test(value)) return { ok: false, error: `Valor no permitido en ${property}.` };
    if (!balancedParens(value)) return { ok: false, error: `Paréntesis sin cerrar en ${property}.` };
    declarations.push(`${property}: ${value};`);
  }
  return { ok: true, css: declarations.join(' ') };
}

function balancedParens(value: string): boolean {
  let depth = 0;
  for (const ch of value) {
    if (ch === '(') depth++;
    else if (ch === ')' && --depth < 0) return false;
  }
  return depth === 0;
}
