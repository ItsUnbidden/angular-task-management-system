import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  constructor(private snackBar: MatSnackBar, private translate: TranslateService) {}

  info(messageKey: string, duration: number, params?: Object) {
    this.snackBar.open(this.translate.instant(messageKey, params),
                       this.translate.instant('common.button.dismiss'),
                       { duration });
  }

  infoAsync(messageKey: string, duration: number, params?: Object) {
    forkJoin([this.translate.get(messageKey, params), this.translate.get('common.button.dismiss')]).subscribe({
      next: values => {
        this.snackBar.open(values[0], values[1], { duration });
      }
    });
  }
}
