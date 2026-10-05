import { defineConfig } from 'drizzle-kit';

// `npm run db:generate` writes SQL into drizzle/ (no connection needed);
// `npm run db:migrate` applies it to the database in DATABASE_URL (a Neon branch).
export default defineConfig({
  dialect: 'postgresql',
  schema: './backend/core/db/schema.ts',
  out: './drizzle',
  dbCredentials: { url: process.env['DATABASE_URL'] ?? '' },
});
