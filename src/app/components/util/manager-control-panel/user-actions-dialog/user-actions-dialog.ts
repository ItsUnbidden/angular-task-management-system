import { Component, inject, Inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { getDefaultErrorMessageForType, getUserRole } from '../../../../utils';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { UserStore } from '../../../../cache/user.store';
import { UserService } from '../../../../service/user.service';
import { UserResponse } from '../../../../models/user.model';
import { GeneralApiError } from '../../../../models/error.model';
import { TranslatePipe } from '@ngx-translate/core';
import { NotificationService } from '../../../../service/notification.service';

@Component({
  selector: 'app-user-actions-dialog',
  imports: [MatDialogModule, MatButtonModule, MatProgressSpinnerModule, TranslatePipe],
  templateUrl: './user-actions-dialog.html',
  styleUrl: './user-actions-dialog.css',
})
export class UserActionsDialog {
  private readonly userStore = inject(UserStore);

  protected readonly isOwner = this.userStore.isOwner;
  protected readonly loadedUser = signal<UserResponse | null>(null);
  protected readonly isLoading = signal(false);

  private hasChanged = false;

  constructor(private readonly userService: UserService,
              private readonly dialogRef: MatDialogRef<UserActionsDialog, boolean>,
              private readonly notification: NotificationService,
              @Inject(MAT_DIALOG_DATA) readonly data: UserResponse) {
    this.loadedUser.set(data);
  }

  protected onSetRole(role: 'MANAGER' | 'USER') {
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

          this.notification.info(getDefaultErrorMessageForType(error), 5000);
          this.isLoading.set(false);
        }
      });
    }
  }

  protected onChangeLock() {
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

          this.notification.info(getDefaultErrorMessageForType(error), 5000);
          this.isLoading.set(false);
        }
      });
    }
  }

  protected onClose() {
    this.dialogRef.close(this.hasChanged);
  }

  protected getUserRoleLocal() : string {
    const user = this.loadedUser();

    return user ? getUserRole(user) : '';
  }
}
