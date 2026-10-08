export const SessionKind = {
  Admin: 'admin',
  Quotation: 'quotation',
} as const;
export type SessionKind = (typeof SessionKind)[keyof typeof SessionKind];
