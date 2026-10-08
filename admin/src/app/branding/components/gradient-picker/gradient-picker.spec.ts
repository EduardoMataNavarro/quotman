import { TestBed } from '@angular/core/testing';
import type { BrandingGradient } from '../../../shared/quotation/branding-css';
import { GradientPicker } from './gradient-picker';

describe('GradientPicker', () => {
  function setup(value: BrandingGradient) {
    const fixture = TestBed.createComponent(GradientPicker);
    fixture.componentRef.setInput('value', value);
    fixture.componentRef.setInput('idPrefix', 'p');
    const changes: BrandingGradient[] = [];
    fixture.componentInstance.changed.subscribe((g) => changes.push(g));
    fixture.detectChanges();
    return { el: fixture.nativeElement as HTMLElement, changes };
  }

  const two: BrandingGradient = { angle: 90, stops: [{ color: '#ffffff', position: 0 }, { color: '#000000', position: 100 }] };

  it('emits a clamped angle without touching the stops', () => {
    const { el, changes } = setup(two);
    const angle = el.querySelector<HTMLInputElement>('#p-angle')!;
    angle.value = '400';
    angle.dispatchEvent(new Event('input'));
    expect(changes.at(-1)).toEqual({ ...two, angle: 360 });
  });

  it('keeps at least two stops', () => {
    const { el } = setup(two);
    const removes = el.querySelectorAll<HTMLButtonElement>('button[aria-label^="Quitar color"]');
    expect([...removes].every((b) => b.disabled)).toBe(true);
  });
});
