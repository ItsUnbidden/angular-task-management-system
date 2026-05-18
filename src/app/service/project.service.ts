import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Page, ProjectCreateRequest, ProjectDeleteResponse, ProjectResponse, ProjectRoleUpdateRequest, ProjectUpdateRequest, ProjectUpdateStatusRequest, ThirdPartyProjectDisconnectionResponse, UserAddToProjectResponse, UserRemoveFromProjectResponse } from '../models';

@Injectable({
  providedIn: 'root',
})
export class ProjectService {
  constructor(private readonly http: HttpClient) {}

  getProjectById(projectId: number) : Observable<ProjectResponse> {
    return this.http.get<ProjectResponse>(`/api/projects/${projectId}`);
  }

  getMyProjects(name: string, page: number, size: number, sort: string, direction: string) : Observable<Page<ProjectResponse>> {
    let params = new HttpParams().set('name', name).set('page', page).set('size', size);
    
    if (sort !== '' && direction !== '') params = params.set('sort', sort + ',' + direction);

    return this.http.get<Page<ProjectResponse>>(`/api/projects/me`, { params });
  }

  searchProjectsByName(name: string, page: number, size: number, sort: string, direction: string) : Observable<Page<ProjectResponse>> {
    let params = new HttpParams().set('name', name).set('page', page).set('size', size);
    
    if (sort !== '' && direction !== '') params = params.set('sort', sort + ',' + direction);

    return this.http.get<Page<ProjectResponse>>(`/api/projects/search`, { params })
  }

  createProject(request: ProjectCreateRequest) : Observable<ProjectResponse> {
    return this.http.post<ProjectResponse>(`/api/projects`, request);
  }

  updateProject(projectId: number, request: ProjectUpdateRequest) : Observable<ProjectResponse> {
    return this.http.put<ProjectResponse>(`/api/projects/${projectId}`, request);
  }

  addUserToProject(projectId: number, username: string) : Observable<UserAddToProjectResponse> {
    return this.http.post<UserAddToProjectResponse>(`/api/projects/${projectId}/users/${username}/add`, {});
  }

  removeUserFromProject(projectId: number, userId: number) : Observable<UserRemoveFromProjectResponse> {
    return this.http.delete<UserRemoveFromProjectResponse>(`/api/projects/${projectId}/users/${userId}/remove`);
  }

  quitProject(projectId: number) : Observable<UserRemoveFromProjectResponse> {
    return this.http.delete<UserRemoveFromProjectResponse>(`/api/projects/${projectId}/quit`);
  }

  changeMemberRole(projectId: number, userId: number, request: ProjectRoleUpdateRequest) : Observable<ProjectResponse> {
    return this.http.patch<ProjectResponse>(`/api/projects/${projectId}/users/${userId}/roles`, request);
  }

  changeStatus(projectId: number, request: ProjectUpdateStatusRequest) : Observable<ProjectResponse> {
    return this.http.patch<ProjectResponse>(`/api/projects/${projectId}/status`, request);
  }

  deleteProject(projectId: number) : Observable<ProjectDeleteResponse> {
    return this.http.delete<ProjectDeleteResponse>(`/api/projects/${projectId}`);
  }

  connectProjectToDropbox(projectId: number): Observable<ProjectResponse> {
    return this.http.patch<ProjectResponse>(`/api/projects/${projectId}/dropbox/connect`, {});
  }

  connectProjectToCalendar(projectId: number): Observable<ProjectResponse> {
    return this.http.patch<ProjectResponse>(`/api/projects/${projectId}/calendar/connect`, {});
  }

  joinDropbox(projectId: number) : Observable<void> {
    return this.http.patch<void>(`/api/projects/${projectId}/dropbox/join`, {});
  }

  joinCalendar(projectId: number) : Observable<void> {
    return this.http.patch<void>(`/api/projects/${projectId}/calendar/join`, {});
  }

  disconnectDropbox(projectId: number) : Observable<ThirdPartyProjectDisconnectionResponse> {
    return this.http.delete<ThirdPartyProjectDisconnectionResponse>(`/api/projects/${projectId}/dropbox/disconnect`);
  }

  disconnectCalendar(projectId: number) : Observable<ThirdPartyProjectDisconnectionResponse> {
    return this.http.delete<ThirdPartyProjectDisconnectionResponse>(`/api/projects/${projectId}/google/disconnect`);
  }
}
