/** A service offered in the catalog. */
export interface OfferedService {
  id: string;
  name: string;
  description: string | null;
  /** MXN, integer cents. */
  unitPriceCents: number;
  unit: string;
  /** Section a new line from this service lands in, by name. */
  defaultSection: string | null;
  active: boolean;
  /** ISO 8601. */
  createdAt: string;
  updatedAt: string;
}
