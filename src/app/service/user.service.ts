import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { LoginRequest, Page, UserDeleteResponse, UserResponse, UserUpdateRequest } from '../models';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  constructor(private readonly http: HttpClient) {}

  loadUser(): Observable<UserResponse> {
    return this.http.get<UserResponse>(`${environment.apiUrl}/api/users/me`);
  }

  getUserById(id: number) : Observable<UserResponse> {
    return this.http.get<UserResponse>(`${environment.apiUrl}/api/users/${id}`);
  }

  searchUsers(search: string, type: 'username' | 'email', page: number, size: number, sort: string, direction: string) : Observable<Page<UserResponse>> {
    let params = new HttpParams().set('search', search).set('type', type).set('page', page).set('size', size);

    if (sort !== '' && direction !== '') params = params.set('sort', sort + ',' + direction);

    return this.http.get<Page<UserResponse>>(`${environment.apiUrl}/api/users/search`, { params });
  };

  changeLock(id: number) : Observable<UserResponse> {
    return this.http.patch<UserResponse>(`${environment.apiUrl}/api/users/${id}/lock`, {});
  }

  changeRole(id: number, role: 'USER' | 'MANAGER') : Observable<UserResponse> {
    // ID 1 is USER; ID 2 is MANAGER
    return this.http.patch<UserResponse>(`${environment.apiUrl}/api/users/${id}/roles`, [
        { id: role === 'USER' ? 1 : 2, roleType: role }
      ]
    );
  }

  updateUserDetails(request: UserUpdateRequest) : Observable<UserResponse> {
    return this.http.put<UserResponse>(`${environment.apiUrl}/api/users/me`, request);
  }

  deleteUser(request: LoginRequest) : Observable<UserDeleteResponse> {
    return this.http.delete<UserDeleteResponse>(`${environment.apiUrl}/api/users/me`, { body: request });
  }
}
