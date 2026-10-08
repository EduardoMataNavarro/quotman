import { Hono } from 'hono';
import type { AppEnv } from '../../core/env';
import { validate } from '../../core/http';
import { ListQuotationsQueryDto, SaveQuotationDto } from './quotations.dto';

/** Mounted at `/api/admin/quotations`, behind the admin guard. */
export const quotationsAdminRoutes = new Hono<AppEnv>()
  .get('/', validate('query', ListQuotationsQueryDto), async (c) => {
    const items = await c.get('modules').quotations.list(c.req.valid('query'));
    return c.json({ items });
  })
  .get('/:id', async (c) => {
    const item = await c.get('modules').quotations.get(c.req.param('id'));
    return c.json({ item });
  })
  .get('/:id/document', async (c) => {
    const document = await c.get('modules').quotations.document(c.req.param('id'));
    return c.json({ document });
  })
  .post('/', validate('json', SaveQuotationDto), async (c) => {
    const item = await c.get('modules').quotations.create(c.req.valid('json'));
    return c.json({ item }, 201);
  })
  .put('/:id', validate('json', SaveQuotationDto), async (c) => {
    const item = await c.get('modules').quotations.save(c.req.param('id'), c.req.valid('json'));
    return c.json({ item });
  })
  .post('/:id/archive', async (c) => {
    const item = await c.get('modules').quotations.archive(c.req.param('id'));
    return c.json({ item });
  })
  .post('/:id/unarchive', async (c) => {
    const item = await c.get('modules').quotations.unarchive(c.req.param('id'));
    return c.json({ item });
  })
  .post('/:id/duplicate', async (c) => {
    const item = await c.get('modules').quotations.duplicate(c.req.param('id'));
    return c.json({ item }, 201);
  })
  .delete('/:id', async (c) => {
    await c.get('modules').quotations.remove(c.req.param('id'));
    return c.body(null, 204);
  });
