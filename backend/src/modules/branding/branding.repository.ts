import { eq } from 'drizzle-orm';
import type { Db } from '../../core/db';
import { toIso } from '../../core/db/columns';
import { branding } from './branding.model';
import type { Branding } from './branding.type';

export interface BrandingRepository {
  get(): Promise<Branding | null>;
  upsert(value: Branding & { updatedAt: string }): Promise<void>;
}

export function createBrandingRepository(db: Db): BrandingRepository {
  return {
    async get() {
      const [row] = await db.select().from(branding).where(eq(branding.id, 1)).limit(1);
      if (!row) return null;
      return {
        page: { gradient: row.pageGradient, css: row.pageCss },
        sheet: { gradient: row.sheetGradient, css: row.sheetCss },
        updatedAt: toIso(row.updatedAt),
      };
    },

    async upsert({ page, sheet, updatedAt }) {
      const values = {
        pageGradient: page.gradient,
        pageCss: page.css,
        sheetGradient: sheet.gradient,
        sheetCss: sheet.css,
        updatedAt,
      };
      await db.insert(branding).values({ id: 1, ...values }).onConflictDoUpdate({ target: branding.id, set: values });
    },
  };
}
