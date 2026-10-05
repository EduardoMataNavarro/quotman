import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./features/public/landing').then((m) => m.Landing) },
  {
    path: 'muestra',
    title: 'Cotización de muestra · Quotman',
    loadComponent: () => import('./features/quotation/sample-page').then((m) => m.SamplePage),
  },
];
