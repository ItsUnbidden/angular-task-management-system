import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { Observable, tap } from 'rxjs';
import { GeneralApiError, OAuth2StatusResponse, ThirdPartyTestResponse } from '../models';

@Injectable({
  providedIn: 'root',
})
export class OAuth2Service {
  readonly isDropboxConnected = signal(false);
  readonly isCalendarConnected = signal(false);
  readonly isCheckingDropbox = signal(false);
  readonly isCheckingCalendar = signal(false);

  constructor(private http: HttpClient) {}

  logoutFromDropbox() : Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/api/dropbox/logout`).pipe(tap({
      next: () => {
        this.isDropboxConnected.set(false);
      }
    }));
  }

  logoutFromCalendar() {
    return this.http.delete<void>(`${environment.apiUrl}/api/google/logout`).pipe(tap({
      next: () => {
        this.isCalendarConnected.set(false);
      }
    }));
  }

  checkDropboxStatus() : Observable<OAuth2StatusResponse> {
    this.isCheckingDropbox.set(true);
    return this.http.get<OAuth2StatusResponse>(`${environment.apiUrl}/api/dropbox/status`).pipe(tap({
      next: s => {
        switch (s.status) {
          case 'OK':
            this.isDropboxConnected.set(true);
            this.isCheckingDropbox.set(false);
            break;
          case 'EXPIRED':
            this.checkDropboxHealth().subscribe({
              next: result => {
                console.log('Health check for Dropbox has been successfully conducted.');
                this.isDropboxConnected.set(true);
                this.isCheckingDropbox.set(false);
              },
              error: (err: HttpErrorResponse) => {
                const error = err.error as GeneralApiError;

                console.error('Health check for Dropbox has failed.', error.error);
                this.isDropboxConnected.set(false);
                this.isCheckingDropbox.set(false);
              }
            });
            break;
          default: 
            this.isDropboxConnected.set(false);
            this.isCheckingDropbox.set(false);
        }
      }
    }));
  }

  checkCalendarStatus() {
    return this.http.get<OAuth2StatusResponse>(`${environment.apiUrl}/api/google/status`).pipe(tap({
      next: s => {
        switch (s.status) {
          case 'OK':
            this.isCalendarConnected.set(true);
            this.isCheckingCalendar.set(false);
            break;
          case 'EXPIRED':
            this.checkGoogleHealth().subscribe({
              next: result => {
                console.log('Health check for Google Calendar has been successfully conducted.');
                this.isCalendarConnected.set(true);
                this.isCheckingCalendar.set(false);
              },
              error: (err: HttpErrorResponse) => {
                const error = err.error as GeneralApiError;

                console.error('Health check for Google Calendar has failed.', error.error);
                this.isCalendarConnected.set(false);
                this.isCheckingCalendar.set(false);
              }
            });
            break;
          default: 
            this.isCalendarConnected.set(false);
            this.isCheckingCalendar.set(false);
        }
      }
    }));
  }

  checkDropboxHealth() : Observable<ThirdPartyTestResponse> {
    return this.http.get<ThirdPartyTestResponse>(`${environment.apiUrl}/api/dropbox/test`);
  }

  checkGoogleHealth() : Observable<ThirdPartyTestResponse> {
    return this.http.get<ThirdPartyTestResponse>(`${environment.apiUrl}/api/google/test`);
  }
}
