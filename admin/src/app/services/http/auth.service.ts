import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, type Observable } from 'rxjs';
import type { AuthenticatedAdmin, ChangePasswordRequest, LoginRequest } from '../../data/dtos/auth';

/** `/api/admin/auth`. The session is an HttpOnly cookie: nothing here stores a token. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private base = '/api/admin/auth';

  login(body: LoginRequest): Observable<AuthenticatedAdmin> {
    return this.http.post<{ admin: AuthenticatedAdmin }>(`${this.base}/login`, body).pipe(map((r) => r.admin));
  }

  me(): Observable<AuthenticatedAdmin> {
    return this.http.get<{ admin: AuthenticatedAdmin }>(`${this.base}/me`).pipe(map((r) => r.admin));
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.base}/logout`, null);
  }

  changePassword(body: ChangePasswordRequest): Observable<void> {
    return this.http.post<void>(`${this.base}/change-password`, body);
  }
}
