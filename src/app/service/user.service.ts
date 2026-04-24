import { HttpClient, HttpParams } from '@angular/common/http';
import { computed, Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { LoginRequest, Page, UserDeleteResponse, UserResponse, UserUpdateRequest } from '../models';
import { catchError, finalize, Observable, of, shareReplay, tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  readonly user = signal<UserResponse | null | undefined>(undefined);

  readonly isOwner = computed(() => {
    const user = this.user();

    return user ? user?.roles.includes('OWNER') : false;
  });
  readonly isManager = computed(() => {
    const user = this.user();

    return user ? user?.roles.includes('MANAGER') || user?.roles.includes('OWNER') : false;
  });
  private inFlight$?: Observable<UserResponse | null>;

  constructor(private readonly http: HttpClient) {}

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

  getUserById(id: number) : Observable<UserResponse> {
    return this.http.get<UserResponse>(`${environment.apiUrl}/api/users/${id}`);
  }

  searchUsers(search: string, type: 'username' | 'email', page: number, size: number, sort: string, direction: string) : Observable<Page<UserResponse>> {
    let params = new HttpParams().set('search', search).set('type', type).set('page', page).set('size', size);

    if (sort !== '' && direction !== '') params = params.set('sort', sort + ',' + direction);

    return this.http.get<Page<UserResponse>>(`${environment.apiUrl}/api/users/search`, { params });
  };

  changeLock(id: number) : Observable<UserResponse> {
    return this.http.patch<UserResponse>(`${environment.apiUrl}/api/users/${id}/lock`, {});
  }

  changeRole(id: number, role: 'USER' | 'MANAGER') : Observable<UserResponse> {
    return this.http.patch<UserResponse>(`${environment.apiUrl}/api/users/${id}/roles`, [
        { id: role === 'USER' ? 1 : 2, roleType: role }
      ]
    );
  }

  updateUserDetails(request: UserUpdateRequest) : Observable<UserResponse> {
    return this.http.put<UserResponse>(`${environment.apiUrl}/api/users/me`, request).pipe(tap({
      next: (response) => {
        this.user.set(response);
      }
    }));
  }

  deleteUser(request: LoginRequest) : Observable<UserDeleteResponse> {
    return this.http.delete<UserDeleteResponse>(`${environment.apiUrl}/api/users/me`, { body: request });
  }
}
