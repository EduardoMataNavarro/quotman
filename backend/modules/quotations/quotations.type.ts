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
