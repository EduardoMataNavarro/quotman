/**
 * draft → sent → accepted | declined | changes_requested; any status → archived (and back).
 * changes_requested is edited and sent again as the next revision.
 */
export const QuotationStatus = {
  Draft: 'draft',
  Sent: 'sent',
  Accepted: 'accepted',
  Declined: 'declined',
  ChangesRequested: 'changes_requested',
  Archived: 'archived',
} as const;
export type QuotationStatus = (typeof QuotationStatus)[keyof typeof QuotationStatus];

/** UI labels (es-MX). */
export const QUOTATION_STATUS_LABELS: Record<QuotationStatus, string> = {
  draft: 'Borrador',
  sent: 'Enviada para revisión',
  accepted: 'Aceptada',
  declined: 'Rechazada',
  changes_requested: 'Cambios solicitados',
  archived: 'Archivada',
};

/** Read-only: changing one means duplicating it (or unarchiving, for archived). */
export const FROZEN_STATUSES: readonly QuotationStatus[] = [
  QuotationStatus.Accepted,
  QuotationStatus.Declined,
  QuotationStatus.Archived,
];

export const QuotationActionType = {
  Accepted: 'accepted',
  Declined: 'declined',
  ChangesRequested: 'changes_requested',
} as const;
export type QuotationActionType = (typeof QuotationActionType)[keyof typeof QuotationActionType];

export const QuotationEventType = {
  Sent: 'sent',
  Downloaded: 'downloaded',
} as const;
export type QuotationEventType = (typeof QuotationEventType)[keyof typeof QuotationEventType];
