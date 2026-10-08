import type { ContentfulStatusCode } from 'hono/utils/http-status';

/**
 * Domain errors thrown by services. `app.onError` turns them into
 * `{ error: { code, message, details? } }` with the matching status; routes never build
 * error responses by hand. `message` is Spanish because the UI may show it as is.
 */
export class AppError extends Error {
  constructor(
    readonly status: ContentfulStatusCode,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Los datos enviados no son válidos.', details?: unknown) {
    super(422, 'validation_failed', message, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Inicia sesión para continuar.') {
    super(401, 'unauthorized', message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'No tienes acceso a este recurso.') {
    super(403, 'forbidden', message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'No encontramos lo que buscas.', code = 'not_found') {
    super(404, code, message);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, code = 'conflict') {
    super(409, code, message);
  }
}

export class GoneError extends AppError {
  constructor(message = 'Este enlace ya no está disponible.', code = 'gone') {
    super(410, code, message);
  }
}
