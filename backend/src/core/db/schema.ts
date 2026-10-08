// Every module's model, re-exported so Drizzle and drizzle-kit see the whole schema.
// The one place allowed to import another module's model (PLAN.md §8.1).
export * from '../../modules/access/access.model';
export * from '../../modules/auth/auth.model';
export * from '../../modules/branding/branding.model';
export * from '../../modules/clients/clients.model';
export * from '../../modules/issuer/issuer.model';
export * from '../../modules/quotations/quotations.model';
export * from '../../modules/offered-services/offered-services.model';
