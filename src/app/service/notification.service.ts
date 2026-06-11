import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';

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
}
