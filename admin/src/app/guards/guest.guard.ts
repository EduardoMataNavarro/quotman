import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { Store } from '@ngxs/store';
import { catchError, map, of } from 'rxjs';
import { LoadMe } from '../../state/auth/auth.actions';
import { AuthState } from '../../state/auth/auth.state';

/** Keeps a signed-in admin out of /login. */
export const guestGuard: CanActivateFn = () => {
  const store = inject(Store);
  const router = inject(Router);
  if (store.selectSnapshot(AuthState.isAuthenticated)) return router.parseUrl('/');
  return store.dispatch(new LoadMe()).pipe(
    map(() => router.parseUrl('/')),
    catchError(() => of(true)),
  );
};
