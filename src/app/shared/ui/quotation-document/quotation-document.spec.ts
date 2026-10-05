import { TestBed } from '@angular/core/testing';
import type { QuotationDocument } from '@api/quotations/quotations.type';
import { onpQuotation } from '@shared/fixtures/onp';
import { QuotationDocumentView } from './quotation-document';

function render(document: QuotationDocument): HTMLElement {
  const fixture = TestBed.createComponent(QuotationDocumentView);
  fixture.componentRef.setInput('document', document);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

const text = (el: Element | null) => el?.textContent?.replace(/\s+/g, ' ').trim();

describe('QuotationDocumentView', () => {
  it('renders the ONP fixture with totals from shared/totals', () => {
    const el = render(onpQuotation);
    expect(text(el.querySelector('.pane-top strong'))).toBe('COT-2026-001');
    expect(text(el.querySelector('.sum-sub .num'))).toBe('$75,000.00');
    expect(text(el.querySelector('.sum-tax'))).toBe('IVA (16%)+$12,000.00'); // the 12px gap is a margin, not a space
    expect(text(el.querySelector('.sum-total qm-bracket-amount'))).toBe('$87,000.00');
    expect(text(el.querySelector('dl'))).toContain('Fecha4 de octubre de 2026');
  });

  it('spans each stage cell over its lines', () => {
    const groups = [...render(onpQuotation).querySelectorAll('td.group')];
    expect(groups.map((td) => [text(td), td.getAttribute('rowspan')])).toEqual([
      ['Arquitectura', '2'],
      ['Desarrollo', '2'],
      ['Entrega', '1'],
    ]);
  });

  it('skips empty stages, missing descriptions, the logo and terms when absent', () => {
    const el = render({
      ...onpQuotation,
      issuer: { ...onpQuotation.issuer, logoUrl: null },
      stages: [
        { name: 'Vacía', lines: [] },
        { name: null, lines: [{ id: 'x', title: 'Hora', description: null, qty: 2, unitPriceCents: 150_00 }] },
      ],
      terms: [],
    });
    expect(el.querySelectorAll('tbody')).toHaveLength(1);
    expect(el.querySelector('.concept-desc')).toBeNull();
    expect(el.querySelector('img')).toBeNull();
    expect(el.querySelector('.terms')).toBeNull();
    expect(text(el.querySelector('.sum-total qm-bracket-amount'))).toBe('$348.00');
  });
});
