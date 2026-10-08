import { Component } from '@angular/core';

@Component({
  selector: 'qm-landing',
  template: `
    <main class="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-4">
      <section class="rounded-card bg-silver-hi p-8 shadow-sm">
        <h1 class="text-total leading-tight tracking-tight">Quotman</h1>
        <p class="mt-2 text-desc text-slate">
          Cotizaciones que el cliente abre, revisa y aprueba en línea.
        </p>
      </section>
    </main>
  `,
})
export class Landing {}
