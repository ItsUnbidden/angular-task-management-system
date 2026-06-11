import { Injectable } from "@angular/core";
import { AuthService } from "../service/auth.service";
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from "@angular/common/http";
import { BehaviorSubject, catchError, filter, finalize, Observable, switchMap, take, throwError } from "rxjs";
import { UserStore } from "../cache/user.store";

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private isRefreshDone = new BehaviorSubject<any | null>(null);

  constructor(private auth: AuthService, private userStore: UserStore) {}
  
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const request = req.clone({ withCredentials: true });

    return next.handle(req).pipe(catchError(err => {
      if (err.status !== 401) {
        return throwError(() => err);
      }

      if (request.url.includes('/api/auth/refresh') || request.url.includes('/api/auth/login')) {
        return throwError(() => err);
      }

      return this.handle401AndRetry(request, next);
    }));
  }

  private handle401AndRetry(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.isRefreshDone.next(null);

      return this.auth.refreshToken().pipe(
        switchMap(() => {
          this.isRefreshDone.next(true);
          return next.handle(request);
        }),
        catchError(err => {
          this.isRefreshDone.next(err);
          this.userStore.clearUser();
          return throwError(() => err);
        }),
        finalize(() => {
          this.isRefreshing = false;
        })
      );
    }

    return this.isRefreshDone.pipe(
      filter(result => result !== null),
      take(1),
      switchMap(result => {
        if (typeof result === 'boolean' && result) {
          return next.handle(request);
        } else {
          return throwError(() => result ?? new Error('Unknown error.'))
        }
      }));
  }
}
