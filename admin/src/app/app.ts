import { DOCUMENT } from '@angular/common';
import { Component, effect, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { select } from '@ngxs/store';
import { ToastModule } from 'primeng/toast';
import { AppState } from '../state/app/app.state';

@Component({
  selector: 'qm-root',
  imports: [RouterOutlet, ToastModule],
  template: '<router-outlet /><p-toast position="bottom-right" />',
})
export class App {
  private darkMode = select(AppState.darkMode);

  constructor() {
    const html = inject(DOCUMENT).documentElement;
    effect(() => html.classList.toggle('app-dark', this.darkMode()));
  }
}
