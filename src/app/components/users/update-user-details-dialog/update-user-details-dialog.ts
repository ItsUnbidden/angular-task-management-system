import { Component, inject } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { getDefaultErrorMessageForType, passwordMatchValidator } from '../../../utils';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HttpErrorResponse } from '@angular/common/http';
import { UserStore } from '../../../cache/user.store';
import { ValidationBoundaries } from '../../../config/validation-boundaries';
import { GeneralApiError } from '../../../models/error.model';
import { NotificationService } from '../../../service/notification.service';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-update-user-details-dialog',
  imports: [MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule,
            ReactiveFormsModule, MatProgressSpinnerModule, TranslatePipe],
  templateUrl: './update-user-details-dialog.html',
  styleUrl: './update-user-details-dialog.css',
})
export class UpdateUserDetailsDialog {
  protected readonly USERNAME_MAX_LENGTH = ValidationBoundaries.USER_USERNAME_MAX_LENGTH;
  protected readonly USERNAME_MIN_LENGTH = ValidationBoundaries.USER_USERNAME_MIN_LENGTH;
  protected readonly PASSWORD_MAX_LENGTH = ValidationBoundaries.USER_PASSWORD_MAX_LENGTH;
  protected readonly PASSWORD_MIN_LENGTH = ValidationBoundaries.USER_PASSWORD_MIN_LENGTH;

  private readonly userStore = inject(UserStore);

  protected readonly userCache = this.userStore.userCache;

  protected readonly userDetailsForm = new FormGroup({
    username: new FormControl('', [
      Validators.minLength(ValidationBoundaries.USER_USERNAME_MIN_LENGTH),
      Validators.maxLength(ValidationBoundaries.USER_USERNAME_MAX_LENGTH)
    ]),
    password: new FormControl('', [
      Validators.minLength(ValidationBoundaries.USER_PASSWORD_MIN_LENGTH),
      Validators.maxLength(ValidationBoundaries.USER_PASSWORD_MAX_LENGTH)
    ]),
    repeatPassword: new FormControl('', [
      Validators.minLength(ValidationBoundaries.USER_PASSWORD_MIN_LENGTH),
      Validators.maxLength(ValidationBoundaries.USER_PASSWORD_MAX_LENGTH)
    ]),
    email: new FormControl('', [
      Validators.email
    ])
  }, { validators: [ passwordMatchValidator(), this.emptyFormValidator() ] });

  constructor(private readonly dialogRef: MatDialogRef<UpdateUserDetailsDialog, boolean>,
              private readonly notification: NotificationService) {}

  protected onSubmit() {
    const user = this.userCache().item;
    const username = this.userDetailsForm.value.username?.trim();
    const email = this.userDetailsForm.value.email?.trim();
    const rawPassword = this.userDetailsForm.value.password?.trim();
    const rawRepeatPassword = this.userDetailsForm.value.repeatPassword?.trim();

    const password = rawPassword && rawPassword.length > 0 ? rawPassword : undefined;
    const repeatPassword = rawRepeatPassword && rawRepeatPassword.length > 0 ? rawRepeatPassword : undefined;

    if (user && (username || email || password)) {
      this.userStore.updateUserDetails({
        username: username ? username : user.username,
        email: email ? email : user.email,
        password,
        repeatPassword,
        version: user.version
      }).subscribe({
        next: () => {
          this.notification.info('user.success.update', 5000);
          this.dialogRef.close();
        },
        error: (err: HttpErrorResponse) => {
          const error = err.error as GeneralApiError;

          this.notification.info(getDefaultErrorMessageForType(error), 10000);
        }
      });
    }
  }

  protected onClose() {
    this.dialogRef.close();
  }

  private emptyFormValidator() : ValidatorFn {
    return (control: AbstractControl) => {
      const controls = (control as FormGroup).controls;

      const hasValue = Object.values(controls).some(element => {
        const value = element.value?.trim();

        return value && value !== '';
      });

      return hasValue ? null : { atLeastOneRequired: true };
    }
  }
}
