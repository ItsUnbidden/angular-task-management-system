import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree} from '@angular/router';
import { Injectable } from '@angular/core';
import { UserService } from '../service/user.service';
import { map, Observable, switchMap } from 'rxjs';
import { AuthService } from '../service/auth.service';
import { UserStore } from '../cache/user.store';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private userStore: UserStore, private authService: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean | UrlTree> {
    return this.authService.forceCsrfTokenResolve().pipe(
      switchMap(() => {
        return this.userStore.ensureUserLoaded().pipe(
          map(user => {
            if (user) return true;

            return this.router.createUrlTree(['/auth'], { queryParams: { returnUrl: state.url } });
          })
        );
      })
    );
  }

  canActivateChild(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    return this.canActivate(route, state);
  }
}
