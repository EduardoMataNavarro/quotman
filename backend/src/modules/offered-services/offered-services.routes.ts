import { Hono } from 'hono';
import type { AppEnv } from '../../core/env';
import { validate } from '../../core/http';
import { CreateOfferedServiceDto, ListOfferedServicesQueryDto, UpdateOfferedServiceDto } from './offered-services.dto';

/** Mounted at `/api/admin/offered-services`, behind the admin guard. */
export const offeredServicesRoutes = new Hono<AppEnv>()
  .get('/', validate('query', ListOfferedServicesQueryDto), async (c) => {
    const items = await c.get('modules').offeredServices.list(c.req.valid('query'));
    return c.json({ items });
  })
  .get('/:id', async (c) => {
    const item = await c.get('modules').offeredServices.get(c.req.param('id'));
    return c.json({ item });
  })
  .post('/', validate('json', CreateOfferedServiceDto), async (c) => {
    const item = await c.get('modules').offeredServices.create(c.req.valid('json'));
    return c.json({ item }, 201);
  })
  .patch('/:id', validate('json', UpdateOfferedServiceDto), async (c) => {
    const item = await c.get('modules').offeredServices.update(c.req.param('id'), c.req.valid('json'));
    return c.json({ item });
  })
  .delete('/:id', async (c) => {
    await c.get('modules').offeredServices.remove(c.req.param('id'));
    return c.body(null, 204);
  });
