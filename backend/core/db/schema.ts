// Every module's model, re-exported so Drizzle and drizzle-kit see the whole schema.
// The one place allowed to import another module's model (PLAN.md §8.1).
export * from '../../modules/catalog/catalog.model';
