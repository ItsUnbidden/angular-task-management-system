import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { EMPTY, Observable, switchMap, tap } from 'rxjs';
import { DropboxOperationResult, OAuth2StatusResponse, ThirdPartyOperationResult } from '../models/external.model';

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
    return this.http.delete<void>(`/api/dropbox/logout`).pipe(tap({
      next: () => {
        this.isDropboxConnected.set(false);
      }
    }));
  }

  logoutFromCalendar() : Observable<void> {
    return this.http.delete<void>(`/api/google/logout`).pipe(tap({
      next: () => {
        this.isCalendarConnected.set(false);
      }
    }));
  }

  checkDropboxStatus() : Observable<DropboxOperationResult> {
    this.isCheckingDropbox.set(true);
    return this.http.get<OAuth2StatusResponse>(`/api/dropbox/status`).pipe(
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
    return this.http.get<OAuth2StatusResponse>(`/api/google/status`).pipe(switchMap(response => {
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

  checkDropboxHealth() : Observable<DropboxOperationResult> {
    return this.http.get<DropboxOperationResult>(`/api/dropbox/test`);
  }

  checkGoogleHealth() : Observable<ThirdPartyOperationResult> {
    return this.http.get<ThirdPartyOperationResult>(`/api/google/test`);
  }
}
