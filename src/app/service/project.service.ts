import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { GeneralApiError, ProjectCreateRequest, ProjectResponse, ProjectRoleUpdateRequest, ProjectUpdateRequest, UserResponse } from '../models';
import { environment } from '../../environments/environment';
import { UserService } from './user.service';
import { toSignal } from '@angular/core/rxjs-interop';

@Injectable({
  providedIn: 'root',
})
export class ProjectService {
  private userService = inject(UserService);

  readonly project = signal<ProjectResponse | null>(null);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);

  readonly currentUser = toSignal(this.userService.ensureUserLoaded(), { initialValue: undefined });
  readonly currentProjectRole = computed(() => {
    const project = this.project();
    const user = this.currentUser();

    return (project && user) ? project.projectRoles.find(pr => pr.userId === user.id) ?? null : null;
  });

  readonly isCreator = computed(() => {
    const projectRole = this.currentProjectRole();

    return (projectRole) ? projectRole.roleType === 'CREATOR' : false;
  });
  readonly isAdmin = computed(() => {
    const projectRole = this.currentProjectRole();

    return (projectRole) ? projectRole.roleType === 'ADMIN' || projectRole.roleType === 'CREATOR' : false;
  });
  readonly isContributor = computed(() => {
    const projectRole = this.currentProjectRole();

    return (projectRole) ? projectRole.roleType === 'CONTRIBUTOR' || projectRole.roleType === 'ADMIN' || projectRole.roleType === 'CREATOR' : false;
  });

  constructor(private http: HttpClient) {}

  loadProjectToCache(projectId: number) : Observable<ProjectResponse> {
    this.error.set(null);
    this.isLoading.set(true);
    return this.getProjectById(projectId).pipe(tap({
      next: (p) => {
        this.project.set(p);
        this.isLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {      
        this.project.set(null);
        this.isLoading.set(false);
        
        const error = err.error as GeneralApiError;

        this.error.set(error ? error.error : 'Unknown error occured while loading the project.');
      }
    }));
  }

  updateCachedProject(projectId: number, request: ProjectUpdateRequest) : Observable<ProjectResponse> {
    this.error.set(null);
    this.isLoading.set(true);
    return this.updateProject(projectId, request).pipe(tap({
      next: (p) => {
        this.project.set(p)
        this.isLoading.set(false)
      },
      error: (err) => {
        this.isLoading.set(false)
        
        const error = err.error as GeneralApiError;

        this.error.set(error ? error.error : 'Unknown error occured while updating the project.');
      }
    }));
  }

  clearCachedProject() {
    this.error.set(null);
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

  connectProjectToDropbox(projectId: number): Observable<ProjectResponse> {
    this.isLoading.set(true);
    return this.http.patch<ProjectResponse>(`${environment.apiUrl}/api/projects/${projectId}/dropbox/connect`, {}).pipe(tap({
      next: project => {
        this.project.set(project);
      },
      finalize: () => {
        this.isLoading.set(false);
      }
    }));
  }

  connectProjectToCalendar(projectId: number): Observable<ProjectResponse> {
    this.isLoading.set(true);
    return this.http.patch<ProjectResponse>(`${environment.apiUrl}/api/projects/${projectId}/calendar/connect`, {}).pipe(tap({
      next: project => {
        this.project.set(project);
      },
      finalize: () => {
        this.isLoading.set(false);
      }
    }));
  }

  joinDropbox(projectId: number) : Observable<void> {
    return this.http.patch<void>(`${environment.apiUrl}/api/projects/${projectId}/dropbox/join`, {});
  }

  joinCalendar(projectId: number) : Observable<void> {
    return this.http.patch<void>(`${environment.apiUrl}/api/projects/${projectId}/calendar/join`, {});
  }

  disconnectDropbox(projectId: number) : Observable<ProjectResponse> {
    this.isLoading.set(true);
    return this.http.delete<ProjectResponse>(`${environment.apiUrl}/api/projects/${projectId}/dropbox/disconnect`).pipe(tap({
      next: (project) => {
        this.project.set(project);
      },
      finalize: () => {
        this.isLoading.set(false);
      }
    }))
  }

  disconnectCalendar(projectId: number) : Observable<ProjectResponse> {
    this.isLoading.set(true);
    return this.http.delete<ProjectResponse>(`${environment.apiUrl}/api/projects/${projectId}/google/disconnect`).pipe(tap({
      next: (project) => {
        this.project.set(project);
      },
      finalize: () => {
        this.isLoading.set(false);
      }
    }))
  }
}
