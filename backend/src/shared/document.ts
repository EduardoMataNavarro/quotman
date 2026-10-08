// MIRRORED: identical copies live in frontend/src/app/shared/quotation/document.ts and admin/src/app/shared/quotation/document.ts.
// Change all three together.
/**
 * The quotation as a document: everything the client page and the PDF draw, and nothing
 * about access or workflow. Served as JSON by `/api/q/:slug` (headless hydration) and
 * passed to `<qm-quotation-document>` and the pdf-lib renderer.
 */
export interface QuotationDocument {
  /** With the revision: `2026-001.2`. */
  folio: string;
  /** ISO date, `YYYY-MM-DD`. */
  issuedOn: string;
  validUntil: string;
  currency: 'MXN';
  /** Basis points: 1600 = 16 %. */
  taxRateBp: number;
  issuer: Issuer;
  sections: QuotationSection[];
  terms: string[];
  branding: DocumentBranding;
}

/**
 * Inline CSS declarations for the page behind the sheet and for the sheet itself, already
 * validated by the API. Empty strings mean the template's built-in look.
 */
export interface DocumentBranding {
  pageCss: string;
  sheetCss: string;
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

export interface QuotationSection {
  /** `null` for the lines that belong to no section. */
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
