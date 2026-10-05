import type { Totals } from '../../../shared/totals';
import type { QuotationStatus } from './quotations.enum';

/**
 * The quotation as a document: everything the client page and the PDF draw, and nothing
 * about access or workflow. Served as JSON by `/api/q/:slug` (headless hydration) and
 * passed to `<qm-quotation-document>` and the pdf-lib renderer.
 */
export interface QuotationDocument {
  folio: string;
  /** ISO date, `YYYY-MM-DD`. */
  issuedOn: string;
  validUntil: string;
  currency: 'MXN';
  /** Basis points: 1600 = 16 %. */
  taxRateBp: number;
  issuer: Issuer;
  stages: QuotationStage[];
  terms: string[];
}

export interface Issuer {
  name: string;
  role: string;
  email: string;
  phone: string;
  razonSocial: string;
  rfc: string;
  location: string;
  logoUrl: string | null;
}

export interface QuotationStage {
  /** `null` for lines that belong to no stage. */
  name: string | null;
  lines: QuotationLine[];
}

export interface QuotationLine {
  id: string;
  title: string;
  description: string | null;
  qty: number;
  /** MXN, integer cents. */
  unitPriceCents: number;
}

/** A quotation as stored, with its stages and lines in order. */
export interface QuotationRecord {
  id: string;
  slug: string;
  folio: string;
  clientId: string;
  title: string;
  status: QuotationStatus;
  currency: 'MXN';
  taxRateBp: number;
  issuedOn: string;
  validUntil: string;
  terms: string[];
  notes: string | null;
  /** Bumped by the first edit after a publish; `publishedVersion` trails it until republished. */
  version: number;
  publishedVersion: number | null;
  sentAt: string | null;
  viewedAt: string | null;
  decidedAt: string | null;
  createdAt: string;
  updatedAt: string;
  stages: StageRecord[];
}

export interface StageRecord {
  id: string;
  name: string | null;
  position: number;
  lines: LineRecord[];
}

export interface LineRecord {
  id: string;
  serviceId: string | null;
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
  client: ClientRef;
  totals: Totals;
  /** `validUntil` has passed and the client never accepted. */
  expired: boolean;
  hasUnpublishedChanges: boolean;
}

/** Admin list row. */
export interface QuotationSummary {
  id: string;
  slug: string;
  folio: string;
  title: string;
  status: QuotationStatus;
  client: Pick<ClientRef, 'id' | 'name' | 'company'>;
  totalCents: number;
  issuedOn: string;
  validUntil: string;
  expired: boolean;
  hasUnpublishedChanges: boolean;
  updatedAt: string;
}
