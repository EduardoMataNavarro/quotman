import type { Routes } from '@angular/router';

export default [
  {
    path: '',
    title: 'Perfil del emisor · Quotman',
    loadComponent: () => import('./pages/profile/profile').then((m) => m.Profile),
  },
] satisfies Routes;
