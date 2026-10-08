import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Action, Selector, State, type StateContext } from '@ngxs/store';
import { catchError, finalize, tap, throwError } from 'rxjs';
import type { AuthenticatedAdmin } from '../../app/data/dtos/auth';
import { AuthService } from '../../app/services/http/auth.service';
import { ChangePassword, LoadMe, Login, Logout, SessionExpired } from './auth.actions';

export enum MeStatus {
  Idle = 'idle',
  Loading = 'loading',
  Loaded = 'loaded',
  Error = 'error',
}

/**
 * Nothing here persists: the session is an HttpOnly cookie the app can't read, so
 * "signed in" means `/api/admin/auth/me` answered. Superadmin keeps a bearer token in
 * storage instead; quotman deliberately doesn't (decision 2026-10-05).
 */
export interface AuthStateModel {
  me: AuthenticatedAdmin | null;
  meStatus: MeStatus;
}

@State<AuthStateModel>({ name: 'auth', defaults: { me: null, meStatus: MeStatus.Idle } })
@Injectable()
export class AuthState {
  private auth = inject(AuthService);
  private router = inject(Router);

  @Selector() static me(s: AuthStateModel): AuthenticatedAdmin | null {
    return s.me;
  }
  @Selector() static meStatus(s: AuthStateModel): MeStatus {
    return s.meStatus;
  }
  @Selector() static isAuthenticated(s: AuthStateModel): boolean {
    return s.me !== null;
  }

  @Action(Login)
  login(ctx: StateContext<AuthStateModel>, { payload }: Login) {
    return this.auth.login(payload).pipe(tap((me) => ctx.patchState({ me, meStatus: MeStatus.Loaded })));
  }

  @Action(LoadMe)
  loadMe(ctx: StateContext<AuthStateModel>) {
    ctx.patchState({ meStatus: MeStatus.Loading });
    return this.auth.me().pipe(
      tap((me) => ctx.patchState({ me, meStatus: MeStatus.Loaded })),
      catchError((err) => {
        ctx.patchState({ me: null, meStatus: err?.status === 401 ? MeStatus.Idle : MeStatus.Error });
        return throwError(() => err);
      }),
    );
  }

  @Action(Logout)
  logout(ctx: StateContext<AuthStateModel>) {
    return this.auth.logout().pipe(
      catchError(() => []),
      finalize(() => ctx.dispatch(new SessionExpired())),
    );
  }

  @Action(SessionExpired)
  sessionExpired(ctx: StateContext<AuthStateModel>) {
    ctx.setState({ me: null, meStatus: MeStatus.Idle });
    void this.router.navigateByUrl('/login');
  }

  @Action(ChangePassword)
  changePassword(_ctx: StateContext<AuthStateModel>, { payload }: ChangePassword) {
    return this.auth.changePassword(payload);
  }
}
