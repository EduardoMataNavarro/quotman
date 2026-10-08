// MIRRORED in admin/src/app/shared/ui/sine-squares.ts; change both together.
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export interface SineSquare {
  x: number;
  y: number;
  size: number;
  fill: string;
}

/** Squares riding one sine period, growing and darkening left to right. */
export function sineSquares(options: {
  count: number;
  min: number;
  max: number;
  gap: number;
  amplitude: number;
  from: [number, number, number];
  to: [number, number, number];
}): { squares: SineSquare[]; width: number; height: number } {
  const { count, min, max, gap, amplitude, from, to } = options;
  const height = max + amplitude * 2;
  const squares: SineSquare[] = [];
  let x = 0;
  for (let i = 0; i < count; i++) {
    const t = count > 1 ? i / (count - 1) : 0;
    const size = min + (max - min) * t;
    const cy = height / 2 + amplitude * Math.sin(t * Math.PI * 2);
    const [r, g, b] = from.map((c, k) => Math.round(c + (to[k] - c) * t));
    squares.push({ x: round(x), y: round(cy - size / 2), size: round(size), fill: `rgb(${r},${g},${b})` });
    x += size + gap;
  }
  return { squares, width: round(x - gap), height };
}

const round = (n: number) => Math.round(n * 100) / 100;

@Component({
  selector: 'qm-sine-squares',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
  styles: ':host { display: block; line-height: 0; }',
  template: `
    @let w = wave();
    <svg [attr.width]="w.width" [attr.height]="w.height" [attr.viewBox]="'0 0 ' + w.width + ' ' + w.height">
      @for (s of w.squares; track $index) {
        <rect [attr.x]="s.x" [attr.y]="s.y" [attr.width]="s.size" [attr.height]="s.size" [attr.fill]="s.fill" />
      }
    </svg>
  `,
})
export class SineSquares {
  readonly count = input(12);
  readonly min = input(3);
  readonly max = input(12);

  protected readonly wave = computed(() =>
    sineSquares({
      count: this.count(),
      min: this.min(),
      max: this.max(),
      gap: 4,
      amplitude: 7,
      from: [0xde, 0xde, 0xde],
      to: [0x24, 0x24, 0x24],
    }),
  );
}
