import { computed, Injectable, signal } from '@angular/core';
import { LoginRequest, Page, SimpleApiError, SingleItemCache, TableState, UserDeleteResponse, UserResponse, UserUpdateRequest } from '../models';
import { catchError, EMPTY, finalize, Observable, of, shareReplay, tap } from 'rxjs';
import { UserService } from '../service/user.service';
import { HttpErrorResponse } from '@angular/common/http';
import { getDefaultErrorMessageForType } from '../utils';
import { AbstractStore } from './abstract.store';

@Injectable({
  providedIn: 'root',
})
export class UserStore extends AbstractStore<UserResponse, string> {
  readonly userCache = signal<SingleItemCache<UserResponse>>({ isLoading: false, error: null });

  readonly isOwner = computed(() => {
    const user = this.userCache()?.item;

    return user ? user?.roles.includes('OWNER') : false;
  });
  readonly isManager = computed(() => {
    const user = this.userCache()?.item;

    return user ? user?.roles.includes('MANAGER') || user?.roles.includes('OWNER') : false;
  });
  private inFlight$?: Observable<UserResponse | null>;

  constructor(private readonly userService: UserService) { super() }

  cacheUsers(filter: string, type: 'email' | 'username', state: TableState) : Observable<Page<UserResponse>> {
    this.preLoading(state.pageIndex, state.pageSize, filter, state.sortActive, state.sortDirection);
    return this.userService.searchUsers(filter, type, state.pageIndex, state.pageSize,
        state.sortActive, state.sortDirection)
    .pipe(
      tap({
        next: page => this.postLoading(page)
      }),
      catchError((err: HttpErrorResponse) => {
        const error = err.error as SimpleApiError;

        this.postLoading(getDefaultErrorMessageForType(error));
        return EMPTY;
      })
    );
  }

  ensureUserLoaded(): Observable<UserResponse | null> {
    const cached = this.userCache()?.item;
    if (cached !== undefined) {
      return of(cached ?? null);
    }

    if (this.inFlight$) return this.inFlight$;

    this.startLoading();
    this.inFlight$ = this.userService.loadUser().pipe(
      tap({
        next: (user) => this.userCache.set({ item: user, isLoading: false, error: null }),
      }),
      catchError((err: HttpErrorResponse) => {
        const error = err.error as SimpleApiError;

        this.userCache.set({ isLoading: false, error: getDefaultErrorMessageForType(error) });
        return of(null);
      }),
      finalize(() => {
        this.inFlight$ = undefined;
      }),
      shareReplay(1)
    );
    return this.inFlight$;
  }

  updateUserDetails(request: UserUpdateRequest) : Observable<UserResponse> {
    this.startLoading();
    return this.userService.updateUserDetails(request).pipe(
      tap({
        next: (response) => {
          this.userCache.set({ item: response, isLoading: false, error: null });
        }
      }),
      catchError((err: HttpErrorResponse) => {
        const error = err.error as SimpleApiError;

        this.userCache.set({ isLoading: false, error: getDefaultErrorMessageForType(error) });
        return EMPTY;
      }
    ));
  }

  deleteUser(request: LoginRequest) : Observable<UserDeleteResponse> {
    this.startLoading();
    return this.userService.deleteUser(request).pipe(
      tap({
        next: () => {
          this.clearUser();
        }
      }),
      catchError((err: HttpErrorResponse) => {
        const error = err.error as SimpleApiError;

        this.userCache.set({ isLoading: false, error: getDefaultErrorMessageForType(error) });
        return EMPTY;
      })
    );
  }

  setLoggedInUser(user: UserResponse) {
    this.userCache.set({ item: user, isLoading: false, error: null });
  }

  clearUser() {
    this.userCache.set({ isLoading: false, error: null });
  }

  private startLoading() {
    this.userCache.update(cache => {
      return { ...cache, isLoading: true, error: null };
    });
  }
}
