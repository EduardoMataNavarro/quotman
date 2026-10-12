import { Component, computed, inject, signal, type OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TextareaModule } from 'primeng/textarea';
import type { BrandingSurface } from '../../../data/dtos/branding';
import { errorMessage } from '../../../data/utils/error-message';
import { TEMPLATE_PAGE_GRADIENT, TEMPLATE_SHEET_GRADIENT } from '../../../model/constants/branding/template-gradients.const';
import { BrandingService } from '../../../services/http/branding.service';
import { composeSurfaceCss, type BrandingGradient } from '../../../shared/quotation/branding-css';
import { onpQuotation } from '../../../shared/quotation/fixtures/onp';
import { QuotationDocumentView } from '../../../shared/ui/quotation-document/quotation-document';
import { GradientPicker } from '../../components/gradient-picker/gradient-picker';

const EMPTY: BrandingSurface = { gradient: null, css: '' };

/** The ONP sample with every price at $0.00: the preview shows the look, not amounts. */
const PREVIEW_QUOTATION = {
  ...onpQuotation,
  sections: onpQuotation.sections.map((section) => ({
    ...section,
    lines: section.lines.map((line) => ({ ...line, unitPriceCents: 0 })),
  })),
};

type SurfaceKey = 'page' | 'sheet';

const SURFACES: readonly { key: SurfaceKey; title: string; hint: string }[] = [
  {
    key: 'page',
    title: 'Fondo de la página',
    hint: 'Se aplica después del degradado: fondo, borde y sombra. Vacío y sin degradado usa el fondo de la plantilla.',
  },
  {
    key: 'sheet',
    title: 'Hoja de la cotización',
    hint: 'Se aplica después del degradado: fondo, borde y sombra. Vacío y sin degradado usa la hoja plateada de la plantilla. Los destellos y la textura de la plantilla siempre quedan encima.',
  },
];

/**
 * Global branding. Each surface stores the picker's gradient and extra CSS separately; the
 * API applies the gradient first and the CSS after it. The preview composes them the same
 * way (mirrored `composeSurfaceCss`).
 */
@Component({
  selector: 'qm-branding',
  imports: [
    FormsModule,
    ButtonModule,
    CardModule,
    CheckboxModule,
    MessageModule,
    ProgressSpinnerModule,
    TextareaModule,
    GradientPicker,
    QuotationDocumentView,
  ],
  templateUrl: './branding.html',
  styleUrl: './branding.css',
})
export class BrandingPage implements OnInit {
  private api = inject(BrandingService);
  private messages = inject(MessageService);

  protected readonly surfaces = SURFACES;
  protected page = signal<BrandingSurface>(EMPTY);
  protected sheet = signal<BrandingSurface>(EMPTY);
  protected loading = signal(true);
  protected saving = signal(false);
  protected error = signal<string | null>(null);

  protected pageCss = computed(() => composeSurfaceCss(this.page().gradient, this.page().css));
  protected preview = computed(() => ({
    ...PREVIEW_QUOTATION,
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

  protected state(surface: SurfaceKey): BrandingSurface {
    return this[surface]();
  }

  /** Switching the picker on starts from the template's gradient for that surface. */
  protected toggleGradient(surface: SurfaceKey, on: boolean): void {
    const start = surface === 'page' ? TEMPLATE_PAGE_GRADIENT : TEMPLATE_SHEET_GRADIENT;
    this[surface].update((s) => ({ ...s, gradient: on ? structuredClone(start) : null }));
  }

  protected setGradient(surface: SurfaceKey, gradient: BrandingGradient): void {
    this[surface].update((s) => ({ ...s, gradient }));
  }

  protected setCss(surface: SurfaceKey, css: string): void {
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
