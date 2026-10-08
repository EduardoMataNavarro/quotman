import { Hono } from 'hono';
import type { AppEnv } from '../../core/env';
import { validate } from '../../core/http';
import { CreateClientDto, ListClientsQueryDto, UpdateClientDto } from './clients.dto';

/** Mounted at `/api/admin/clients`, behind the admin guard. */
export const clientsRoutes = new Hono<AppEnv>()
  .get('/', validate('query', ListClientsQueryDto), async (c) => {
    const items = await c.get('modules').clients.list(c.req.valid('query'));
    return c.json({ items });
  })
  .get('/:id', async (c) => {
    const item = await c.get('modules').clients.get(c.req.param('id'));
    return c.json({ item });
  })
  .post('/', validate('json', CreateClientDto), async (c) => {
    const item = await c.get('modules').clients.create(c.req.valid('json'));
    return c.json({ item }, 201);
  })
  .patch('/:id', validate('json', UpdateClientDto), async (c) => {
    const item = await c.get('modules').clients.update(c.req.param('id'), c.req.valid('json'));
    return c.json({ item });
  })
  .delete('/:id', async (c) => {
    await c.get('modules').clients.remove(c.req.param('id'));
    return c.body(null, 204);
  });
