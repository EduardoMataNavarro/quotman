import { Hono } from 'hono';
import type { AppEnv } from '../../core/env';
import { validate } from '../../core/http';
import { CreateCatalogItemDto, ListCatalogQueryDto, UpdateCatalogItemDto } from './catalog.dto';

/** Mounted at `/api/admin/catalog`, behind the admin guard. */
export const catalogRoutes = new Hono<AppEnv>()
  .get('/', validate('query', ListCatalogQueryDto), async (c) => {
    const items = await c.get('services').catalog.list(c.req.valid('query'));
    return c.json({ items });
  })
  .get('/:id', async (c) => {
    const item = await c.get('services').catalog.get(c.req.param('id'));
    return c.json({ item });
  })
  .post('/', validate('json', CreateCatalogItemDto), async (c) => {
    const item = await c.get('services').catalog.create(c.req.valid('json'));
    return c.json({ item }, 201);
  })
  .patch('/:id', validate('json', UpdateCatalogItemDto), async (c) => {
    const item = await c.get('services').catalog.update(c.req.param('id'), c.req.valid('json'));
    return c.json({ item });
  });
