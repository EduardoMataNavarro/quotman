import type { Routes } from '@angular/router';

export default [
  {
    path: '',
    title: 'Marca · Quotman',
    loadComponent: () => import('./pages/branding/branding').then((m) => m.BrandingPage),
  },
] satisfies Routes;
