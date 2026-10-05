import { zValidator } from '@hono/zod-validator';
import type { ValidationTargets } from 'hono';
import type { ZodType } from 'zod';
import { ValidationError } from './errors';

/**
 * `zValidator` that throws a `ValidationError` instead of answering on its own, so every
 * invalid request gets the same error shape from `app.onError`.
 */
export function validate<Target extends keyof ValidationTargets, Schema extends ZodType>(
  target: Target,
  schema: Schema,
) {
  return zValidator(target, schema, (result) => {
    if (!result.success) {
      throw new ValidationError(undefined, result.error.issues);
    }
  });
}
