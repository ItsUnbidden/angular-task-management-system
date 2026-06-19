import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { LoginRequest, UserDeleteResponse, UserResponse, UserUpdateRequest } from '../models/user.model';
import { Page } from '../models/general.model';
import { getPageableParams } from '../utils';
import { SortDirection } from '@angular/material/sort';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  constructor(private readonly http: HttpClient) {}

  loadUser(): Observable<UserResponse> {
    return this.http.get<UserResponse>(`/api/users/me`);
  }

  getUserById(id: number) : Observable<UserResponse> {
    return this.http.get<UserResponse>(`/api/users/${id}`);
  }

  searchUsers(search: string, type: 'username' | 'email', page: number, size: number, sort: string, direction: SortDirection) : Observable<Page<UserResponse>> {
    return this.http.get<Page<UserResponse>>(`/api/users/search`, { params: getPageableParams(page, size, sort, direction, { search, type }) });
  };

  changeLock(id: number) : Observable<UserResponse> {
    return this.http.patch<UserResponse>(`/api/users/${id}/lock`, {});
  }

  changeRole(id: number, role: 'USER' | 'MANAGER') : Observable<UserResponse> {
    // ID 1 is USER; ID 2 is MANAGER
    return this.http.patch<UserResponse>(`/api/users/${id}/roles`, [
        { id: role === 'USER' ? 1 : 2, roleType: role }
      ]
    );
  }

  updateUserDetails(request: UserUpdateRequest) : Observable<UserResponse> {
    return this.http.put<UserResponse>(`/api/users/me`, request);
  }

  deleteUser(request: LoginRequest) : Observable<UserDeleteResponse> {
    return this.http.delete<UserDeleteResponse>(`/api/users/me`, { body: request });
  }
}
