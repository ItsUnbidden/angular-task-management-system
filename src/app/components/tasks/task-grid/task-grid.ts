import { Component, computed, effect, inject, untracked } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { NewTaskDialog } from '../new-task-dialog/new-task-dialog';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSelectModule } from '@angular/material/select';
import { FormControl, FormGroup, ReactiveFormsModule} from "@angular/forms";
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from "@angular/material/icon";
import { getChipColor, getChipTextKey, toLocalDateString } from '../../../utils';
import { EMPTY, map, Observable, switchMap } from 'rxjs';
import { ProjectStore } from '../../../cache/project.store';
import { TaskStore } from '../../../cache/task.store';
import { UserStore } from '../../../cache/user.store';
import { LabelStore } from '../../../cache/label.store';
import { toSignal } from '@angular/core/rxjs-interop';
import { TaskStatus, TaskPriority, TaskResponse } from '../../../models/task.model';
import { EssentialUserResponse } from '../../../models/user.model';
import { Page } from '../../../models/general.model';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-task-grid',
  imports: [CommonModule, MatCardModule, MatDividerModule,
            MatProgressSpinnerModule, MatChipsModule, MatPaginatorModule,
            MatButtonModule, MatSelectModule, ReactiveFormsModule,
            MatDatepickerModule, MatNativeDateModule, MatIconModule,
            TranslatePipe],
  templateUrl: './task-grid.html',
  styleUrl: './task-grid.css',
})
export class TaskGrid {
  private static readonly DEFAULT_GRID_SIZE = 8;

  private readonly userStore = inject(UserStore);
  private readonly projectStore = inject(ProjectStore);
  private readonly taskStore = inject(TaskStore);
  private readonly labelStore = inject(LabelStore);

  private readonly route = inject(ActivatedRoute);
  
  protected readonly selectedProjectCache = this.projectStore.selectedProjectCache.asReadonly();
  protected readonly projectUsers = computed(() => {
    const project = this.selectedProjectCache().item;
    
    return (project) ? project.projectRoles.map<EssentialUserResponse>(pr => {
      return { id: pr.userId, username: pr.username };
    }) : null;
  });
  protected readonly tasks = this.taskStore.cache.asReadonly();
  protected readonly projectLabels = this.labelStore.cache.asReadonly();

  private readonly currentFilter = computed(() => {
    const filter = this.tasks().filter;

    if (filter && typeof filter !== 'string') {
      return filter;
    }
    return undefined;
  });

  protected readonly isAdmin = this.projectStore.isAdmin;
  protected readonly isManager = this.userStore.isManager;

  private readonly projectId = toSignal(
    this.route.paramMap.pipe(map(p => Number(p.get('projectId')))), { initialValue: 0 }
  );

  protected readonly filterForm = new FormGroup({
    assigneeId: new FormControl<number | null>(this.currentFilter()?.assigneeId ?? null),
    status: new FormControl<TaskStatus | null>(this.currentFilter()?.status ?? null),
    priority: new FormControl<TaskPriority | null>(this.currentFilter()?.priority ?? null),
    dueDateFrom: new FormControl<Date | null>(this.getDate(this.currentFilter()?.dueDateFrom)),
    dueDateTo: new FormControl<Date | null>(this.getDate(this.currentFilter()?.dueDateTo)),
    labelIds: new FormControl<number[]>(this.currentFilter()?.labelIds ?? [])
  });

  protected readonly priorityOptions: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH'];
  protected readonly statusOptions: TaskStatus[] = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE'];

  constructor(private readonly dialog: MatDialog,
              private readonly router: Router) {
    effect(() => {
      const projectId = this.projectId();

      if (projectId) {
        untracked(() => {
          this.taskStore.cacheProjectTasks(projectId, this.taskStore.currentProjectId === projectId ? this.tasks().pageIndex : 0, TaskGrid.DEFAULT_GRID_SIZE).subscribe();
          this.labelStore.cacheLabelsForProject(projectId).subscribe();
        });
      }
    });

    effect(() => {
      const tasks = this.tasks();

      untracked(() => {
        if (tasks.isLoading) {
          this.filterForm.disable({ emitEvent: false });
        } else {
          this.filterForm.enable({ emitEvent: false });
        }
      });
    });
    const projectId = this.projectId();

    if (projectId) {
      this.filterForm.valueChanges.pipe(
        switchMap(() => this.taskStore.cacheProjectTasks(projectId, 0, this.tasks().pageSize, {
          assigneeId: this.filterForm.value.assigneeId ?? undefined,
          status: this.filterForm.value.status ?? undefined,
          priority: this.filterForm.value.priority ?? undefined,
          dueDateFrom: toLocalDateString(this.filterForm.value.dueDateFrom ?? null),
          dueDateTo: toLocalDateString(this.filterForm.value.dueDateTo ?? null),
          labelIds: this.filterForm.value.labelIds ?? undefined
        }))
      ).subscribe();
    }
  }

  protected onTaskPage(event: PageEvent) {
    const project = this.selectedProjectCache()?.item;

    if (project) this.taskStore.cacheProjectTasks(project.id, event.pageIndex, event.pageSize).subscribe();
  }

  protected onCreateNewTask() {
    const project = this.selectedProjectCache()?.item;

    if (project) {
      this.dialog.open(NewTaskDialog, {
        data: {
          projectId: project.id,
          projectMembers: project.projectRoles.map(pr => {
            return { id: pr.userId, username: pr.username };
          })
        },
        disableClose: true,
        width: '500px'
      })
      .afterClosed().pipe(switchMap(confirmed => {
        if (confirmed) return this.cacheProjectTasks();
        return EMPTY;
      })).subscribe();
    }
  }

  protected onOpenTask(task: TaskResponse) {
    this.router.navigateByUrl(`/projects/${task.projectId}/tasks/${task.id}`);
  }
  
  protected onClearFilters() {
    this.filterForm.patchValue({
      assigneeId: null,
      status: null,
      priority: null,
      dueDateFrom: null,
      dueDateTo: null,
      labelIds: []
    });
    const project = this.selectedProjectCache()?.item;

    if (project) this.taskStore.cacheProjectTasks(project.id, this.tasks().pageIndex, this.tasks().pageSize, {}).subscribe();
  }

  protected onTryAgain() {
    const project = this.selectedProjectCache()?.item;

    if (project) this.taskStore.cacheProjectTasks(project.id, 0, TaskGrid.DEFAULT_GRID_SIZE, {}).subscribe();
  }

  protected cacheProjectTasks() : Observable<Page<TaskResponse>> {
    const project = this.selectedProjectCache().item;

    if (project) return this.taskStore.cacheProjectTasks(project.id);
    return EMPTY;
  }

  protected getChipColorLocal(status: string | null): string {
    return getChipColor(status);
  }

  protected getChipTextLocal(status: string | null): string {
    return getChipTextKey(status);
  }

  private getDate(value?: string) : Date | null {
    return value ? new Date(value) : null;
  }
}
