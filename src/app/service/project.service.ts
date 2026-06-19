import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ProjectCreateRequest, ProjectDeleteResponse, ProjectResponse, ProjectRoleUpdateRequest, ProjectUpdateRequest, ProjectUpdateStatusRequest, ProjectWithDropboxResultResponse } from '../models/project.model';
import { Page } from '../models/general.model';
import { ProjectCalendarDisconnectionResponseDto } from '../models/external.model';
import { getPageableParams } from '../utils';
import { SortDirection } from '@angular/material/sort';

@Injectable({
  providedIn: 'root',
})
export class ProjectService {
  constructor(private readonly http: HttpClient) {}

  getProjectById(projectId: number) : Observable<ProjectResponse> {
    return this.http.get<ProjectResponse>(`/api/projects/${projectId}`);
  }

  getMyProjects(name: string, page: number, size: number, sort: string, direction: SortDirection) : Observable<Page<ProjectResponse>> {
    return this.http.get<Page<ProjectResponse>>(`/api/projects/me`, { params: getPageableParams(page, size, sort, direction, { name }) });
  }

  searchProjectsByName(name: string, page: number, size: number, sort: string, direction: SortDirection) : Observable<Page<ProjectResponse>> {
    return this.http.get<Page<ProjectResponse>>(`/api/projects/search`, { params: getPageableParams(page, size, sort, direction, { name }) })
  }

  createProject(request: ProjectCreateRequest) : Observable<ProjectWithDropboxResultResponse> {
    return this.http.post<ProjectWithDropboxResultResponse>(`/api/projects`, request);
  }

  updateProject(projectId: number, request: ProjectUpdateRequest) : Observable<ProjectResponse> {
    return this.http.put<ProjectResponse>(`/api/projects/${projectId}`, request);
  }

  addUserToProject(projectId: number, username: string) : Observable<ProjectWithDropboxResultResponse> {
    return this.http.post<ProjectWithDropboxResultResponse>(`/api/projects/${projectId}/users/${username}/add`, {});
  }

  removeUserFromProject(projectId: number, userId: number) : Observable<ProjectWithDropboxResultResponse> {
    return this.http.delete<ProjectWithDropboxResultResponse>(`/api/projects/${projectId}/users/${userId}/remove`);
  }

  quitProject(projectId: number) : Observable<ProjectWithDropboxResultResponse> {
    return this.http.delete<ProjectWithDropboxResultResponse>(`/api/projects/${projectId}/quit`);
  }

  changeMemberRole(projectId: number, userId: number, request: ProjectRoleUpdateRequest) : Observable<ProjectWithDropboxResultResponse> {
    return this.http.patch<ProjectWithDropboxResultResponse>(`/api/projects/${projectId}/users/${userId}/roles`, request);
  }

  changeStatus(projectId: number, request: ProjectUpdateStatusRequest) : Observable<ProjectResponse> {
    return this.http.patch<ProjectResponse>(`/api/projects/${projectId}/status`, request);
  }

  deleteProject(projectId: number) : Observable<ProjectDeleteResponse> {
    return this.http.delete<ProjectDeleteResponse>(`/api/projects/${projectId}`);
  }

  connectProjectToDropbox(projectId: number): Observable<ProjectWithDropboxResultResponse> {
    return this.http.patch<ProjectWithDropboxResultResponse>(`/api/projects/${projectId}/dropbox/connect`, {});
  }

  connectProjectToCalendar(projectId: number): Observable<ProjectResponse> {
    return this.http.patch<ProjectResponse>(`/api/projects/${projectId}/calendar/connect`, {});
  }

  joinDropbox(projectId: number) : Observable<ProjectWithDropboxResultResponse> {
    return this.http.patch<ProjectWithDropboxResultResponse>(`/api/projects/${projectId}/dropbox/join`, {});
  }

  joinCalendar(projectId: number) : Observable<void> {
    return this.http.patch<void>(`/api/projects/${projectId}/calendar/join`, {});
  }

  disconnectDropbox(projectId: number) : Observable<ProjectWithDropboxResultResponse> {
    return this.http.delete<ProjectWithDropboxResultResponse>(`/api/projects/${projectId}/dropbox/disconnect`);
  }

  disconnectCalendar(projectId: number) : Observable<ProjectCalendarDisconnectionResponseDto> {
    return this.http.delete<ProjectCalendarDisconnectionResponseDto>(`/api/projects/${projectId}/google/disconnect`);
  }
}
