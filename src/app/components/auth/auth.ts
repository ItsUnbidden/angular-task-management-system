import { Component, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDivider } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../../service/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Observer } from 'rxjs';
import { UserResponse } from '../../models';
import { passwordMatchValidator } from '../../utils';

@Component({
    selector: 'app-auth',
    imports: [MatCardModule, MatFormFieldModule, ReactiveFormsModule, MatInputModule, MatButton, MatDivider],
    templateUrl: './auth.html',
    styleUrl: './auth.css'
})
export class Auth {
    readonly isRegistering = signal(false);
    readonly errorMessage = signal<string | null>(null);
    readonly isSubmitEnabled = signal(true);
    returnUrl = '/dashboard';

    constructor(private authService: AuthService, private route: ActivatedRoute, private router: Router) {
        const ru = this.route.snapshot.queryParamMap.get('returnUrl');
        if (ru && ru.startsWith('/')) this.returnUrl = ru;
    }

    loginForm = new FormGroup({
        username: new FormControl('', [
            Validators.required
        ]),
        password: new FormControl('', [
            Validators.required
        ])
    });

    registrationForm = new FormGroup({
        username: new FormControl('', [
            Validators.required,
            Validators.minLength(5),
            Validators.maxLength(25)
        ]),
        password: new FormControl('', [
            Validators.required
        ]),
        repeatPassword: new FormControl('', [
            Validators.required
        ]),
        email: new FormControl('', [
            Validators.required,
            Validators.email
        ])
    }, { validators: passwordMatchValidator() });

    onLogin: Partial<Observer<UserResponse | null>> = {
        next: () => {
            console.log('Logged in, token stored.');
            this.router.navigateByUrl(this.returnUrl);
            this.isSubmitEnabled.set(true);
        },
        error: (error) => {
            console.error('Login failed:', error);
            this.errorMessage.set(error.error?.message || error.statusText || 'Unknown error');
            this.isSubmitEnabled.set(true);
        }      
    };

    onLoginSubmit() {
        this.isSubmitEnabled.set(false);
        this.authService.login({ username: this.loginForm.value.username || '', password: this.loginForm.value.password || '' })
            .subscribe(this.onLogin);
    }

    onRegistrationSubmit() {
        this.isSubmitEnabled.set(false);
        this.authService.register({
            username: this.registrationForm.value.username || '',
            password: this.registrationForm.value.password || '',
            repeatPassword: this.registrationForm.value.repeatPassword || '',
            email: this.registrationForm.value.email || ''
        }).subscribe({
            next: () => {
                console.log('Registration successful. Logging in...');
                this.authService.login({ username: this.registrationForm.value.username || '', password: this.registrationForm.value.password || ''})
                    .subscribe(this.onLogin);
            },
            error: (error) => {
                console.error('Registration failed:', error);
                this.isSubmitEnabled.set(true);
            }
        });
    }

    toggleRegistration() {
        this.isRegistering.update(r => !r);
    }
}
