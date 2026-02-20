import { Inject, Injectable, PLATFORM_ID } from "@angular/core";
import { AuthService } from "../service/auth.service";
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from "@angular/common/http";
import { BehaviorSubject, catchError, filter, finalize, Observable, switchMap, take, throwError } from "rxjs";
import { Router } from "@angular/router";
import { UserService } from "../service/user.service";
import { isPlatformBrowser } from "@angular/common";

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private isRefreshDone = new BehaviorSubject<boolean | null>(null);

  constructor(@Inject(PLATFORM_ID) private platformId: number, private auth: AuthService, private userService: UserService, private router: Router) {}
  
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!isPlatformBrowser(this.platformId)) return next.handle(req);

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
          this.isRefreshDone.next(false);
          this.userService.setLoggedOut();
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
        if (result) {
          return next.handle(request);
        } else {
          return throwError(() => new Error('Not authenticated'));
        }
      }));
  }
}
