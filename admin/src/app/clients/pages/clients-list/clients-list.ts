import { Component } from '@angular/core';
import { CardModule } from 'primeng/card';

/** Phase 5 builds this page (PLAN.md §9). */
@Component({
  selector: 'qm-clients-list',
  imports: [CardModule],
  template: `
    <h1 class="page-title">Clientes</h1>
    <p-card>En construcción.</p-card>
  `,
})
export class ClientsList {}
