import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { EMPTY, Observable, switchMap, tap } from 'rxjs';
import { OAuth2StatusResponse, ThirdPartyTestResponse } from '../models';

@Injectable({
  providedIn: 'root',
})
export class OAuth2Service {
  readonly isDropboxConnected = signal(false);
  readonly isCalendarConnected = signal(false);
  readonly isCheckingDropbox = signal(false);
  readonly isCheckingCalendar = signal(false);

  constructor(private readonly http: HttpClient) {}

  logoutFromDropbox() : Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/api/dropbox/logout`).pipe(tap({
      next: () => {
        this.isDropboxConnected.set(false);
      }
    }));
  }

  logoutFromCalendar() : Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/api/google/logout`).pipe(tap({
      next: () => {
        this.isCalendarConnected.set(false);
      }
    }));
  }

  checkDropboxStatus() : Observable<ThirdPartyTestResponse> {
    this.isCheckingDropbox.set(true);
    return this.http.get<OAuth2StatusResponse>(`${environment.apiUrl}/api/dropbox/status`).pipe(
      switchMap(response => {
        switch (response.status) {
          case 'OK':
            this.isDropboxConnected.set(true);
            this.isCheckingDropbox.set(false);
            return EMPTY;
          case 'EXPIRED':
            return this.checkDropboxHealth().pipe(
              tap({
                next: () => {
                  this.isDropboxConnected.set(true);
                },
                error: () => {
                  this.isDropboxConnected.set(false);
                },
                finalize: () => {
                  this.isCheckingDropbox.set(false);
                }
              })
            );
          default: 
            this.isDropboxConnected.set(false);
            this.isCheckingDropbox.set(false);
            return EMPTY;
        }
      }
    ));
  }

  checkCalendarStatus() {
    return this.http.get<OAuth2StatusResponse>(`${environment.apiUrl}/api/google/status`).pipe(switchMap(response => {
      switch (response.status) {
        case 'OK':
          this.isCalendarConnected.set(true);
          this.isCheckingCalendar.set(false);
          return EMPTY;
        case 'EXPIRED':
          return this.checkGoogleHealth().pipe(
            tap({
              next: () => {
                this.isCalendarConnected.set(true);
              },
              error: () => {
                this.isCalendarConnected.set(false);
              },
              finalize: () => {
                this.isCheckingCalendar.set(false);
              }
            })
          );
        default: 
          this.isCalendarConnected.set(false);
          this.isCheckingCalendar.set(false);
          return EMPTY;
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
