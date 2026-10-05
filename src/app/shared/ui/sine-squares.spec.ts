import { sineSquares } from './sine-squares';

describe('sineSquares', () => {
  const wave = sineSquares({
    count: 12, min: 3, max: 12, gap: 4, amplitude: 7,
    from: [0xde, 0xde, 0xde], to: [0x24, 0x24, 0x24],
  });

  it('grows 12 squares from 3px to 12px and darkens #dedede → #242424', () => {
    expect(wave.squares).toHaveLength(12);
    expect(wave.squares[0]).toMatchObject({ size: 3, fill: 'rgb(222,222,222)' });
    expect(wave.squares[11]).toMatchObject({ size: 12, fill: 'rgb(36,36,36)' });
  });

  it('fits the wave in max + 2 × amplitude', () => {
    expect(wave.height).toBe(26);
    for (const s of wave.squares) {
      expect(s.y).toBeGreaterThanOrEqual(0);
      expect(s.y + s.size).toBeLessThanOrEqual(26);
    }
  });
});
