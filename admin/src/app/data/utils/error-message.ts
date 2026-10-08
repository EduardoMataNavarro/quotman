import type { HttpErrorResponse } from '@angular/common/http';
import type { ApiErrorBody } from '../dtos/auth';

/** The API's Spanish message when it sent one, otherwise the fallback. Validation errors
 *  include each issue's message ("Propiedad no permitida: position."). */
export function errorMessage(err: unknown, fallback: string): string {
  const body = (err as HttpErrorResponse | undefined)?.error as Partial<ApiErrorBody> | undefined;
  const issues = Array.isArray(body?.error?.details)
    ? (body.error.details as { message?: string }[]).map((issue) => issue.message).filter(Boolean)
    : [];
  if (issues.length) return issues.join(' ');
  return body?.error?.message ?? fallback;
}
