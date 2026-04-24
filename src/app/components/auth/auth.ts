import { Component, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDivider } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../../service/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { switchMap } from 'rxjs';
import { GeneralApiError } from '../../models';
import { passwordMatchValidator } from '../../utils';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
    selector: 'app-auth',
    imports: [MatCardModule, MatFormFieldModule, ReactiveFormsModule, MatInputModule, MatButton, MatDivider, MatProgressSpinnerModule],
    templateUrl: './auth.html',
    styleUrl: './auth.css'
})
export class Auth {
  private returnUrl = '/dashboard';

  readonly isRegistering = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly isLoading = signal(false);

  constructor(private readonly authService: AuthService,
              private readonly route: ActivatedRoute,
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
      Validators.minLength(5),
      Validators.maxLength(25)
    ]),
    password: new FormControl('', [
      Validators.required,
      Validators.minLength(8),
      Validators.maxLength(100)
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
        switchMap(() => this.authService.refreshCsrfToken())
      ).subscribe({
        next: () => {
          this.router.navigateByUrl(this.returnUrl);
          this.isLoading.set(false);
        },
        error: (err: HttpErrorResponse) => {
          const error = err.error as GeneralApiError;
          
          // TODO: Differenciate between token and login issues
          const message = err.status === 401
              ? 'There is no registered user with such credentials.'
              : error.errors[0] ?? 'Unknown error occured while trying to log in.';
          
          this.errorMessage.set(message);
          this.isLoading.set(false);
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
          switchMap(() => this.authService.login({ username, password }))
        ).subscribe({
          next: () => {
            this.router.navigateByUrl(this.returnUrl);
            this.isLoading.set(false);
          },
          error: (err: HttpErrorResponse) => {
            const error = err.error as GeneralApiError;

            this.errorMessage.set(error.errors[0] || 'Unknown error occured while trying to register the user.');
            this.isLoading.set(false);
          }
        });
      }
  }

  toggleRegistration() {
    this.errorMessage.set(null);
    this.isRegistering.update(r => !r);
  }
}
