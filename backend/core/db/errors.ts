/** Postgres error code, whether Drizzle wrapped the driver error or not. */
function pgCode(error: unknown): string | undefined {
  for (let e: unknown = error; e && typeof e === 'object'; e = (e as { cause?: unknown }).cause) {
    const code = (e as { code?: unknown }).code;
    if (typeof code === 'string' && /^[0-9A-Z]{5}$/.test(code)) return code;
  }
  return undefined;
}

/** 23503 for NO ACTION foreign keys, 23001 for ON DELETE RESTRICT. */
export const isForeignKeyViolation = (error: unknown) => ['23503', '23001'].includes(pgCode(error) ?? '');
export const isUniqueViolation = (error: unknown) => pgCode(error) === '23505';
