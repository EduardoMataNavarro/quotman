import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { Store } from '@ngxs/store';
import { catchError, map, of } from 'rxjs';
import { LoadMe } from '../../state/auth/auth.actions';
import { AuthState } from '../../state/auth/auth.state';

/** Asks the API on first entry (the cookie is HttpOnly); reuses the answer afterwards. */
export const authGuard: CanActivateFn = () => {
  const store = inject(Store);
  const router = inject(Router);
  if (store.selectSnapshot(AuthState.isAuthenticated)) return true;
  return store.dispatch(new LoadMe()).pipe(
    map(() => true),
    catchError(() => of(router.parseUrl('/login'))),
  );
};
