import { Injectable, signal } from '@angular/core';
import { AbstractStore } from './abstract.store';
import { TaskService } from '../service/task.service';
import { catchError, EMPTY, finalize, Observable, of, Subject, takeUntil, tap } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { getDefaultErrorMessageForType } from '../utils';
import { TaskDeleteResponse, TaskFilter, TaskResponse, TaskUpdateRequest, TaskUpdateStatusRequest } from '../models/task.model';
import { Page, SingleItemCache, TableState } from '../models/general.model';
import { SimpleApiError } from '../models/error.model';

@Injectable({
  providedIn: 'root'
})
export class TaskStore extends AbstractStore<TaskResponse, TaskFilter | string> {
  readonly selectedTaskCache = signal<SingleItemCache<TaskResponse>>({ isLoading: false, error: null });

  private readonly cancelTasksLoading$ = new Subject<void>();

  private projectId = 0;

  constructor(private readonly taskService: TaskService) { super() }

  cacheMyTasks(filter: string, state: TableState) : Observable<Page<TaskResponse>> {
    this.cancelTasksLoading$.next();
    this.preLoading(state.pageIndex, state.pageSize, filter, state.sortActive, state.sortDirection);
    return this.taskService.getMyTasks(
      filter?.trim() ?? '',
      state.pageIndex,
      state.pageSize,
      state.sortActive,
      state.sortDirection
    )
    .pipe(
      takeUntil(this.cancelTasksLoading$),
      tap({
        next: page => {
          this.projectId = 0;
          this.postLoading(page);
        }
      }),
      catchError(this.catchErrorDefault)
    );
  }

  cacheProjectTasks(projectId: number) : Observable<Page<TaskResponse>>;
  cacheProjectTasks(projectId: number, page: number, size: number, filter?: TaskFilter) : Observable<Page<TaskResponse>>;

  cacheProjectTasks(projectId: number, page?: number, size?: number, filter?: TaskFilter) : Observable<Page<TaskResponse>> {
    this.cancelTasksLoading$.next();
    const cache = this.cache();
    const currentFilter = filter ?? (cache.filter && typeof cache.filter !== 'string' ? cache.filter : {});
    const currentPage = page ?? cache.pageIndex;
    const currentSize = size ?? cache.pageSize;

    this.preLoading(currentPage, currentSize, currentFilter);
    return this.taskService.getFilteredTasksInProject(
        projectId,
        currentFilter,
        currentPage,
        currentSize).pipe(
      takeUntil(this.cancelTasksLoading$),
      tap({
        next: res => {
          this.projectId = projectId;
          this.postLoading(res);
        }
      }),
      catchError(this.catchErrorDefault)
    );
  }

  cacheSelectedTask(taskId: number, forceReload?: boolean) : Observable<TaskResponse> {
    if (!forceReload) {
      const currentCachedTask = this.selectedTaskCache().item;

      if (currentCachedTask && currentCachedTask.id === taskId) return of(currentCachedTask);

      const tasksCache = this.cache();
      const existing = tasksCache.page?.content.find(t => t.id === taskId);
      
      if (existing) {
        this.selectedTaskCache.set({ item: existing, isLoading: false, error: null });
        return of(existing);
      } 
    }

    this.setSelectedTaskIsLoading(true);
    return this.taskService.getTaskById(taskId).pipe(tap({
      next: t => {
        this.selectedTaskCache.set({ item: t, isLoading: false, error: null });
      }
    }),
    catchError((err: HttpErrorResponse) => {
      const error = err.error as SimpleApiError;

      this.setSelectedTaskError(getDefaultErrorMessageForType(error));
      return EMPTY;
    }));
  }

  updateCachedTask(request: TaskUpdateRequest | TaskUpdateStatusRequest) : Observable<TaskResponse> {
    const selectedTask = this.selectedTaskCache().item;

    if (selectedTask) {
      const next = (t: TaskResponse) => {
        this.selectedTaskCache.set({ item: t, isLoading: false, error: null });
      };
      const error = () => this.setSelectedTaskIsLoading(false);

      this.setSelectedTaskIsLoading(true);
      return this.isStatusUpdateRequest(request)
          ? this.taskService.updateTaskStatus(selectedTask.id, request).pipe(tap({ next, error }))
          : this.taskService.updateTask(selectedTask.id, request).pipe(tap({ next, error }));
    }
    return EMPTY;
  }

  deleteTask(taskId: number) : Observable<TaskDeleteResponse> {
    this.setSelectedTaskIsLoading(true);
    return this.taskService.deleteTask(taskId).pipe(
      tap({
        next: () => {
          this.clearSelectedTask();
        },
        error: () => this.setSelectedTaskIsLoading(false)
      })
    );
  }

  updateProgress() : Observable<number> {
    const taskId = this.selectedTaskCache().item?.id;

    if (taskId) return this.taskService.getProgress(taskId).pipe(tap({
      next: progress => {
        this.selectedTaskCache.update(cache => {
          const task = cache.item;

          if (task) {
            return { ...cache, item: { ...task, progress } };
          }
          return cache;
        });
      }
    }),
    catchError(() => of(0)));
    return of(0);
  }

  clearSelectedTask() {
    this.selectedTaskCache.set({ isLoading: false, error: null });
  }

  private setSelectedTaskIsLoading(value: boolean) {
    this.selectedTaskCache.update(cache => {
      return { ...cache, isLoading: value, error: null };
    });
  }

  private setSelectedTaskError(error: string | null) {
    this.selectedTaskCache.update(cache => {
      return { ...cache, isLoading: false, error };
    });
  }

  private isStatusUpdateRequest(request: TaskUpdateRequest | TaskUpdateStatusRequest) : request is TaskUpdateStatusRequest {
    return 'newStatus' in request;
  }

  get currentProjectId() : number {
    return this.projectId;
  } 
}
