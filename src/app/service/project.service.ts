import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Page, ProjectCreateRequest, ProjectDeleteResponse, ProjectResponse, ProjectRoleUpdateRequest, ProjectUpdateRequest, ThirdPartyProjectDisconnectionResponse, UserAddToProjectResponse, UserRemoveFromProjectResponse } from '../models';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ProjectService {
  constructor(private readonly http: HttpClient) {}

  getProjectById(projectId: number) : Observable<ProjectResponse> {
    return this.http.get<ProjectResponse>(`${environment.apiUrl}/api/projects/${projectId}`);
  }

  getMyProjects(name: string, page: number, size: number, sort: string, direction: string) : Observable<Page<ProjectResponse>> {
    let params = new HttpParams().set('name', name).set('page', page).set('size', size);
    
    if (sort !== '' && direction !== '') params = params.set('sort', sort + ',' + direction);

    return this.http.get<Page<ProjectResponse>>(`${environment.apiUrl}/api/projects/me`, { params });
  }

  searchProjectsByName(name: string, page: number, size: number, sort: string, direction: string) : Observable<Page<ProjectResponse>> {
    let params = new HttpParams().set('name', name).set('page', page).set('size', size);
    
    if (sort !== '' && direction !== '') params = params.set('sort', sort + ',' + direction);

    return this.http.get<Page<ProjectResponse>>(`${environment.apiUrl}/api/projects/search`, { params })
  }

  createProject(request: ProjectCreateRequest) : Observable<ProjectResponse> {
    return this.http.post<ProjectResponse>(`${environment.apiUrl}/api/projects`, request);
  }

  updateProject(projectId: number, request: ProjectUpdateRequest) : Observable<ProjectResponse> {
    return this.http.put<ProjectResponse>(`${environment.apiUrl}/api/projects/${projectId}`, request);
  }

  addUserToProject(projectId: number, username: string) : Observable<UserAddToProjectResponse> {
    return this.http.post<UserAddToProjectResponse>(`${environment.apiUrl}/api/projects/${projectId}/users/${username}/add`, {});
  }

  removeUserFromProject(projectId: number, userId: number) : Observable<UserRemoveFromProjectResponse> {
    return this.http.delete<UserRemoveFromProjectResponse>(`${environment.apiUrl}/api/projects/${projectId}/users/${userId}/remove`);
  }

  quitProject(projectId: number) : Observable<UserRemoveFromProjectResponse> {
    return this.http.delete<UserRemoveFromProjectResponse>(`${environment.apiUrl}/api/projects/${projectId}/quit`);
  }

  changeMemberRole(projectId: number, userId: number, request: ProjectRoleUpdateRequest) : Observable<ProjectResponse> {
    return this.http.patch<ProjectResponse>(`${environment.apiUrl}/api/projects/${projectId}/users/${userId}/roles`, request);
  }

  deleteProject(projectId: number) : Observable<ProjectDeleteResponse> {
    return this.http.delete<ProjectDeleteResponse>(`${environment.apiUrl}/api/projects/${projectId}`);
  }

  connectProjectToDropbox(projectId: number): Observable<ProjectResponse> {
    return this.http.patch<ProjectResponse>(`${environment.apiUrl}/api/projects/${projectId}/dropbox/connect`, {});
  }

  connectProjectToCalendar(projectId: number): Observable<ProjectResponse> {
    return this.http.patch<ProjectResponse>(`${environment.apiUrl}/api/projects/${projectId}/calendar/connect`, {});
  }

  joinDropbox(projectId: number) : Observable<void> {
    return this.http.patch<void>(`${environment.apiUrl}/api/projects/${projectId}/dropbox/join`, {});
  }

  joinCalendar(projectId: number) : Observable<void> {
    return this.http.patch<void>(`${environment.apiUrl}/api/projects/${projectId}/calendar/join`, {});
  }

  disconnectDropbox(projectId: number) : Observable<ThirdPartyProjectDisconnectionResponse> {
    return this.http.delete<ThirdPartyProjectDisconnectionResponse>(`${environment.apiUrl}/api/projects/${projectId}/dropbox/disconnect`);
  }

  disconnectCalendar(projectId: number) : Observable<ThirdPartyProjectDisconnectionResponse> {
    return this.http.delete<ThirdPartyProjectDisconnectionResponse>(`${environment.apiUrl}/api/projects/${projectId}/google/disconnect`);
  }
}
