import type { Routes } from '@angular/router';

export default [
  {
    path: '',
    title: 'Clientes · Quotman',
    loadComponent: () => import('./pages/clients-list/clients-list').then((m) => m.ClientsList),
  },
] satisfies Routes;
