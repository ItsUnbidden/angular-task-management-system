import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { UserService } from '../../../service/user.service';
import { ConfirmDialog } from '../../util/confirm-dialog/confirm-dialog';
import { HttpErrorResponse } from '@angular/common/http';
import { GeneralApiError, UserDeleteResponse } from '../../../models';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { EMPTY, switchMap } from 'rxjs';

@Component({
  selector: 'app-delete-account-dialog',
  imports: [MatFormFieldModule, ReactiveFormsModule, MatProgressSpinnerModule, MatDialogModule, MatInputModule, MatButtonModule],
  templateUrl: './delete-account-dialog.html',
  styleUrl: './delete-account-dialog.css',
})
export class DeleteAccountDialog {
  private readonly userService = inject(UserService);

  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);

  readonly credentialsForm = new FormGroup({
    username: new FormControl('', {
      validators: [
        Validators.required
      ]
    }),
    password: new FormControl('', {
      validators: [
        Validators.required
      ]
    })
  });

  constructor(private readonly dialogRef: MatDialogRef<DeleteAccountDialog, UserDeleteResponse>,
              private readonly dialog: MatDialog) {}

  onSubmit() {
    const username = this.credentialsForm.value.username;
    const password = this.credentialsForm.value.password;

    if (username && password) {
      this.dialog.open(ConfirmDialog, {
        data: {
          title: 'Confirm',
          message: 'Are you sure you want to delete your account? This action is irreversible.'
        },
        disableClose: true,
        width: '420px'
      })
      .afterClosed().pipe(switchMap(confirmed => {
        if (confirmed) {
          this.isLoading.set(true);
          this.error.set(null);
          return this.userService.deleteUser({ username, password });
        }
        return EMPTY;
      }))
      .subscribe({
        next: (response: UserDeleteResponse) => {
          this.isLoading.set(false);
          this.dialogRef.close(response);
        },
        error: (err: HttpErrorResponse) => {
          const error = err.error as GeneralApiError;

          this.error.set(error ? error.errors[0] : 'Unknown error occured while attempting to delete the user.');
          this.isLoading.set(false);
        }
      });
    }
  }

  onClose() {
    this.dialogRef.close();
  }
}
