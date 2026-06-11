import { Component, effect, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Header } from "./components/util/app-header/header";
import { OAuth2Service } from './service/oauth2.service';
import { registerIcons } from './app.config';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { UserStore } from './cache/user.store';
import { AuthService } from './service/auth.service';
import { NotificationService } from './service/notification.service';
import { LanguageService } from './service/language.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  constructor(private readonly authService: AuthService,
              private readonly oauth2Service: OAuth2Service, private readonly router: Router,
              private readonly notification: NotificationService,
              private readonly languageService: LanguageService,
              userStore: UserStore, iconRegistry: MatIconRegistry, sanitizer: DomSanitizer) {
    effect(() => {
      const user = userStore.userCache().item;

      if (user) {
        this.oauth2Service.checkCalendarStatus().subscribe();
        this.oauth2Service.checkDropboxStatus().subscribe();
      }
    })

    registerIcons(iconRegistry, sanitizer);
  }

  ngOnInit(): void {
    this.languageService.initialize();

    this.router.routerState.root.queryParamMap.subscribe({
      next: paramMap => {
        const provider = paramMap.get('oauth');
        const result = paramMap.get('result');

        if (provider && result) {
          if (result === 'success') {
            this.notification.info(`${provider === 'dropbox' ? provider : 'calendar'}.success.connect`, 5000);
          } else {
            this.notification.info(`${provider === 'dropbox' ? provider : 'calendar'}.error.connect`, 10000);
          }
        }
      }
    });

    this.authService.forceCsrfTokenResolve().subscribe();
  }
}
