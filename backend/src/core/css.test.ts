import { describe, expect, it } from 'vitest';
import { sanitizeDeclarations } from './css';

describe('sanitizeDeclarations', () => {
  it('normalizes allowed declarations', () => {
    expect(
      sanitizeDeclarations('  background: linear-gradient(135deg,  #f4f6f7 0%, #a7afb4 100%) ;border-radius:12px;'),
    ).toEqual({ ok: true, css: 'background: linear-gradient(135deg, #f4f6f7 0%, #a7afb4 100%); border-radius: 12px;' });
    expect(sanitizeDeclarations('')).toEqual({ ok: true, css: '' });
  });

  it.each([
    ['position: fixed', 'Propiedad no permitida'],
    ['background: url(https://evil.example/x.png)', 'Valor no permitido'],
    ['background: red; } body { display:none', 'Declaración no válida'],
    ['background: red !important', 'Valor no permitido'],
    ['background: red</style><script>', 'Valor no permitido'],
    ['background: linear-gradient(red, blue', 'Paréntesis sin cerrar'],
    ['just text', 'Declaración no válida'],
  ])('refuses %s', (input, error) => {
    const result = sanitizeDeclarations(input);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toContain(error);
  });
});
