// `npm run db:seed`: seeds the database in DATABASE_URL (read from .dev.vars).
import { buildServices } from '../services';
import { seedOnp } from './onp';

const url = process.env['DATABASE_URL'];
if (!url) {
  console.error('DATABASE_URL is not set. Add it to .dev.vars.');
  process.exit(1);
}

const result = await seedOnp(buildServices({ DATABASE_URL: url }));
console.log(result.seeded ? `Seeded ${result.folio}.` : 'Database already has quotations; nothing seeded.');
