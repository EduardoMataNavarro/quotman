import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, type UrlTree } from '@angular/router';
import { provideStore } from '@ngxs/store';
import { firstValueFrom, isObservable, type Observable } from 'rxjs';
import { AuthState } from '../../state/auth/auth.state';
import { authGuard } from './auth.guard';

function run(): Promise<boolean | UrlTree> {
  const result = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));
  return isObservable(result) ? firstValueFrom(result as Observable<boolean | UrlTree>) : Promise.resolve(result as boolean | UrlTree);
}

describe('authGuard', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideStore([AuthState]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  it('lets the admin in when /me answers', async () => {
    const pending = run();
    http.expectOne('/api/admin/auth/me').flush({ admin: { id: 'a', email: 'a@example.com', lastLoginAt: null } });
    expect(await pending).toBe(true);
  });

  it('sends to /login when the session cookie is missing or expired', async () => {
    const pending = run();
    http.expectOne('/api/admin/auth/me').flush({ error: { code: 'unauthorized' } }, { status: 401, statusText: 'Unauthorized' });
    const result = await pending;
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/login');
  });
});
