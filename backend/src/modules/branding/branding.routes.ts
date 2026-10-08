import { Hono } from 'hono';
import type { AppEnv } from '../../core/env';
import { validate } from '../../core/http';
import { SaveBrandingDto } from './branding.dto';

/** Mounted at `/api/admin/branding`, behind the admin guard. */
export const brandingRoutes = new Hono<AppEnv>()
  .get('/', async (c) => c.json({ item: await c.get('modules').branding.get() }))
  .put('/', validate('json', SaveBrandingDto), async (c) => {
    const item = await c.get('modules').branding.save(c.req.valid('json'));
    return c.json({ item });
  });
