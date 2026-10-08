import type { Routes } from '@angular/router';

export default [
  {
    path: '',
    title: 'Servicios · Quotman',
    loadComponent: () => import('./pages/services-list/services-list').then((m) => m.ServicesList),
  },
] satisfies Routes;
