import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree} from '@angular/router';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { UserService } from '../service/user.service';
import { map, Observable, of, tap } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(@Inject(PLATFORM_ID) private platformId: number, private userService: UserService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean | UrlTree> {
    if (!isPlatformBrowser(this.platformId)) return of(true);
    
    return this.userService.ensureUserLoaded().pipe(
      map(user => {
        if (user) return true;

        const tree = this.router.createUrlTree(['/auth'], { queryParams: { returnUrl: state.url } });

        console.log('AuthGuard redirect tree: ', tree);

        return tree;
      })
    );
  }

  canActivateChild(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    return this.canActivate(route, state);
  }
}
