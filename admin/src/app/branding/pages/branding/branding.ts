import { Component, computed, inject, signal, type OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';
import type { BrandingSurface } from '../../../data/dtos/branding';
import { errorMessage } from '../../../data/utils/error-message';
import { TEMPLATE_PAGE_GRADIENT, TEMPLATE_SHEET_GRADIENT } from '../../../model/constants/branding/template-gradients.const';
import { BrandingService } from '../../../services/http/branding.service';
import { composeSurfaceCss, type BrandingGradient } from '../../../shared/quotation/branding-css';
import { onpQuotation } from '../../../shared/quotation/fixtures/onp';
import { QuotationDocumentView } from '../../../shared/ui/quotation-document/quotation-document';
import { GradientPicker } from '../../components/gradient-picker/gradient-picker';

const EMPTY: BrandingSurface = { gradient: null, css: '' };

/**
 * Global branding. Each surface stores the picker's gradient and extra CSS separately; the
 * API applies the gradient first and the CSS after it. The preview composes them the same
 * way (mirrored `composeSurfaceCss`).
 */
@Component({
  selector: 'qm-branding',
  imports: [GradientPicker, QuotationDocumentView],
  templateUrl: './branding.html',
  styleUrl: './branding.css',
})
export class BrandingPage implements OnInit {
  private api = inject(BrandingService);
  private messages = inject(MessageService);

  protected page = signal<BrandingSurface>(EMPTY);
  protected sheet = signal<BrandingSurface>(EMPTY);
  protected loading = signal(true);
  protected saving = signal(false);
  protected error = signal<string | null>(null);

  protected pageCss = computed(() => composeSurfaceCss(this.page().gradient, this.page().css));
  protected preview = computed(() => ({
    ...onpQuotation,
    branding: { pageCss: this.pageCss(), sheetCss: composeSurfaceCss(this.sheet().gradient, this.sheet().css) },
  }));

  ngOnInit(): void {
    this.api.get().subscribe({
      next: (branding) => {
        this.page.set(branding.page);
        this.sheet.set(branding.sheet);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(errorMessage(err, 'No se pudo cargar la marca.'));
      },
    });
  }

  /** Switching the picker on starts from the template's gradient for that surface. */
  protected toggleGradient(surface: 'page' | 'sheet', on: boolean): void {
    const start = surface === 'page' ? TEMPLATE_PAGE_GRADIENT : TEMPLATE_SHEET_GRADIENT;
    this[surface].update((s) => ({ ...s, gradient: on ? structuredClone(start) : null }));
  }

  protected setGradient(surface: 'page' | 'sheet', gradient: BrandingGradient): void {
    this[surface].update((s) => ({ ...s, gradient }));
  }

  protected setCss(surface: 'page' | 'sheet', css: string): void {
    this[surface].update((s) => ({ ...s, css }));
  }

  protected reset(): void {
    this.page.set(EMPTY);
    this.sheet.set(EMPTY);
  }

  protected save(): void {
    if (this.saving()) return;
    this.saving.set(true);
    this.error.set(null);
    this.api.save({ page: this.page(), sheet: this.sheet() }).subscribe({
      next: (branding) => {
        this.saving.set(false);
        this.page.set(branding.page);
        this.sheet.set(branding.sheet);
        this.messages.add({ severity: 'success', summary: 'Marca guardada', detail: 'Se aplicará a las cotizaciones que envíes.' });
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(errorMessage(err, 'No se pudo guardar la marca.'));
      },
    });
  }
}
