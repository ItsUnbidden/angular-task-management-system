import { computed, inject, Injectable, signal } from '@angular/core';
import { AbstractStore } from './abstract.store';
import { Page, ProjectDeleteResponse, ProjectResponse, ProjectRoleUpdateRequest, ProjectUpdateRequest, SimpleApiError, SingleItemCache, TableState, UserAddToProjectResponse, UserRemoveFromProjectResponse } from '../models';
import { ProjectService } from '../service/project.service';
import { catchError, EMPTY, Observable, of, Subject, takeUntil, tap } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { getDefaultErrorMessageForType } from '../utils';
import { UserStore } from './user.store';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class ProjectStore extends AbstractStore<ProjectResponse, string> {
  private readonly userStore = inject(UserStore);

  readonly selectedProjectCache = signal<SingleItemCache<ProjectResponse>>({ isLoading: false, error: null });

  readonly currentUserCache = this.userStore.userCache;
  readonly currentProjectRole = computed(() => {
    const project = this.selectedProjectCache().item;
    const user = this.currentUserCache().item;

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

  private readonly cancelProjectsLoading$ = new Subject<void>();

  constructor(private readonly projectService: ProjectService, private readonly router: Router) { super() }

  cacheMyProjects(filter: string, state: TableState) : Observable<Page<ProjectResponse>> {
    this.cancelProjectsLoading$.next();
    this.preLoading(state.pageIndex, state.pageSize, filter, state.sortActive, state.sortDirection);
    return this.projectService.getMyProjects(
      filter?.trim() ?? '',
      state.pageIndex,
      state.pageSize,
      state.sortActive,
      state.sortDirection
    )
    .pipe(
      takeUntil(this.cancelProjectsLoading$),
      tap({
        next: page => this.postLoading(page)
      }),
      catchError(this.catchErrorDefault)
    );
  }

  cachePublicProjects(filter: string, state: TableState) : Observable<Page<ProjectResponse>> {
    this.cancelProjectsLoading$.next();
    this.preLoading(state.pageIndex, state.pageSize, filter, state.sortActive, state.sortDirection);
    return this.projectService.searchProjectsByName(
      filter?.trim() ?? '',
      state.pageIndex,
      state.pageSize,
      state.sortActive,
      state.sortDirection
    )
    .pipe(
      takeUntil(this.cancelProjectsLoading$),
      tap({
        next: page => this.postLoading(page)
      }),
      catchError(this.catchErrorDefault)
    );
  }

  cacheSelectedProject(projectId: number, forceReload?: boolean) : Observable<ProjectResponse> {
    this.setSelectedProjectError(null);

    if (!forceReload) {
      const cachedProject = this.cache().page?.content.find(p => p.id === projectId);
  
      if (cachedProject) {
        this.selectedProjectCache.set({ item: cachedProject, isLoading: false, error: null });
        return of(cachedProject);
      }
    }
    this.setSelectedProjectIsLoading(true);
    
    return this.projectService.getProjectById(projectId).pipe(
      tap({
        next: project => {
          this.selectedProjectCache.set({ item: project, isLoading: false, error: null });
        }
      }),
      catchError((err: HttpErrorResponse) => {
        const error = err.error as SimpleApiError;

        if (err.status === 403) {
          this.router.navigateByUrl('/forbidden');
        }

        this.setSelectedProjectError(getDefaultErrorMessageForType(error));
        return EMPTY;
      })
    );
  }

  updateCachedProject(request: ProjectUpdateRequest) : Observable<ProjectResponse> {
    const project = this.selectedProjectCache().item;

    if (project) {
      this.setSelectedProjectIsLoading(true);
  
      return this.projectService.updateProject(project.id, request).pipe(
        tap({
          next: response => {
            this.selectedProjectCache.set({ item: response, isLoading: false, error: null })
          }
        }),
        catchError((err: HttpErrorResponse) => {
          const error = err.error as SimpleApiError;
  
          this.setSelectedProjectError(getDefaultErrorMessageForType(error));
          return EMPTY;
        })
      );
    }
    return EMPTY;
  }

  addUserToProject(username: string) : Observable<UserAddToProjectResponse> {
    const project = this.selectedProjectCache()?.item;

    if (project) {
      this.setSelectedProjectIsLoading(true);
      return this.projectService.addUserToProject(project.id, username).pipe(tap({
        next: response => {
          this.selectedProjectCache.set({ item: response.project, isLoading: false, error: null });
        },
        finalize: () => this.setSelectedProjectIsLoading(false)
      }));
    }
    return EMPTY;
  }

  removeUserFromProject(userId: number) : Observable<UserRemoveFromProjectResponse> {
    const project = this.selectedProjectCache()?.item;

    if (project) {
      this.setSelectedProjectIsLoading(true);
      return this.projectService.removeUserFromProject(project.id, userId).pipe(tap({
        next: response => {
          this.selectedProjectCache.set({ item: response.project, isLoading: false, error: null });
        },
        finalize: () => this.setSelectedProjectIsLoading(false)
      }));
    }
    return EMPTY;
  }

  changeMemberRole(userId: number, request: ProjectRoleUpdateRequest) : Observable<ProjectResponse> {
    const project = this.selectedProjectCache()?.item;

    if (project) {
      this.setSelectedProjectIsLoading(true);
      return this.projectService.changeMemberRole(project.id, userId, request).pipe(tap({
        next: project => {
          this.selectedProjectCache.set({ item: project, isLoading: false, error: null });
        },
        finalize: () => this.setSelectedProjectIsLoading(false)
      }));
    }
    return EMPTY;
  }
  
  deleteProject() : Observable<ProjectDeleteResponse> {
    const project = this.selectedProjectCache()?.item;

    if (project) {
      this.setSelectedProjectIsLoading(true);
      return this.projectService.deleteProject(project.id).pipe(tap({
        next: () => {
          this.clearSelectedProject();
        },
        finalize: () => this.setSelectedProjectIsLoading(false)
      }));
    }
    return EMPTY;
  }

  quitProject() : Observable<UserRemoveFromProjectResponse> {
    const project = this.selectedProjectCache()?.item;

    if (project) {
      this.setSelectedProjectIsLoading(true);
      return this.projectService.quitProject(project.id).pipe(tap({
        next: () => {
          this.clearSelectedProject();
        },
        finalize: () => this.setSelectedProjectIsLoading(false)
      }));
    }
    return EMPTY;
  }

  connectProjectToDropbox(): Observable<ProjectResponse> {
    const project = this.selectedProjectCache()?.item;

    if (project) {
      this.setSelectedProjectIsLoading(true);
      return this.projectService.connectProjectToDropbox(project.id).pipe(tap({
        next: response => {
          this.selectedProjectCache.set({ item: response, isLoading: false, error: null });
        },
        finalize: () => this.setSelectedProjectIsLoading(false)
      }));
    }
    return EMPTY;
  }

  connectProjectToCalendar(): Observable<ProjectResponse> {
    const project = this.selectedProjectCache()?.item;

    if (project) {
      this.setSelectedProjectIsLoading(true);
      return this.projectService.connectProjectToCalendar(project.id).pipe(tap({
        next: response => {
          this.selectedProjectCache.set({ item: response, isLoading: false, error: null });
        },
        finalize: () => this.setSelectedProjectIsLoading(false)
      }));
    }
    return EMPTY;
  }

  clearSelectedProject() {
    this.selectedProjectCache.set({ isLoading: false, error: null });
  }

  setSelectedProjectIsLoading(value: boolean) {
    this.selectedProjectCache.update(cache => {
      return { ...cache, isLoading: value, error: null };
    });
  }

  setSelectedProjectError(error: string | null) {
    this.selectedProjectCache.set({ isLoading: false, error });
  }
}
