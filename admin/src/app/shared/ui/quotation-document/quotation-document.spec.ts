// MIRRORED in frontend/src/app/shared/ui/quotation-document/quotation-document.spec.ts; change both together.
import { TestBed } from '@angular/core/testing';
import type { QuotationDocument } from '../../quotation/document';
import { onpQuotation } from '../../quotation/fixtures/onp';
import { QuotationDocumentView } from './quotation-document';

function render(document: QuotationDocument): HTMLElement {
  const fixture = TestBed.createComponent(QuotationDocumentView);
  fixture.componentRef.setInput('document', document);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

const text = (el: Element | null) => el?.textContent?.replace(/\s+/g, ' ').trim();

describe('QuotationDocumentView', () => {
  it('applies the sheet branding inline on the sheet, under the glows and grain', () => {
    const el = render({ ...onpQuotation, branding: { pageCss: '', sheetCss: 'background: #ffffff; border-radius: 12px;' } });
    const sheet = el.querySelector('.window') as HTMLElement;
    expect(sheet.querySelector(':scope > .pane')).not.toBeNull();
    expect(sheet.getAttribute('style')).toBe('background: #ffffff; border-radius: 12px;');
  });

  it('keeps the template look when there is no branding', () => {
    const sheet = render(onpQuotation).querySelector('.window') as HTMLElement;
    expect(sheet.getAttribute('style')).toBeNull();
  });

  it('renders the ONP fixture with totals from shared/totals', () => {
    const el = render(onpQuotation);
    expect(text(el.querySelector('.pane-top strong'))).toBe('2026-001.1');
    expect(text(el.querySelector('.sum-sub .num'))).toBe('$75,000.00');
    expect(text(el.querySelector('.sum-tax'))).toBe('IVA (16%)+$12,000.00'); // the 12px gap is a margin, not a space
    expect(text(el.querySelector('.sum-total qm-bracket-amount'))).toBe('$87,000.00');
    expect(text(el.querySelector('dl'))).toContain('Fecha4 de octubre de 2026');
    expect(text(el.querySelector('dl'))).toContain('RFCXAXX010101000');
  });

  it('spans each section cell over its lines', () => {
    const groups = [...render(onpQuotation).querySelectorAll('td.group')];
    expect(groups.map((td) => [text(td), td.getAttribute('rowspan')])).toEqual([
      ['Arquitectura', '2'],
      ['Desarrollo', '2'],
      ['Entrega', '1'],
    ]);
  });

  it('skips empty sections, missing descriptions, the logo and terms when absent', () => {
    const el = render({
      ...onpQuotation,
      issuer: onpQuotation.issuer,
      sections: [
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
