import { Injectable, signal } from '@angular/core';
import { AbstractStore } from './abstract.store';
import { SubtaskResponse } from '../models/subtask.model';
import { SubtaskService } from '../service/subtask.service';
import { catchError, EMPTY, finalize, Observable, switchMap, tap } from 'rxjs';
import { Page } from '../models/general.model';
import { HttpErrorResponse } from '@angular/common/http';
import { getDefaultErrorMessageForType } from '../utils';

@Injectable({
  providedIn: 'root',
})
export class SubtaskStore extends AbstractStore<SubtaskResponse, never> {
  private readonly currentTaskId = signal(0);

  private readonly updatingMap = signal<Map<number, boolean>>(new Map());

  readonly creating = signal(false);

  constructor(private subtaskService: SubtaskService) { super() }

  cacheSubtasks(taskId: number, page: number, size: number) : Observable<Page<SubtaskResponse>> {
    this.preLoading(page, size);
    return this.subtaskService.getSubtasksByTaskId(taskId, page, size).pipe(tap({
      next: response => {
        this.postLoading(response);
        this.currentTaskId.set(taskId);
      }
    }),
    catchError((err: HttpErrorResponse) => {
      this.postLoading(getDefaultErrorMessageForType(err.error));
      return EMPTY;
    }));
  }

  createSubtask(name: string) : Observable<Page<SubtaskResponse>> {
    const taskId = this.currentTaskId();

    if (taskId) {
      this.creating.set(true);
      return this.subtaskService.createSubtask({ name, taskId }).pipe(switchMap(() => {
        const cache = this.cache();
  
        return this.cacheSubtasks(taskId, cache.pageIndex, cache.pageSize);
      }),
      catchError((err: HttpErrorResponse) => {
        this.postLoading(getDefaultErrorMessageForType(err.error));
        return EMPTY;
      }),
      finalize(() => this.creating.set(false)));
    }
    return EMPTY;
  }

  updateSubtask(subtask: SubtaskResponse, arg: string | boolean) : Observable<SubtaskResponse> {
    const request = typeof arg === 'string' ? { name: arg, completed: subtask.completed, version: subtask.version }
                                            : { name: subtask.name, completed: arg, version: subtask.version };

    this.setUpdating(subtask.id, true);
    return this.subtaskService.updateSubtask(subtask.id, request).pipe(tap({
      next: response => {
        this.replace(response);
      }
    }),
    catchError((err: HttpErrorResponse) => {
      this.postLoading(getDefaultErrorMessageForType(err.error));
      return EMPTY;
    }),
    finalize(() => this.setUpdating(subtask.id, false)));
  }

  deleteSubtask(subtask: SubtaskResponse) : Observable<Page<SubtaskResponse>> {
    this.setUpdating(subtask.id, true);
    return this.subtaskService.deleteSubtask(subtask.id).pipe(switchMap(() => {
      const currentTaskId = this.currentTaskId();
      const cache = this.cache();

      if (currentTaskId) return this.cacheSubtasks(currentTaskId, cache.pageIndex, cache.pageSize);
      return EMPTY;
    }),
    catchError((err: HttpErrorResponse) => {
      this.postLoading(getDefaultErrorMessageForType(err.error));
      return EMPTY;
    }),
    finalize(() => this.setUpdating(subtask.id, false)));
  }

  setUpdating(id: number, updating: boolean) {
    this.updatingMap.update(cache => {
      const newMap = new Map(cache);

      newMap.set(id, updating);

      return newMap;
    });
  }

  getUpdating(id: number) : boolean {
    const updatingMap = this.updatingMap();

    return updatingMap.get(id) ?? false;
  }
}
