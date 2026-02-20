import { CanActivate, Router, UrlTree } from '@angular/router';
import { Injectable } from '@angular/core';
import { map, Observable, tap } from 'rxjs';
import { UserService } from '../service/user.service';

@Injectable({ providedIn: 'root' })
export class NoAuthGuard implements CanActivate {
  constructor(private userService: UserService, private router: Router) {}

  canActivate(): Observable<boolean | UrlTree> {
    return this.userService.ensureUserLoaded().pipe(map(user => user ? this.router.parseUrl('/dashboard') : true));
  }
}
