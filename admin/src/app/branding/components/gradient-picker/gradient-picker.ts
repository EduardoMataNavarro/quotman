import { Component, computed, input, output } from '@angular/core';
import { LucidePlus, LucideTrash2 } from '@lucide/angular';
import { gradientDeclaration, type BrandingGradient } from '../../../shared/quotation/branding-css';

const MAX_STOPS = 8;
const MIN_STOPS = 2;

/**
 * Angle + color stops. Controlled: it renders `value` and emits every change; the page
 * stores the gradient on its own, apart from the extra-CSS field.
 */
@Component({
  selector: 'qm-gradient-picker',
  imports: [LucidePlus, LucideTrash2],
  templateUrl: './gradient-picker.html',
})
export class GradientPicker {
  readonly value = input.required<BrandingGradient>();
  readonly idPrefix = input.required<string>();
  readonly changed = output<BrandingGradient>();

  protected swatch = computed(() => gradientDeclaration(this.value()).replace(/^background: |;$/g, ''));
  protected canRemove = computed(() => this.value().stops.length > MIN_STOPS);
  protected canAdd = computed(() => this.value().stops.length < MAX_STOPS);

  protected setAngle(raw: string): void {
    const n = Math.round(Number(raw));
    if (Number.isFinite(n)) this.emit({ angle: Math.min(360, Math.max(0, n)) });
  }

  protected setColor(index: number, color: string): void {
    this.emit({ stops: this.value().stops.map((s, i) => (i === index ? { ...s, color } : s)) });
  }

  protected setPosition(index: number, raw: string): void {
    const n = Math.round(Number(raw));
    if (!Number.isFinite(n)) return;
    const position = Math.min(100, Math.max(0, n));
    this.emit({ stops: this.value().stops.map((s, i) => (i === index ? { ...s, position } : s)) });
  }

  protected addStop(): void {
    const stops = this.value().stops;
    if (this.canAdd()) this.emit({ stops: [...stops, { color: stops.at(-1)?.color ?? '#cdd2d5', position: 100 }] });
  }

  protected removeStop(index: number): void {
    if (this.canRemove()) this.emit({ stops: this.value().stops.filter((_, i) => i !== index) });
  }

  private emit(change: Partial<BrandingGradient>): void {
    this.changed.emit({ ...this.value(), ...change });
  }
}
