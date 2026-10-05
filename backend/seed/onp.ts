import { onpQuotation } from '../../shared/fixtures/onp';
import type { Services } from '../services';

/**
 * Issuer, a client, the catalog and the ONP quotation, built through the services so the
 * seed follows the same rules as the API. Does nothing if any quotation exists.
 */
export async function seedOnp(services: Services): Promise<{ seeded: boolean; folio?: string }> {
  if ((await services.quotations.list({})).length > 0) return { seeded: false };

  const { logoUrl: _logo, ...issuer } = onpQuotation.issuer;
  if (!(await services.issuer.get())) await services.issuer.save(issuer);

  const client = await services.clients.create({
    name: 'Cliente ONP',
    company: 'ONP',
    // Placeholder until the real contact is known.
    email: 'contacto@onp.example',
  });

  const stages = await Promise.all(
    onpQuotation.stages.map(async (stage) => ({
      name: stage.name,
      lines: await Promise.all(
        stage.lines.map(async (line) => {
          const service = await services.catalog.create({
            name: line.title,
            description: line.description,
            unitPriceCents: line.unitPriceCents,
            unit: 'servicio',
            defaultStage: stage.name,
          });
          return { serviceId: service.id, qty: line.qty };
        }),
      ),
    })),
  );

  const quotation = await services.quotations.create({
    clientId: client.id,
    title: 'Sistema de solicitudes ONP',
    issuedOn: onpQuotation.issuedOn,
    validUntil: onpQuotation.validUntil,
    taxRateBp: onpQuotation.taxRateBp,
    terms: onpQuotation.terms,
    stages,
  });
  return { seeded: true, folio: quotation.folio };
}
