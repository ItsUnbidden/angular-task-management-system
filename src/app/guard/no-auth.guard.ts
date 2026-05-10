import { CanActivate, Router, UrlTree } from '@angular/router';
import { Injectable } from '@angular/core';
import { map, Observable, switchMap } from 'rxjs';
import { UserService } from '../service/user.service';
import { AuthService } from '../service/auth.service';
import { UserStore } from '../cache/user.store';

@Injectable({ providedIn: 'root' })
export class NoAuthGuard implements CanActivate {
  constructor(private authService: AuthService, private userStore: UserStore, private router: Router) {}

  canActivate(): Observable<boolean | UrlTree> {
    return this.authService.forceCsrfTokenResolve().pipe(
      switchMap(() => {
        return this.userStore.ensureUserLoaded().pipe(
          map(user => user ? this.router.parseUrl('/dashboard') : true))
      })
    );
  }
}
