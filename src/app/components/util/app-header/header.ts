import { Component, computed, effect, inject, untracked } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from "@angular/material/icon";
import { EventType, Router } from '@angular/router';
import { AuthService } from '../../../service/auth.service';
import { HttpErrorResponse } from '@angular/common/http';
import { OAuth2Service } from '../../../service/oauth2.service';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialog } from '../confirm-dialog/confirm-dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { toSignal } from '@angular/core/rxjs-interop';
import { EMPTY, forkJoin, map, switchMap } from 'rxjs';
import { MatMenuModule } from '@angular/material/menu';
import { UpdateUserDetailsDialog } from '../../users/update-user-details-dialog/update-user-details-dialog';
import { DeleteAccountDialog } from '../../users/delete-account-dialog/delete-account-dialog';
import { UserStore } from '../../../cache/user.store';
import { getDefaultErrorMessageForType } from '../../../utils';
import { GeneralApiError } from '../../../models/error.model';
import { UserDeleteResponse } from '../../../models/user.model';
import { ThirdPartyOperationStatus } from '../../../models/external.model';
import { NotificationService } from '../../../service/notification.service';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MatSelectModule } from '@angular/material/select';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { LanguageCode, languageConfig, LanguageOption } from '../../../config/languages';
import { LanguageService } from '../../../service/language.service';

@Component({
  selector: 'app-header',
  imports: [MatButtonModule, MatIconModule, MatProgressSpinnerModule,
            MatMenuModule, TranslatePipe, MatSelectModule,
            ReactiveFormsModule, MatFormFieldModule],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  private readonly router = inject(Router);
  private readonly oauth2Service = inject(OAuth2Service);
  private readonly userStore = inject(UserStore);
  private readonly languageService = inject(LanguageService);

  protected readonly userCache = this.userStore.userCache.asReadonly();
  protected readonly isLoggedIn = computed(() => {
    const user = this.userCache().item;

    return user ? true : false;
  });
  protected readonly isOnDashboard = toSignal(this.router.events.pipe(map(event => {
    if (event.type === EventType.NavigationEnd) {
      return this.router.url.includes('/dashboard');
    }
    return false;
  })), { initialValue: false });
  protected readonly isOnControlPanel = toSignal(this.router.events.pipe(map(event => {
    if (event.type === EventType.NavigationEnd) {
      return this.router.url.includes('/manager-controls');
    }
    return false;
  })), { initialValue: false });

  protected readonly isManager = this.userStore.isManager;
  protected readonly isOwner = this.userStore.isOwner;

  protected readonly isDropboxConnected = this.oauth2Service.isDropboxConnected.asReadonly();
  protected readonly isCheckingDropbox = this.oauth2Service.isCheckingDropbox.asReadonly();

  protected readonly isGoogleCalendarConnected = this.oauth2Service.isCalendarConnected.asReadonly();
  protected readonly isCheckingGoogleCalendar = this.oauth2Service.isCheckingCalendar.asReadonly();

  protected readonly langOptions = languageConfig.supportedLangs;
  protected readonly currentLang = this.languageService.currentLanguage.asReadonly();

  protected readonly langSelectForm = new FormGroup({
    lang: new FormControl<LanguageCode | null>(null)
  });

  constructor(private readonly authService: AuthService,
              private readonly notification: NotificationService,
              private readonly snackBar: MatSnackBar,
              private readonly translate: TranslateService,
              private readonly dialog: MatDialog) {
    effect(() => {
      const currentLang = this.currentLang();

      if (currentLang) {
        untracked(() => {
          this.langSelectForm.patchValue({
            lang: languageConfig.supportedLangs.find(sl => sl.key === currentLang)?.key
          });
        });
      }
    });
    this.langSelectForm.valueChanges.subscribe({
      next: value => {
        const lang = value.lang;

        if (lang) {
          this.languageService.setLanguage(lang);
        }
      }
    });
  }

  protected onConnectDropbox() {
    const returnUrl = this.router.url;
    window.location.href = `/api/oauth2/connect/dropbox?returnUrl=${encodeURIComponent(returnUrl)}`;
  }

  protected onConnectCalendar() {
    const returnUrl = this.router.url;
    window.location.href = `/api/oauth2/connect/google?returnUrl=${encodeURIComponent(returnUrl)}`;
  }
  
  protected onLogoutDropbox() {
    this.dialog.open(ConfirmDialog, {
      data: {
        title: { key: 'dropbox.confirm.logout.title' },
        message: { key: 'dropbox.confirm.logout.message' },
      },
      disableClose: true,
      width: '420px'
    })
    .afterClosed().pipe(switchMap(confirmed => {
      if (confirmed) return this.oauth2Service.logoutFromDropbox();
      return EMPTY;
    }))
    .subscribe({
      next: () => {
        this.notification.info('dropbox.success.logout', 5000);
      },
      error: (err: HttpErrorResponse) => {
        const error = err.error as GeneralApiError;

        this.notification.info(getDefaultErrorMessageForType(error), 10000);
      }
    });
  }

  protected onLogoutCalendar() {
    this.dialog.open(ConfirmDialog, {
      data: {
        title: { key: 'calendar.confirm.logout.title' },
        message: { key: 'calendar.confirm.logout.message' },
      },
      disableClose: true,
      width: '420px'
    })
    .afterClosed().pipe(switchMap(confirmed => {
      if (confirmed) return this.oauth2Service.logoutFromCalendar();
      return EMPTY;
    }))
    .subscribe({
      next: () => {
        this.notification.info('calendar.success.logout', 5000);
      },
      error: (err: HttpErrorResponse) => {
        const error = err.error as GeneralApiError;

        this.notification.info(getDefaultErrorMessageForType(error), 10000);
      }
    });
  }

  protected onLogout() {
    this.dialog.open(ConfirmDialog, {
      data: {
        title: { key: 'auth.confirm.logout.title' },
        message: { key: 'auth.confirm.logout.message' },
      },
      disableClose: true,
      width: '420px'
    })
    .afterClosed()
    .pipe(switchMap(confirmed => {
      if (confirmed) {
        return forkJoin([this.authService.logout(), this.authService.refreshCsrfToken()])
      }
      return EMPTY;
    }))
    .subscribe({
      next: () => {
        this.router.navigateByUrl('/auth');
        this.notification.info('auth.success.logout', 5000);
      },
      error: (err: HttpErrorResponse) => {
        const error = err.error as GeneralApiError;

        this.notification.info(getDefaultErrorMessageForType(error), 10000);
      }
    });
  }

  protected onToDashboard() {
    this.router.navigateByUrl('/dashboard');
  }

  protected onManagerActions() {
    this.router.navigateByUrl('/manager-controls');
  }

  protected onChangeUserDetails() {
    this.dialog.open(UpdateUserDetailsDialog, {
      disableClose: true,
      width: "420px"
    });
  }

  protected onDeleteAccount() {
    this.dialog.open(DeleteAccountDialog, {
      disableClose: true,
      width: "420px"
    })
    .afterClosed()
    .subscribe((response: UserDeleteResponse) => {
      if (response) {
        this.snackBar.open(this.getDeletionConfirmationMessage(response), this.translate.instant('common.button.dismiss'), { duration: 10000 });
        this.userStore.clearUser();
        this.router.navigateByUrl('/auth')
      }
    });
  }

  private getDeletionConfirmationMessage(response: UserDeleteResponse): string {
    let message = this.translate.instant('user.success.delete.base', { numberOfDeletedProjects: response.deletedProjects.length, numberOfQuittedProjects: response.quittedProjects.length });

    let numberOfDropboxConnectedProjects = 0;
    let numberOfFailedDeletions = 0;
    response.deletedProjects.forEach(pd => {
      if (pd.dropboxResult.status !== ThirdPartyOperationStatus.NOT_APPLICABLE) {
        ++numberOfDropboxConnectedProjects;
        if (pd.dropboxResult.status !== ThirdPartyOperationStatus.SUCCESS) {
          ++numberOfFailedDeletions;
        }
      }
    });
    if (numberOfFailedDeletions > 0) {
      message += this.translate.instant('user.success.delete.dropboxDeletionIssue', { numberOfFailedDeletions, numberOfDropboxConnectedProjects });
    }

    let numberOfOtherDropboxConnectedProjects = 0;
    let numberOfFailedQuits = 0;
    response.quittedProjects.forEach(pd => {
      if (pd.dropboxResult.status !== ThirdPartyOperationStatus.NOT_APPLICABLE) {
        ++numberOfOtherDropboxConnectedProjects;
        if (pd.dropboxResult.status !== ThirdPartyOperationStatus.SUCCESS) {
          ++numberOfFailedQuits;
        }
      }
    });
    if (numberOfFailedQuits > 0) {
      message += this.translate.instant('user.success.delete.dropboxQuitIssue', { numberOfFailedQuits, numberOfOtherDropboxConnectedProjects });
    }
    return message;
  }
}
