import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { Observable, tap } from 'rxjs';
import { OAuth2StatusResponse } from '../models';

@Injectable({
  providedIn: 'root',
})
export class Oauth2Service {
  isDropboxConnected = signal(false);
  isCalendarConnected = signal(false);

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
    return this.http.get<OAuth2StatusResponse>(`${environment.apiUrl}/api/dropbox/status`).pipe(tap({
      next: s => {
        this.isDropboxConnected.set(s.status === 'OK');
      }
    }))
  }

  checkCalendarStatus() {
    return this.http.get<OAuth2StatusResponse>(`${environment.apiUrl}/api/google/status`).pipe(tap({
      next: s => {
        this.isCalendarConnected.set(s.status === 'OK');
      }
    }))
  }
}
