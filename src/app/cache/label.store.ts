import { computed, inject, Injectable, signal } from '@angular/core';
import { AbstractStore } from './abstract.store';
import { LabelResponse, Page } from '../models';
import { catchError, Observable, of, tap } from 'rxjs';
import { LabelService } from '../service/label.service';
import { TaskStore } from './task.store';

@Injectable({
  providedIn: 'root'
})
export class LabelStore extends AbstractStore<LabelResponse, never> {
  private readonly taskStore = inject(TaskStore);

  readonly selectedTaskLabels = computed(() => {
    const task = this.taskStore.selectedTaskCache().item;

    return task ? this.cache().page?.content?.filter(l => l.taskIds.includes(task.id)) ?? [] : [];
  });

  public static readonly PALETTE_ITEMS = ['blue', 'green', 'red', 'yellow', 'cyan', 'deep-blue', 'magenta', 'purple', 'orange', 'pink', 'yellow-green'];

  private projectId = 0;

  constructor(private readonly labelService: LabelService) { super() };
  
  cacheLabelsForProject(projectId: number, forceReload?: boolean) : Observable<Page<LabelResponse>> {
    const currentCache = this.cache();

    if (!forceReload && currentCache.page && this.projectId === projectId) return of(currentCache.page);

    this.preLoading(0, -1);
    return this.labelService.getLabelsForProject(projectId).pipe(
      tap({
        next: page => {
          this.postLoading(page);
          this.projectId = projectId;
        }
      }),
      catchError(this.catchErrorDefault)
    );
  }
}
