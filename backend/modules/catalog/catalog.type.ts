/** A catalog entry. Named `CatalogItem` so "service" keeps meaning the backend layer. */
export interface CatalogItem {
  id: string;
  name: string;
  description: string | null;
  /** MXN, integer cents. */
  unitPriceCents: number;
  unit: string;
  defaultStage: string | null;
  active: boolean;
  /** ISO 8601. */
  createdAt: string;
  updatedAt: string;
}
