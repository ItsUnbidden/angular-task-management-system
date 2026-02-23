import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { Observable, tap, throwError } from 'rxjs';
import { ProjectCreateRequest, ProjectResponse, ProjectRoleUpdateRequest, ProjectUpdateRequest, UserResponse } from '../models';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ProjectService {
  project = signal<ProjectResponse | null>(null);
  isLoading = signal(false);

  constructor(private http: HttpClient) {}

  loadProjectToCache(projectId: number) : Observable<ProjectResponse> {
    this.isLoading.set(true);
    return this.getProjectById(projectId).pipe(tap({
      next: (p) => {
        this.project.set(p);
        this.isLoading.set(false);
      },
      error: (err) => {      
        this.project.set(null);
        this.isLoading.set(false);
        return throwError(() => err);
      }
    }));
  }

  updateCachedProject(projectId: number, request: ProjectUpdateRequest) : Observable<ProjectResponse> {
    this.isLoading.set(true);
    return this.updateProject(projectId, request).pipe(tap({
      next: (p) => {
        this.project.set(p)
        this.isLoading.set(false)
      },
      error: (err) => {
        this.isLoading.set(false)
        return throwError(() => err);
      }
    }));
  }

  clearCachedProject() {
    this.project.set(null);
  }

  getProjectById(projectId: number) : Observable<ProjectResponse> {
    return this.http.get<ProjectResponse>(`${environment.apiUrl}/api/projects/${projectId}`);
  }

  getMyProjects() : Observable<ProjectResponse[]> {
    return this.http.get<ProjectResponse[]>(`${environment.apiUrl}/api/projects/me`);
  }

  createProject(request: ProjectCreateRequest) : Observable<ProjectResponse> {
    return this.http.post<ProjectResponse>(`${environment.apiUrl}/api/projects`, request);
  }

  updateProject(projectId: number, request: ProjectUpdateRequest) : Observable<ProjectResponse> {
    return this.http.put<ProjectResponse>(`${environment.apiUrl}/api/projects/${projectId}`, request);
  }

  addUserToProject(projectId: number, username: string) : Observable<ProjectResponse> {
    this.isLoading.set(true);
    return this.http.post<ProjectResponse>(`${environment.apiUrl}/api/projects/${projectId}/users/${username}/add`, {}).pipe(tap({
      next: p => {
        this.project.set(p);
      },
      finalize: () => {
        this.isLoading.set(false);
      }
    }));
  }

  removeUserFromProject(projectId: number, userId: number) : Observable<ProjectResponse> {
    return this.http.delete<ProjectResponse>(`${environment.apiUrl}/api/projects/${projectId}/users/${userId}/remove`).pipe(tap({
      next: p => {
        this.project.set(p);
      },
      finalize: () => {
        this.isLoading.set(false);
      }
    }));
  }

  quitProject(projectId: number) : Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/api/projects/${projectId}/quit`);
  }

  changeMemberRole(projectId: number, userId: number, request: ProjectRoleUpdateRequest) : Observable<ProjectResponse> {
    return this.http.patch<ProjectResponse>(`${environment.apiUrl}/api/projects/${projectId}/users/${userId}/roles`, request).pipe(tap({
      next: p => {
        this.project.set(p);
      },
      finalize: () => {
        this.isLoading.set(false);
      }
    }));
  }

  deleteProject(projectId: number) : Observable<void> {
    this.isLoading.set(true);
    return this.http.delete<void>(`${environment.apiUrl}/api/projects/${projectId}`).pipe(tap({
      next: () => {
        if (this.project()?.id === projectId) {
          this.project.set(null);
        }
      },
      finalize: () => {
        this.isLoading.set(false);
      }
    }));
  }
}
