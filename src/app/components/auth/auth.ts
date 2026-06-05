import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDivider } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../../service/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, switchMap } from 'rxjs';
import { getDefaultErrorMessageForType, passwordMatchValidator } from '../../utils';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HttpErrorResponse } from '@angular/common/http';
import { ValidationBoundaries } from '../validation-boundaries';
import { SimpleApiError } from '../../models/error.model';

@Component({
    selector: 'app-auth',
    imports: [MatCardModule, MatFormFieldModule, ReactiveFormsModule, MatInputModule, MatButton, MatDivider, MatProgressSpinnerModule],
    templateUrl: './auth.html',
    styleUrl: './auth.css'
})
export class Auth {
  protected readonly USERNAME_MAX_LENGTH = ValidationBoundaries.USER_USERNAME_MAX_LENGTH;
  protected readonly USERNAME_MIN_LENGTH = ValidationBoundaries.USER_USERNAME_MIN_LENGTH;
  protected readonly PASSWORD_MAX_LENGTH = ValidationBoundaries.USER_PASSWORD_MAX_LENGTH;
  protected readonly PASSWORD_MIN_LENGTH = ValidationBoundaries.USER_PASSWORD_MIN_LENGTH;

  private readonly authService = inject(AuthService);

  readonly isLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  readonly isRegistering = signal(false);
  
  private returnUrl = '/dashboard';

  constructor(private readonly route: ActivatedRoute,
              private readonly router: Router) {
    const ru = this.route.snapshot.queryParamMap.get('returnUrl');
    if (ru && ru.startsWith('/')) this.returnUrl = ru;
  }

  readonly loginForm = new FormGroup({
    username: new FormControl('', [
      Validators.required
    ]),
    password: new FormControl('', [
      Validators.required
    ])
  });

  readonly registrationForm = new FormGroup({
    username: new FormControl('', [
      Validators.required,
      Validators.minLength(ValidationBoundaries.USER_USERNAME_MIN_LENGTH),
      Validators.maxLength(ValidationBoundaries.USER_USERNAME_MAX_LENGTH)
    ]),
    password: new FormControl('', [
      Validators.required,
      Validators.minLength(ValidationBoundaries.USER_PASSWORD_MIN_LENGTH),
      Validators.maxLength(ValidationBoundaries.USER_USERNAME_MAX_LENGTH)
    ]),
    repeatPassword: new FormControl('', [
      Validators.required
    ]),
    email: new FormControl('', [
      Validators.required,
      Validators.email
    ])
  }, { validators: passwordMatchValidator() });

  onLoginSubmit() {
    const username = this.loginForm.value.username?.trim();
    const password = this.loginForm.value.password?.trim();

    if (username && password) {
      this.isLoading.set(true);
      this.authService.login({ username, password }).pipe(
        finalize(() => this.isLoading.set(false)),
        switchMap(() => this.authService.refreshCsrfToken())
      ).subscribe({
        next: () => this.router.navigateByUrl(this.returnUrl),
        error: (err: HttpErrorResponse) => {
          const error = err.error as SimpleApiError;

          this.error.set(getDefaultErrorMessageForType(error));
        }
      });
    }
  }

  onRegistrationSubmit() {
      const username = this.registrationForm.value.username?.trim();
      const password = this.registrationForm.value.password?.trim();    
      const repeatPassword = this.registrationForm.value.repeatPassword?.trim();
      const email = this.registrationForm.value.email?.trim();

      if (username && password && repeatPassword && email) {
        this.isLoading.set(true);
        this.authService.register({ username, password, repeatPassword, email }).pipe(
          finalize(() => this.isLoading.set(false)),
          switchMap(() => this.authService.login({ username, password }))
        ).subscribe({
          next: () => this.router.navigateByUrl(this.returnUrl),
          error: (err: HttpErrorResponse) => {
            const error = err.error as SimpleApiError;

            this.error.set(getDefaultErrorMessageForType(error));
          }
        });
      }
  }

  toggleRegistration() {
    this.error.set(null);
    this.isRegistering.update(r => !r);
  }
}
