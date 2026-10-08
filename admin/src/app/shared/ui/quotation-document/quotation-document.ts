// MIRRORED in frontend/src/app/shared/ui/quotation-document/quotation-document.ts; change both together.
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { QuotationDocument } from '../../quotation/document';
import { formatLongDate, formatMoney, formatRate } from '../../quotation/format';
import { computeTotals } from '../../quotation/totals';
import { BracketAmount } from '../bracket-amount';
import { SineSquares } from '../sine-squares';

/**
 * The quotation sheet, ported from quotations/cotizacion-onp.html. Print-first: no hover
 * states, no translucent layers in print. Totals come from shared/totals.ts only.
 */
@Component({
  selector: 'qm-quotation-document',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BracketAmount, SineSquares],
  templateUrl: './quotation-document.html',
  styleUrl: './quotation-document.css',
})
export class QuotationDocumentView {
  readonly document = input.required<QuotationDocument>();

  protected readonly view = computed(() => {
    const doc = this.document();
    const totals = computeTotals({
      lines: doc.sections.flatMap((section) => section.lines),
      taxRateBp: doc.taxRateBp,
    });

    let index = 0;
    const sections = doc.sections
      .filter((section) => section.lines.length > 0)
      .map((section) => ({
        name: section.name,
        lines: section.lines.map((line) => ({
          ...line,
          unitPrice: formatMoney(line.unitPriceCents),
          amount: formatMoney(totals.lineCents[index++]),
        })),
      }));

    return {
      doc,
      sections,
      // Validated by the API (declarations only); applied inline to the sheet.
      sheetCss: doc.branding.sheetCss,
      issuedOn: formatLongDate(doc.issuedOn),
      taxRate: formatRate(doc.taxRateBp),
      subtotal: formatMoney(totals.subtotalCents),
      tax: formatMoney(totals.taxCents),
      total: formatMoney(totals.totalCents),
    };
  });
}
