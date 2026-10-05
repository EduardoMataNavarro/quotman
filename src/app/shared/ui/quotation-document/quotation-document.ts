import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { QuotationDocument } from '@api/quotations/quotations.type';
import { formatLongDate, formatMoney, formatRate } from '@shared/format';
import { computeTotals } from '@shared/totals';
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
      lines: doc.stages.flatMap((stage) => stage.lines),
      taxRateBp: doc.taxRateBp,
    });

    let index = 0;
    const stages = doc.stages
      .filter((stage) => stage.lines.length > 0)
      .map((stage) => ({
        name: stage.name,
        lines: stage.lines.map((line) => ({
          ...line,
          unitPrice: formatMoney(line.unitPriceCents),
          amount: formatMoney(totals.lineCents[index++]),
        })),
      }));

    return {
      doc,
      stages,
      issuedOn: formatLongDate(doc.issuedOn),
      taxRate: formatRate(doc.taxRateBp),
      subtotal: formatMoney(totals.subtotalCents),
      tax: formatMoney(totals.taxCents),
      total: formatMoney(totals.totalCents),
    };
  });
}
