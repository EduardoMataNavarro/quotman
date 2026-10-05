import { timestamp } from 'drizzle-orm/pg-core';

/** `timestamptz` read and written as ISO strings. */
export const isoTimestamp = (name: string) => timestamp(name, { withTimezone: true, mode: 'string' });

export const createdAt = () => isoTimestamp('created_at').notNull().defaultNow();
export const updatedAt = () => isoTimestamp('updated_at').notNull().defaultNow();
