import { Component, effect, inject, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { passwordMatchValidator } from '../../../utils';
import { GeneralApiError } from '../../../models';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HttpErrorResponse } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UserService } from '../../../service/user.service';

@Component({
  selector: 'app-update-user-details-dialog',
  imports: [MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, ReactiveFormsModule, MatProgressSpinnerModule],
  templateUrl: './update-user-details-dialog.html',
  styleUrl: './update-user-details-dialog.css',
})
export class UpdateUserDetailsDialog {
  private userService = inject(UserService);

  readonly user = this.userService.user;
  readonly isLoading = signal(false);
  readonly isEmpty = signal(false);

  userDetailsForm = new FormGroup({
    username: new FormControl('', [
      Validators.minLength(5),
      Validators.maxLength(25)
    ]),
    password: new FormControl('', [
      Validators.minLength(8),
      Validators.maxLength(100)
    ]),
    repeatPassword: new FormControl('', [
      Validators.minLength(8),
      Validators.maxLength(100)
    ]),
    email: new FormControl('', [
      Validators.email
    ])
  }, { validators: [ passwordMatchValidator(), emptyFormValidator() ] });

  constructor(private dialogRef: MatDialogRef<UpdateUserDetailsDialog, boolean>, private snackBar: MatSnackBar) {}

  onSubmit() {
    const user = this.user();
    const username = this.userDetailsForm.value.username?.trim();
    const email = this.userDetailsForm.value.email?.trim();
    const rawPassword = this.userDetailsForm.value.password?.trim();
    const rawRepeatPassword = this.userDetailsForm.value.repeatPassword?.trim();

    const password = rawPassword && rawPassword.length > 0 ? rawPassword : undefined;
    const repeatPassword = rawRepeatPassword && rawRepeatPassword.length > 0 ? rawRepeatPassword : undefined;

    if (user && (username || email || password)) {
      this.isLoading.set(true);
      this.userService.updateUserDetails({
        username: username ? username : user.username,
        email: email ? email : user.email,
        password,
        repeatPassword
      }).subscribe({
        next: () => {
          this.isLoading.set(false);
          this.snackBar.open('User details have been updated.', 'Dismiss', {
            duration: 3000
          });
        },
        error: (err: HttpErrorResponse) => {
          const error = err.error as GeneralApiError;

          this.snackBar.open(error ? error.error : 'Unknown error occured while trying to update user details.', 'Dismiss', {
            duration: 5000
          });
          this.isLoading.set(false);
        }
      });
    }
  }

  onClose() {
    this.dialogRef.close();
  }
}

export function emptyFormValidator() : ValidatorFn {
  return (control: AbstractControl) => {
    const controls = (control as FormGroup).controls;

    const hasValue = Object.values(controls).some(element => {
      const value = element.value?.trim();

      return value && value !== '';
    });

    return hasValue ? null : { atLeastOneRequired: true };
  }
}