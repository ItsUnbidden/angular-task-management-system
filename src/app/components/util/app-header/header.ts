import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule, MatIconRegistry } from "@angular/material/icon";
import { UserService } from '../../../service/user.service';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../service/auth.service';
import { HttpErrorResponse } from '@angular/common/http';
import { GeneralApiError } from '../../../models';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Oauth2Service } from '../../../service/oauth2.service';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialog } from '../confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-header',
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  private userService = inject(UserService);
  private oauth2Service = inject(Oauth2Service);

  isLoggedIn = computed(() => {
    const user = this.userService.user();

    return user;
  });

  isGoogleCalendarConnected = this.oauth2Service.isCalendarConnected;
  isDropboxConnected = this.oauth2Service.isDropboxConnected;

  constructor(private router: Router, private authService: AuthService, private snackBar: MatSnackBar, private dialog: MatDialog) {}

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
        message: 'Are you sure you want to disconnect Dropbox?',
      },
      disableClose: true,
      width: '420px'
    })
    .afterClosed()
    .subscribe({
      next: confirmed => {
        if (confirmed) {
          this.oauth2Service.logoutFromDropbox().subscribe({
            next: () => {
              this.snackBar.open('Dropbox disconnected successfully.', 'Dismiss', {
                duration: 3000
              });
            },
            error: (err: HttpErrorResponse) => {
              const error = err.error as GeneralApiError;

              this.snackBar.open((error) ? `Error: ${error.error}` : 'An unknown error occured while disconnecting Dropbox.', 'Dismiss', {
                duration: 5000
              });
            }
          });
        }
      }
    });
  }

  onLogoutCalendar() {
    this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Disconnect Google Calendar',
        message: 'Are you sure you want to disconnect Google Calendar?',
      },
      disableClose: true,
      width: '420px'
    })
    .afterClosed()
    .subscribe({
      next: confirmed => {
        if (confirmed) {
          this.oauth2Service.logoutFromCalendar().subscribe({
            next: () => {
              this.snackBar.open('Google Calendar disconnected successfully.', 'Dismiss', {
                duration: 3000
              });
            },
            error: (err: HttpErrorResponse) => {
              const error = err.error as GeneralApiError;

              this.snackBar.open((error) ? `Error: ${error.error}` : 'An unknown error occured while disconnecting Calendar.', 'Dismiss', {
                duration: 5000
              });
            }
          });
        }
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
    .subscribe({
      next: confirmed => {
        if (confirmed) {
          this.authService.logout().subscribe({
            next: () => {
              this.snackBar.open('Logged out successfully.', 'Dismiss', {
                duration: 3000
              });
              this.router.navigateByUrl('/auth');
            }, 
            error: (err: HttpErrorResponse) => {
              const error = err.error as GeneralApiError;

              this.snackBar.open((error) ? `Error: ${error.error}` : 'An unknown error occured while logging out.', 'Dismiss', {
                duration: 5000
              });
            }
          });
        }
      }
    });
  }
}
