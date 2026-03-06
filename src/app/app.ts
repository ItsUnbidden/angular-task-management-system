import { Component, OnInit, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Header } from "./components/util/app-header/header";
import { Oauth2Service } from './service/oauth2.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { registerIcons } from './app.config';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, Header],
    templateUrl: './app.html',
    styleUrl: './app.css'
})
export class App implements OnInit {
    protected readonly title = signal('test-angular');

    constructor(private oauth2Service: Oauth2Service, private router: Router, private snackBar: MatSnackBar, iconRegistry: MatIconRegistry, sanitizer: DomSanitizer) {
        registerIcons(iconRegistry, sanitizer);
    }

    ngOnInit(): void {
        this.router.routerState.root.queryParamMap.subscribe({
            next: paramMap => {
                const provider = paramMap.get('oauth');
                const result = paramMap.get('result');

                if (provider && result) {
                    if (result === 'success') {
                        this.snackBar.open(`${provider} has been successfully connected.`, 'Dismiss', {
                            duration: 3000
                        })
                    } else {
                        this.snackBar.open(`An error occured during an attempt to connect ${provider}.`, 'Dismiss', {
                            duration: 5000
                        })
                    }
                }
            }
        });
        this.oauth2Service.checkCalendarStatus().subscribe();
        this.oauth2Service.checkDropboxStatus().subscribe();
    }
}
