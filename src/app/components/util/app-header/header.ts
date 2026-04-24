import { Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from "@angular/material/icon";
import { UserService } from '../../../service/user.service';
import { EventType, Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../service/auth.service';
import { HttpErrorResponse } from '@angular/common/http';
import { GeneralApiError, UserDeleteResponse } from '../../../models';
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

@Component({
  selector: 'app-header',
  imports: [MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatMenuModule],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  private readonly router = inject(Router);
  private readonly oauth2Service = inject(OAuth2Service);
  private readonly userService = inject(UserService);

  readonly user = this.userService.user;
  readonly isLoggedIn = computed(() => {
    const user = this.user();

    return user;
  });
  readonly isOnDashboard = toSignal(this.router.events.pipe(map(event => {
    if (event.type === EventType.NavigationEnd) {
      return this.router.url.includes('/dashboard');
    }
    return false;
  })), { initialValue: false });
  readonly isOnControlPanel = toSignal(this.router.events.pipe(map(event => {
    if (event.type === EventType.NavigationEnd) {
      return this.router.url.includes('/manager-controls');
    }
    return false;
  })), { initialValue: false });

  readonly isManager = this.userService.isManager;
  readonly isOwner = this.userService.isOwner;

  readonly isDropboxConnected = this.oauth2Service.isDropboxConnected;
  readonly isCheckingDropbox = this.oauth2Service.isCheckingDropbox;

  readonly isGoogleCalendarConnected = this.oauth2Service.isCalendarConnected;
  readonly isCheckingGoogleCalendar = this.oauth2Service.isCheckingCalendar;

  constructor(private readonly authService: AuthService,
              private readonly snackBar: MatSnackBar,
              private readonly dialog: MatDialog) {}

  onConnectDropbox() {
    const returnUrl = this.router.url;
    window.location.href = `${environment.apiUrl}/api/oauth2/connect/dropbox?returnUrl=${encodeURIComponent(returnUrl)}`;
  }

  onConnectCalendar() {
    const returnUrl = this.router.url;
    window.location.href = `${environment.apiUrl}/api/oauth2/connect/google?returnUrl=${encodeURIComponent(returnUrl)}`;
  }
  
  onLogoutDropbox() {
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

        this.snackBar.open(error ? error.errors[0] : 'An unknown error occured while disconnecting Dropbox.', 'Dismiss', {
          duration: 5000
        });
      }
    });
  }

  onLogoutCalendar() {
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

        this.snackBar.open(error ? error.errors[0] : 'An unknown error occured while disconnecting Calendar.', 'Dismiss', {
          duration: 5000
        });
      }
    });
  }

  onLogout() {
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

        this.snackBar.open(error ? error.errors[0] : 'An unknown error occured while logging out.', 'Dismiss', {
          duration: 5000
        });
      }
    });
  }

  onToDashboard() {
    this.router.navigateByUrl('/dashboard');
  }

  onManagerActions() {
    this.router.navigateByUrl('/manager-controls');
  }

  onChangeUserDetails() {
    this.dialog.open(UpdateUserDetailsDialog, {
      disableClose: true,
      width: "420px"
    });
  }

  onDeleteAccount() {
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
        this.userService.clearUser();
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
