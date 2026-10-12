import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';
import { Login as LoginAction } from '../../../../state/auth/auth.actions';
import { errorMessage } from '../../../data/utils/error-message';

/** Single login card on the brushed backdrop, plain PrimeNG components. */
@Component({
  selector: 'qm-login',
  imports: [ReactiveFormsModule, ButtonModule, CardModule, InputTextModule, MessageModule, PasswordModule],
  templateUrl: './login.html',
  // Black primary on this page only. Aura's component tokens are resolved on :root, so
  // overriding `--p-primary-color` here wouldn't reach them: override the component ones.
  styles: `
    main {
      --qm-primary: var(--p-zinc-950);
      --qm-primary-hover: var(--p-zinc-800);
      --qm-primary-active: var(--p-zinc-700);
      --qm-primary-contrast: #ffffff;
    }
    :host-context(.app-dark) main {
      --qm-primary: var(--p-zinc-50);
      --qm-primary-hover: var(--p-zinc-200);
      --qm-primary-active: var(--p-zinc-300);
      --qm-primary-contrast: var(--p-zinc-950);
    }
    main {
      --p-button-primary-background: var(--qm-primary);
      --p-button-primary-hover-background: var(--qm-primary-hover);
      --p-button-primary-active-background: var(--qm-primary-active);
      --p-button-primary-border-color: var(--qm-primary);
      --p-button-primary-hover-border-color: var(--qm-primary-hover);
      --p-button-primary-active-border-color: var(--qm-primary-active);
      --p-button-primary-color: var(--qm-primary-contrast);
      --p-button-primary-hover-color: var(--qm-primary-contrast);
      --p-button-primary-active-color: var(--qm-primary-contrast);
      --p-button-primary-focus-ring-color: var(--qm-primary);
      --p-inputtext-focus-border-color: var(--qm-primary);
    }
  `,
})
export class Login {
  private fb = inject(FormBuilder);
  private store = inject(Store);
  private router = inject(Router);

  protected form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  protected busy = signal(false);
  protected error = signal<string | null>(null);

  protected submit(): void {
    if (this.form.invalid || this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    this.store.dispatch(new LoginAction(this.form.getRawValue())).subscribe({
      next: () => void this.router.navigateByUrl('/'),
      error: (err) => {
        this.busy.set(false);
        this.error.set(errorMessage(err, 'No se pudo iniciar sesión. Inténtalo de nuevo.'));
      },
    });
  }
}
