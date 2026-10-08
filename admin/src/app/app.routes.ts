import type { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { guestGuard } from './guards/guest.guard';
import { AuthenticatedLayout } from './layouts/authenticated-layout/authenticated-layout';

/** Every area is lazy (`loadChildren` per feature folder), as in superadmin. */
export const routes: Routes = [
  {
    path: 'login',
    title: 'Iniciar sesión · Quotman',
    canActivate: [guestGuard],
    loadComponent: () => import('./auth/pages/login/login').then((m) => m.Login),
  },
  {
    path: '',
    canActivate: [authGuard],
    component: AuthenticatedLayout,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'quotations' },
      { path: 'quotations', loadChildren: () => import('./quotations/quotations.routes') },
      { path: 'clients', loadChildren: () => import('./clients/clients.routes') },
      { path: 'services', loadChildren: () => import('./service-catalog/service-catalog.routes') },
      { path: 'profile', loadChildren: () => import('./profile/profile.routes') },
      { path: 'branding', loadChildren: () => import('./branding/branding.routes') },
    ],
  },
  { path: '**', redirectTo: '' },
];
