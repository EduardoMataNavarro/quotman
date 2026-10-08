import { Hono } from 'hono';
import type { AppEnv } from '../../core/env';
import { validate } from '../../core/http';
import { SaveIssuerDto } from './issuer.dto';

/** Mounted at `/api/admin/issuer`, behind the admin guard. */
export const issuerRoutes = new Hono<AppEnv>()
  .get('/', async (c) => {
    const item = await c.get('modules').issuer.get();
    return c.json({ item });
  })
  .put('/', validate('json', SaveIssuerDto), async (c) => {
    const item = await c.get('modules').issuer.save(c.req.valid('json'));
    return c.json({ item });
  });
