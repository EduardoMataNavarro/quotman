import { ChangeDetectionStrategy, Component } from '@angular/core';
import { onpQuotation } from '@shared/fixtures/onp';
import { DownloadButton } from '../../shared/ui/download-button';
import { QuotationDocumentView } from '../../shared/ui/quotation-document/quotation-document';

/** `/muestra`: the ONP quotation from the fixture, for checking the document on screen and in print. */
@Component({
  selector: 'qm-sample-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [QuotationDocumentView, DownloadButton],
  template: `
    <main class="px-4 py-10 max-[860px]:py-6 print:p-0">
      <qm-quotation-document [document]="quotation" />
      <div class="mx-auto mt-6 flex max-w-[1100px] justify-center">
        <qm-download-button href="https://cotizacion-onp.pages.dev/cotizacion-onp.pdf" />
      </div>
    </main>
  `,
})
export class SamplePage {
  protected readonly quotation = onpQuotation;
}
