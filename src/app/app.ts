import { Component, signal } from '@angular/core';
import { NavigationEnd, NavigationStart, Router, RouterOutlet } from '@angular/router';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet],
    templateUrl: './app.html',
    styleUrl: './app.css'
})
export class App {
    protected readonly title = signal('test-angular');

    constructor(router: Router) {
        router.events.subscribe(e => {
            if (e instanceof NavigationStart) console.log('NavStart', e.url);
            if (e instanceof NavigationEnd) console.log('NavEnd', e.urlAfterRedirects);
        });
    }
}
