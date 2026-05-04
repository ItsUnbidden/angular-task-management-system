import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, switchMap, tap} from 'rxjs';
import { LoginRequest, RegistrationRequest, UserResponse } from '../models';
import { environment } from '../../environments/environment';
import { UserStore } from '../cache/user.store';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  constructor(private readonly http: HttpClient, private readonly userStore: UserStore) {}

  register(body: RegistrationRequest): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/api/auth/register`, body);
  }

  login(body: LoginRequest) : Observable<UserResponse | null> {
    return this.http.post<void>(`${environment.apiUrl}/api/auth/login`, body).pipe(
      switchMap(() => this.userStore.ensureUserLoaded()),
      tap({
        next: user => {
          if (user) this.userStore.setLoggedInUser(user);
        }
      })
    );
  }

  logout() : Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/api/auth/logout`).pipe(tap({
      next: () => this.userStore.clearUser()
    }));
  }

  refreshToken(): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/api/auth/refresh`, {});
  }

  forceCsrfTokenResolve() : Observable<void> {
    return this.http.get<void>(`${environment.apiUrl}/api/auth/csrf`);
  }

  refreshCsrfToken() : Observable<void> {
    return this.http.get<void>(`${environment.apiUrl}/api/auth/csrf/refresh`);
  }
}
