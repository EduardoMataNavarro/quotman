// MIRRORED: identical copies live in backend/src/shared/fixtures/onp.ts and admin/src/app/shared/quotation/fixtures/onp.ts.
// Change all three together.
import type { QuotationDocument } from '../document';

/** The ONP quotation's structure with a fictional issuer: test fixture and PDF reference. */
export const onpQuotation: QuotationDocument = {
  folio: '2026-001.1',
  issuedOn: '2026-10-04',
  validUntil: '2026-11-03',
  currency: 'MXN',
  taxRateBp: 1600,
  issuer: {
    name: 'Emisor de Prueba',
    role: 'Desarrollo de software',
    email: 'emisor@example.com',
    phone: '+52 55 0000 0000',
    razonSocial: 'EMISOR DE PRUEBA',
    rfc: 'XAXX010101000',
    location: 'Ciudad de México, México',
    logoUrl: null,
  },
  sections: [
    {
      name: 'Arquitectura',
      lines: [
        {
          id: 'onp-1',
          title: 'Documentación y diseño de diagramas de flujo',
          description:
            'Modelado de requerimientos y procesos internos de la aplicación en diagramas de flujo y documentos.',
          qty: 1,
          unitPriceCents: 500_000,
        },
        {
          id: 'onp-2',
          title: 'Diseño e implementación de diagramas de bases de datos',
          description:
            'Creación del modelo entidad-relación del negocio, normalización y definición del esquema.',
          qty: 1,
          unitPriceCents: 500_000,
        },
      ],
    },
    {
      name: 'Desarrollo',
      lines: [
        {
          id: 'onp-3',
          title: 'Implementación del sistema para solicitudes ONP (cliente)',
          description:
            'Desarrollo de la interfaz de usuario para la captura y el seguimiento de solicitudes.',
          qty: 1,
          unitPriceCents: 3_000_000,
        },
        {
          id: 'onp-4',
          title: 'Implementación del sistema para solicitudes ONP (servidor)',
          description:
            'Desarrollo de la API, lógica de negocio, autenticación y autorización, persistencia, modelado de datos, integración de API de terceros, pruebas unitarias, optimización y manejo de procesos en segundo plano.',
          qty: 1,
          unitPriceCents: 3_000_000,
        },
      ],
    },
    {
      name: 'Entrega',
      lines: [
        {
          id: 'onp-5',
          title: 'Manuales de implementación y despliegue',
          description: 'Guías técnicas de instalación, configuración y puesta en producción.',
          qty: 1,
          unitPriceCents: 500_000,
        },
      ],
    },
  ],
  terms: [
    'Condiciones de pago: 50% de anticipo al iniciar el proyecto y 50% a la entrega final.',
    'Los precios no incluyen costos de infraestructura, hosting ni licencias de terceros.',
    'Los cambios fuera del alcance descrito se cotizarán por separado.',
    'Vigencia de la cotización: 30 días naturales.',
  ],
  branding: { pageCss: '', sheetCss: '' },
};
