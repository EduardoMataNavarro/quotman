export const QuotationStatus = {
  Draft: 'draft',
  Sent: 'sent',
  Viewed: 'viewed',
  Accepted: 'accepted',
  Rejected: 'rejected',
  ChangesRequested: 'changes_requested',
} as const;
export type QuotationStatus = (typeof QuotationStatus)[keyof typeof QuotationStatus];
