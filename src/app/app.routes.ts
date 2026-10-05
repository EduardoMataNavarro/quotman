import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./features/public/landing').then((m) => m.Landing) },
];
