import { timestamp } from 'drizzle-orm/pg-core';

/** `timestamptz` read and written as ISO strings. */
export const isoTimestamp = (name: string) => timestamp(name, { withTimezone: true, mode: 'string' });

export const createdAt = () => isoTimestamp('created_at').notNull().defaultNow();
export const updatedAt = () => isoTimestamp('updated_at').notNull().defaultNow();
/** Soft delete: set once, never cleared; every list and lookup filters it out. */
export const deletedAt = () => isoTimestamp('deleted_at');

/** ISO string from a timestamp column value (drivers differ in format), keeping null. */
export function toIso<T extends string | null>(value: T): T {
  return (value === null ? null : new Date(value).toISOString()) as T;
}
