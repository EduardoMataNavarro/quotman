// MIRRORED in frontend/src/app/shared/ui/bracket-amount.ts; change both together.
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * An amount framed by two corner brackets. `total`: top-left and bottom-right.
 * `tax`: the total's frame mirrored and smaller. Both hang 10px past the column edge so
 * the digits stay aligned with the amounts above.
 */
@Component({
  selector: 'qm-bracket-amount',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'variant()' },
  template: '<ng-content />',
  styles: `
    :host {
      position: relative;
      display: inline-block;
      margin-right: -10px;
      white-space: nowrap;
      line-height: 1.15;
      letter-spacing: -0.02em;
      font-variant-numeric: tabular-nums;
    }
    :host::before,
    :host::after {
      content: '';
      position: absolute;
      width: 10px;
      height: 10px;
      border: 1.5px solid var(--color-slate);
    }

    :host(.total) { padding: 4px 10px; font-size: var(--text-total); }
    :host(.total)::before { top: 0; left: 0; border-right: 0; border-bottom: 0; }
    :host(.total)::after { bottom: 0; right: 0; border-left: 0; border-top: 0; }

    :host(.tax) { padding: 3px 10px; font-size: var(--text-tax); }
    :host(.tax)::before { top: 0; right: 0; width: 8px; height: 8px; border-left: 0; border-bottom: 0; }
    :host(.tax)::after { bottom: 0; left: 0; width: 8px; height: 8px; border-right: 0; border-top: 0; }
  `,
})
export class BracketAmount {
  readonly variant = input<'total' | 'tax'>('total');
}
