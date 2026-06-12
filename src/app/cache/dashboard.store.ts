import { inject, Injectable } from '@angular/core';
import { ProjectStore } from './project.store';
import { TaskStore } from './task.store';
import { Observable } from 'rxjs';
import { Page, TableState } from '../models/general.model';
import { ProjectResponse } from '../models/project.model';
import { TaskResponse } from '../models/task.model';

@Injectable({
  providedIn: 'root'
})
export class DashboardStore {
  private readonly projectStore = inject(ProjectStore);
  private readonly myTaskStore = inject(TaskStore);

  readonly projectsCache = this.projectStore.cache.asReadonly();
  readonly myTasksCache = this.myTaskStore.cache.asReadonly();

  cacheMyProjects(filter: string, state: TableState) : Observable<Page<ProjectResponse>> {
    return this.projectStore.cacheMyProjects(filter, state);
  }

  cacheMyTasks(filter: string, state: TableState) : Observable<Page<TaskResponse>> {
    return this.myTaskStore.cacheMyTasks(filter, state);
  }

  cachePublicProjects(filter: string, state: TableState) : Observable<Page<ProjectResponse>> {
    return this.projectStore.cachePublicProjects(filter, state);
  }

  clearProjectsCache() {
    this.projectStore.clearCache();
  }
}