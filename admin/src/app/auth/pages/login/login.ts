import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { Login as LoginAction } from '../../../../state/auth/auth.actions';
import { errorMessage } from '../../../data/utils/error-message';

/** Two-panel login, as in superadmin: form on the left, dark brand panel on the right. */
@Component({
  selector: 'qm-login',
  imports: [ReactiveFormsModule, InputTextModule, PasswordModule],
  templateUrl: './login.html',
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
