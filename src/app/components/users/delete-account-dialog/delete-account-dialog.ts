import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ConfirmDialog } from '../../util/confirm-dialog/confirm-dialog';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { EMPTY, switchMap } from 'rxjs';
import { UserStore } from '../../../cache/user.store';
import { UserDeleteResponse } from '../../../models/user.model';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-delete-account-dialog',
  imports: [MatFormFieldModule, ReactiveFormsModule, MatProgressSpinnerModule,
            MatDialogModule, MatInputModule, MatButtonModule,
            TranslatePipe],
  templateUrl: './delete-account-dialog.html',
  styleUrl: './delete-account-dialog.css',
})
export class DeleteAccountDialog {
  private readonly userStore = inject(UserStore);

  protected readonly userCache = this.userStore.userCache;

  protected readonly credentialsForm = new FormGroup({
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

  protected onSubmit() {
    const username = this.credentialsForm.value.username;
    const password = this.credentialsForm.value.password;

    if (username && password) {
      this.dialog.open(ConfirmDialog, {
        data: {
          message: { key: 'user.confirm.delete.message' }
        },
        disableClose: true,
        width: '420px'
      })
      .afterClosed().pipe(switchMap(confirmed => {
        if (confirmed) {
          return this.userStore.deleteUser({ username, password });
        }
        return EMPTY;
      }))
      .subscribe({
        next: (response: UserDeleteResponse) => this.dialogRef.close(response)
      });
    }
  }

  protected onClose() {
    this.dialogRef.close();
  }
}
