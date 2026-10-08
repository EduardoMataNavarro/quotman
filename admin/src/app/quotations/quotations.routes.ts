import type { Routes } from '@angular/router';

export default [
  {
    path: '',
    title: 'Cotizaciones · Quotman',
    loadComponent: () => import('./pages/quotations-list/quotations-list').then((m) => m.QuotationsList),
  },
] satisfies Routes;
