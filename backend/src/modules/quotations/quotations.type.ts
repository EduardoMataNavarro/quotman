import type { BrandingGradient } from '../../shared/branding-css';
import type { Totals } from '../../shared/totals';
import type { QuotationStatus } from './quotations.enum';

// The document shape lives in src/shared/document.ts (mirrored in the frontend).
export type { DocumentBranding, Issuer, QuotationDocument, QuotationLine, QuotationSection } from '../../shared/document';

/** A quotation as stored, with its sections and lines in order. */
export interface QuotationRecord {
  id: string;
  slug: string;
  /** `YYYY-NNN`, without the revision. */
  folio: string;
  clientId: string;
  title: string;
  status: QuotationStatus;
  archivedFrom: QuotationStatus | null;
  currency: 'MXN';
  taxRateBp: number;
  issuedOn: string;
  validUntil: string;
  terms: string[];
  notes: string | null;
  /** Branding override, per piece; null uses the global branding's piece. */
  pageGradient: BrandingGradient | null;
  pageCss: string | null;
  sheetGradient: BrandingGradient | null;
  sheetCss: string | null;
  revision: number;
  publishedRevision: number | null;
  sentAt: string | null;
  decidedAt: string | null;
  createdAt: string;
  updatedAt: string;
  sections: SectionRecord[];
  /** Lines in no section. */
  unsectionedLines: LineRecord[];
}

export interface SectionRecord {
  id: string;
  name: string;
  position: number;
  lines: LineRecord[];
}

export interface LineRecord {
  id: string;
  offeredServiceId: string | null;
  title: string;
  description: string | null;
  qty: number;
  unitPriceCents: number;
  position: number;
}

export interface ClientRef {
  id: string;
  name: string;
  company: string | null;
  email: string;
}

/** Admin editor payload. */
export interface QuotationDetail extends QuotationRecord {
  /** `YYYY-NNN.R` for the current revision. */
  displayFolio: string;
  client: ClientRef;
  totals: Totals;
  /** `validUntil` has passed and the client never accepted. */
  expired: boolean;
  /** Edited since the last send. */
  hasUnpublishedChanges: boolean;
}

/** Admin list row. */
export interface QuotationSummary {
  id: string;
  slug: string;
  displayFolio: string;
  title: string;
  status: QuotationStatus;
  client: Pick<ClientRef, 'id' | 'name' | 'company'>;
  totalCents: number;
  issuedOn: string;
  validUntil: string;
  revision: number;
  expired: boolean;
  hasUnpublishedChanges: boolean;
  updatedAt: string;
}
