import { inject, Injectable, signal } from '@angular/core';
import { ProjectStore } from './project.store';
import { TaskStore } from './task.store';
import { Page, ProjectResponse, TableState, TaskResponse } from '../models';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DashboardStore {
  private readonly projectStore = inject(ProjectStore);
  private readonly myTaskStore = inject(TaskStore);

  readonly projectsCache = this.projectStore.cache;
  readonly myTasksCache = this.myTaskStore.cache;

  cacheMyProjects(filter: string, state: TableState) : Observable<Page<ProjectResponse>> {
    return this.projectStore.cacheMyProjects(filter, state);
  }

  cacheMyTasks(filter: string, state: TableState) : Observable<Page<TaskResponse>> {
    return this.myTaskStore.cacheMyTasks(filter, state);
  }

  cachePublicProjects(filter: string, state: TableState) : Observable<Page<ProjectResponse>> {
    return this.projectStore.cachePublicProjects(filter, state);
  }
}