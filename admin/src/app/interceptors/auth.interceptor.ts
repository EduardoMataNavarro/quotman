import type { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Store } from '@ngxs/store';
import { MessageService } from 'primeng/api';
import { catchError, throwError } from 'rxjs';
import { SessionExpired } from '../../state/auth/auth.actions';

/** Paths whose 401 is an answer, not an expired session. */
const OWN_401 = ['/api/admin/auth/login', '/api/admin/auth/me'];

/**
 * The browser sends the HttpOnly session cookie on its own (same origin). The backend is
 * the sole authority: 401 → back to the login, 403 → toast and stay.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const store = inject(Store);
  const messages = inject(MessageService);
  return next(req).pipe(
    catchError((err) => {
      if (err?.status === 401 && !OWN_401.some((path) => req.url.endsWith(path))) {
        store.dispatch(new SessionExpired());
      } else if (err?.status === 403) {
        messages.add({ severity: 'warn', summary: 'Acceso denegado', detail: 'No tienes permiso para realizar esta acción.' });
      }
      return throwError(() => err);
    }),
  );
};
