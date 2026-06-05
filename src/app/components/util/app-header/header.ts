import { Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from "@angular/material/icon";
import { EventType, Router } from '@angular/router';
import { AuthService } from '../../../service/auth.service';
import { HttpErrorResponse } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
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

@Component({
  selector: 'app-header',
  imports: [MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatMenuModule],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  private readonly router = inject(Router);
  private readonly oauth2Service = inject(OAuth2Service);
  private readonly userStore = inject(UserStore);

  protected readonly userCache = this.userStore.userCache;
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

  protected readonly isDropboxConnected = this.oauth2Service.isDropboxConnected;
  protected readonly isCheckingDropbox = this.oauth2Service.isCheckingDropbox;

  protected readonly isGoogleCalendarConnected = this.oauth2Service.isCalendarConnected;
  protected readonly isCheckingGoogleCalendar = this.oauth2Service.isCheckingCalendar;

  constructor(private readonly authService: AuthService,
              private readonly snackBar: MatSnackBar,
              private readonly dialog: MatDialog) {}

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
        title: 'Disconnect Dropbox',
        message: 'Are you sure you want to <strong>disconnect</strong> Dropbox?',
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
        this.snackBar.open('Dropbox disconnected successfully.', 'Dismiss', {
          duration: 3000
        });
      },
      error: (err: HttpErrorResponse) => {
        const error = err.error as GeneralApiError;

        this.snackBar.open(getDefaultErrorMessageForType(error), 'Dismiss', {
          duration: 5000
        });
      }
    });
  }

  protected onLogoutCalendar() {
    this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Disconnect Google Calendar',
        message: 'Are you sure you want to <strong>disconnect</strong> Google Calendar?',
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
        this.snackBar.open('Google Calendar disconnected successfully.', 'Dismiss', {
          duration: 3000
        });
      },
      error: (err: HttpErrorResponse) => {
        const error = err.error as GeneralApiError;

        this.snackBar.open(getDefaultErrorMessageForType(error), 'Dismiss', {
          duration: 5000
        });
      }
    });
  }

  protected onLogout() {
    this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Logout',
        message: 'Are you sure you want to log out?',
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
        this.snackBar.open('Logged out successfully.', 'Dismiss', {
          duration: 3000
        });
      },
      error: (err: HttpErrorResponse) => {
        const error = err.error as GeneralApiError;

        this.snackBar.open(getDefaultErrorMessageForType(error), 'Dismiss', {
          duration: 5000
        });
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
        this.snackBar.open(this.getDeletionConfirmationMessage(response), 'Dismiss', {
          duration: 10000
        });
        this.userStore.clearUser();
        this.router.navigateByUrl('/auth')
      }
    });
  }

  private getDeletionConfirmationMessage(response: UserDeleteResponse): string {
    let message = `You account has been successfully deleted. 
        Deleted ${response.deletedProjects.length} projects and 
        quitted ${response.quittedProjects.length} projects. `;
    // TODO: Make a nice message for when not everything is disconnected properly.
    return message;
  }
}
