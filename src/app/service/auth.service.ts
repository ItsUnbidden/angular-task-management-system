import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, switchMap, tap} from 'rxjs';
import { LoginRequest, RegistrationRequest, UserResponse } from '../models';
import { environment } from '../../environments/environment';
import { UserService } from './user.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  constructor(private http: HttpClient, private userService: UserService) {}

  register(body: RegistrationRequest): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/api/auth/register`, body);
  }

  login(body: LoginRequest) : Observable<UserResponse | null> {
    return this.http.post<void>(`${environment.apiUrl}/api/auth/login`, body).pipe(
      switchMap(() => this.userService.loadUser()),
      tap(user => this.userService.setLoggedInUser(user))
    )
  }

  logout() : Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/api/auth/logout`).pipe(tap({
      next: () => {
        this.userService.clearUser();
      }
    }));
  }

  refreshToken(): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/api/auth/refresh`, {});
  }
}
