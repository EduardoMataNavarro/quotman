export const QuotationStatus = {
  Draft: 'draft',
  Sent: 'sent',
  Viewed: 'viewed',
  Accepted: 'accepted',
  Rejected: 'rejected',
  ChangesRequested: 'changes_requested',
} as const;
export type QuotationStatus = (typeof QuotationStatus)[keyof typeof QuotationStatus];

/** Accepted and rejected quotations are read-only; changing one means duplicating it. */
export const FROZEN_STATUSES: readonly QuotationStatus[] = [QuotationStatus.Accepted, QuotationStatus.Rejected];

export const QuotationActionType = {
  Accepted: 'accepted',
  Rejected: 'rejected',
  ChangesRequested: 'changes_requested',
} as const;
export type QuotationActionType = (typeof QuotationActionType)[keyof typeof QuotationActionType];

export const QuotationEventType = {
  Sent: 'sent',
  Viewed: 'viewed',
  Downloaded: 'downloaded',
} as const;
export type QuotationEventType = (typeof QuotationEventType)[keyof typeof QuotationEventType];
