import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'qm-landing',
  imports: [RouterLink],
  template: `
    <main class="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-4">
      <section class="rounded-card bg-silver-hi p-8 shadow-sm">
        <h1 class="text-total leading-tight tracking-tight">Quotman</h1>
        <p class="mt-2 text-desc text-slate">
          Cotizaciones que el cliente abre, revisa y aprueba en línea.
        </p>
        <a routerLink="/muestra" class="mt-4 inline-block text-desc font-medium text-ink underline underline-offset-4">
          Ver una cotización de muestra
        </a>
      </section>
    </main>
  `,
})
export class Landing {}
