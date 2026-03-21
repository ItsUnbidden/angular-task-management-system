import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { UserResponse } from '../models';
import { catchError, finalize, Observable, of, shareReplay, tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  user = signal<UserResponse | null | undefined>(undefined);
  private inFlight$?: Observable<UserResponse | null>;

  constructor(private http: HttpClient) {}

  ensureUserLoaded(): Observable<UserResponse | null> {
    const cached = this.user();
    if (cached !== undefined) {
      return of(cached ?? null);
    }

    if (this.inFlight$) return this.inFlight$;

    this.inFlight$ = this.loadUser().pipe(
      tap({
        next: (user) => this.user.set(user),
      }),
      catchError(() => {
        this.user.set(null);
        return of(null);
      }),
      finalize(() => {
        this.inFlight$ = undefined;
      }),
      shareReplay(1)
    );

    return this.inFlight$;
  }

  loadUser(): Observable<UserResponse> {
    return this.http.get<UserResponse>(`${environment.apiUrl}/api/users/me`);
  }

  setLoggedInUser(user: UserResponse | null) {
    this.user.set(user);
  }

  clearUser() {
    this.user.set(null);
  }

  invalidateUserCache() {
    this.user.set(undefined);
  }
}
