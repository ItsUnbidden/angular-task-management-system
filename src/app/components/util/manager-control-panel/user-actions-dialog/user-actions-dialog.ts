import { Component, inject, Inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { UserService } from '../../../../service/user.service';
import { GeneralApiError, UserResponse } from '../../../../models';
import { HttpErrorResponse } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { getUserRole } from '../../../../utils';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-user-actions-dialog',
  imports: [MatDialogModule, MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './user-actions-dialog.html',
  styleUrl: './user-actions-dialog.css',
})
export class UserActionsDialog {
  private userService = inject(UserService);

  readonly isOwner = this.userService.isOwner;
  readonly loadedUser = signal<UserResponse | null>(null);
  readonly isLoading = signal(false);

  private hasChanged = false;

  constructor(private dialogRef: MatDialogRef<UserActionsDialog, boolean>, private snackBar: MatSnackBar, @Inject(MAT_DIALOG_DATA) data: UserResponse) {
    this.loadedUser.set(data);
  }

  onSetRole(role: 'MANAGER' | 'USER') {
    const user = this.loadedUser();

    if (user) {
      this.isLoading.set(true);
      this.userService.changeRole(user.id, role).subscribe({
        next: (userResponse) => {
          this.isLoading.set(false);
          this.loadedUser.set(userResponse);
          this.hasChanged = true;
        },
        error: (err: HttpErrorResponse) => {
          const error = err.error as GeneralApiError;

          this.snackBar.open(error ? error.error : 'Unknown error occured while updating user role.', 'Dismiss', {
            duration: 5000
          });
          this.isLoading.set(false);
        }
      });
    }
  }

  onChangeLock() {
    const user = this.loadedUser();

    if (user) {
      this.isLoading.set(true);
      this.userService.changeLock(user.id).subscribe({
        next: (userResponse) => {
          this.isLoading.set(false);
          this.loadedUser.set(userResponse);
          this.hasChanged = true;
        },
        error: (err: HttpErrorResponse) => {
          const error = err.error as GeneralApiError;

          this.snackBar.open(error ? error.error : 'Unknown error occured while locking the user.', 'Dismiss', {
            duration: 5000
          });
          this.isLoading.set(false);
        }
      });
    }
  }

  onClose() {
    this.dialogRef.close(this.hasChanged);
  }

  getUserRoleLocal() : string {
    const user = this.loadedUser();

    return user ? getUserRole(user) : '';
  }
}
