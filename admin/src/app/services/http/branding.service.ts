import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, type Observable } from 'rxjs';
import type { Branding } from '../../data/dtos/branding';

/** `/api/admin/branding`: the global look of every quotation page and sheet. */
@Injectable({ providedIn: 'root' })
export class BrandingService {
  private http = inject(HttpClient);
  private base = '/api/admin/branding';

  get(): Observable<Branding> {
    return this.http.get<{ item: Branding }>(this.base).pipe(map((r) => r.item));
  }

  save(body: Pick<Branding, 'page' | 'sheet'>): Observable<Branding> {
    return this.http.put<{ item: Branding }>(this.base, body).pipe(map((r) => r.item));
  }
}
