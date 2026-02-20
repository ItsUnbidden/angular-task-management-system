import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { ProjectCreateRequest, ProjectResponse, ProjectUpdateRequest } from '../models';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ProjectService {
  project = signal<ProjectResponse | null>(null);
  isLoading = signal(false);

  constructor(private http: HttpClient) {}

  loadProjectToCache(projectId: number) {
    this.isLoading.set(true);
    this.getProjectById(projectId).subscribe({
      next: (p) => this.project.set(p),
      error: (error) => {
        console.error('Failed to load project.', error);
        this.project.set(null);
      },
      complete: () => this.isLoading.set(false)
    });
  }

  updateCachedProject(projectId: number, request: ProjectUpdateRequest) {
    this.isLoading.set(true);
    this.updateProject(projectId, request).subscribe({
      next: (p) => this.project.set(p),
      error: (error) => {
        console.error('Failed to update project.', error);
      },
      complete: () => this.isLoading.set(false)
    });
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
}
