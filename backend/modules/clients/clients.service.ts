import type { Clock } from '../../core/clock';
import { ConflictError, NotFoundError } from '../../core/errors';
import type { Ids } from '../../core/ids';
import { stripUndefined } from '../../core/objects';
import type { CreateClientDto, UpdateClientDto } from './clients.dto';
import type { ClientsRepository } from './clients.repository';
import type { Client } from './clients.type';

export interface ClientsServiceDeps {
  repo: ClientsRepository;
  clock: Clock;
  ids: Ids;
}

export function createClientsService({ repo, clock, ids }: ClientsServiceDeps) {
  async function get(id: string): Promise<Client> {
    const client = await repo.findById(id);
    if (!client) throw new NotFoundError('Ese cliente no existe.', 'client_not_found');
    return client;
  }

  return {
    list: (filter: { q?: string }) => repo.list(filter),

    get,

    /** Clients by id, for lists that show a name per row. Unknown ids are skipped. */
    getMany: (ids: string[]) => repo.findByIds([...new Set(ids)]),

    async create(input: CreateClientDto): Promise<Client> {
      const now = clock.now().toISOString();
      const client: Client = {
        id: ids.id(),
        name: input.name,
        company: input.company ?? null,
        email: input.email.toLowerCase(),
        rfc: input.rfc ?? null,
        createdAt: now,
        updatedAt: now,
      };
      await repo.insert(client);
      return client;
    },

    async update(id: string, input: UpdateClientDto): Promise<Client> {
      const current = await get(id);
      const changes = stripUndefined({ ...input, email: input.email?.toLowerCase() });
      const next: Client = { ...current, ...changes, updatedAt: clock.now().toISOString() };
      const { id: _id, createdAt: _createdAt, ...row } = next;
      await repo.update(id, row);
      return next;
    },

    async remove(id: string): Promise<void> {
      await get(id);
      if ((await repo.delete(id)) === 'referenced') {
        throw new ConflictError(
          'Este cliente tiene cotizaciones; no se puede eliminar.',
          'client_has_quotations',
        );
      }
    },
  };
}

export type ClientsService = ReturnType<typeof createClientsService>;
