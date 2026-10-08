import { describe, expect, it } from 'vitest';
import { composeSurfaceCss } from './branding-css';

describe('composeSurfaceCss', () => {
  const gradient = { angle: 180, stops: [{ color: '#cdd2d4', position: 100 }, { color: '#e3e6e7', position: 0 }] };

  it('puts the gradient first (stops in order) and the extra CSS after it', () => {
    expect(composeSurfaceCss(gradient, 'border-radius: 12px;')).toBe(
      'background: linear-gradient(180deg, #e3e6e7 0%, #cdd2d4 100%); border-radius: 12px;',
    );
  });

  it('works with either part alone, and is empty when both are', () => {
    expect(composeSurfaceCss(null, 'box-shadow: none;')).toBe('box-shadow: none;');
    expect(composeSurfaceCss(gradient, '')).toMatch(/^background: linear-gradient/);
    expect(composeSurfaceCss(null, '')).toBe('');
  });
});
