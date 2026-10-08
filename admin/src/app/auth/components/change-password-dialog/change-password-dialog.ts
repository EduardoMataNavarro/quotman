import { Component, inject, model, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngxs/store';
import { MessageService } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { PasswordModule } from 'primeng/password';
import { ChangePassword } from '../../../../state/auth/auth.actions';
import { errorMessage } from '../../../data/utils/error-message';

/** Changing the password keeps this session and signs out every other one (API rule). */
@Component({
  selector: 'qm-change-password-dialog',
  imports: [ReactiveFormsModule, DialogModule, PasswordModule],
  templateUrl: './change-password-dialog.html',
})
export class ChangePasswordDialog {
  private fb = inject(FormBuilder);
  private store = inject(Store);
  private messages = inject(MessageService);

  readonly visible = model(false);

  protected form = this.fb.nonNullable.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(12)]],
  });

  protected busy = signal(false);
  protected error = signal<string | null>(null);

  protected close(): void {
    this.visible.set(false);
    this.form.reset();
    this.error.set(null);
  }

  protected submit(): void {
    if (this.form.invalid || this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    this.store.dispatch(new ChangePassword(this.form.getRawValue())).subscribe({
      next: () => {
        this.busy.set(false);
        this.close();
        this.messages.add({ severity: 'success', summary: 'Contraseña actualizada', detail: 'Cerramos tus otras sesiones.' });
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(errorMessage(err, 'No se pudo cambiar la contraseña.'));
      },
    });
  }
}
