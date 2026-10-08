import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import {
  type ApplicationConfig,
  isDevMode,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { withNgxsReduxDevtoolsPlugin } from '@ngxs/devtools-plugin';
import { withNgxsLoggerPlugin } from '@ngxs/logger-plugin';
import { withNgxsStoragePlugin } from '@ngxs/storage-plugin';
import { provideStore } from '@ngxs/store';
import { ConfirmationService, MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import { AppState } from '../state/app/app.state';
import { AuthState } from '../state/auth/auth.state';
import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';
import { QuotmanPreset } from './theme/quotman-preset';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    provideRouter(routes, withComponentInputBinding()),
    providePrimeNG({
      ripple: false,
      theme: {
        preset: QuotmanPreset,
        options: {
          // `<html>.app-dark` is the one dark-mode switch: Tailwind's `dark:` variant and
          // PrimeNG both read it.
          darkModeSelector: '.app-dark',
          // Aura in its own layer, after Tailwind's base, so preflight never wipes
          // component borders and our component classes win without !important.
          cssLayer: { name: 'primeng', order: 'theme, base, primeng, components, utilities' },
        },
      },
    }),
    ConfirmationService,
    MessageService,
    provideStore(
      [AppState, AuthState],
      // UI preferences only; the session is an HttpOnly cookie.
      withNgxsStoragePlugin({ keys: ['app'] }),
      withNgxsReduxDevtoolsPlugin({ disabled: !isDevMode() }),
      withNgxsLoggerPlugin({ disabled: !isDevMode() }),
    ),
  ],
};
