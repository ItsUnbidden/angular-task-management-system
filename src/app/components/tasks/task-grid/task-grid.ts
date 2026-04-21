import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { EssentialUserResponse, GeneralApiError, LabelResponse, TaskFilter, TaskPriority, TaskResponse, TaskStatus } from '../../../models';
import { ProjectService } from '../../../service/project.service';
import { TaskService } from '../../../service/task.service';
import { MatDialog } from '@angular/material/dialog';
import { NewTaskDialog } from '../new-task-dialog/new-task-dialog';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UserService } from '../../../service/user.service';
import { MatSelectModule } from '@angular/material/select';
import { FormControl, FormGroup, ReactiveFormsModule} from "@angular/forms";
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { LabelService } from '../../../service/label.service';
import { HttpErrorResponse } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatIconModule } from "@angular/material/icon";
import { toLocalDateString } from '../../../utils';

interface TaskStatusOption {
  status: TaskStatus;
  statusView: string;
  class: string;

}
interface TaskPriorityOption {
  priority: TaskPriority;
  priorityView: string;
  class: string;
}

@Component({
  selector: 'app-task-grid',
  imports: [CommonModule, MatCardModule, MatDividerModule, MatProgressSpinnerModule, MatChipsModule, MatPaginatorModule, MatButtonModule, MatSelectModule, ReactiveFormsModule, MatDatepickerModule, MatNativeDateModule, MatIconModule],
  templateUrl: './task-grid.html',
  styleUrl: './task-grid.css',
})
export class TaskGrid {
  private userService = inject(UserService);
  private projectService = inject(ProjectService);
  private taskService = inject(TaskService);
  private labelService = inject(LabelService);
  
  readonly project = this.projectService.project;
  readonly projectUsers = computed(() => {
    const project = this.project();
    
    return (project) ? project.projectRoles.map<EssentialUserResponse>(pr => {
      return { id: pr.userId, username: pr.username };
    }) : null;
  });
  readonly projectLabels = signal<LabelResponse[]>([]);
  readonly tasks = this.taskService.tasks;
  readonly currentUser = this.userService.user;
  readonly isLoadingTasks = this.taskService.isLoadingTasks;

  readonly tasksLoadingError = this.taskService.tasksLoadingError;

  readonly taskPageIndex = signal(0);
  readonly taskPageSize = signal(6);
  readonly totalTasks = this.taskService.totalTasks;
  readonly taskFilter = signal<TaskFilter>({});

  readonly isAdmin = this.projectService.isAdmin;
  readonly isManager = this.userService.isManager;

  statusOptions: TaskStatusOption[] = [
    { status: 'NOT_STARTED', statusView: 'Not started', class: 'status-initiated' },
    { status: 'IN_PROGRESS', statusView: 'In progress', class: 'status-in-progress' },
    { status: 'COMPLETED', statusView: 'Completed', class: 'status-completed' },
    { status: 'OVERDUE', statusView: 'Overdue', class: 'status-overdue' }
  ]

  priorityOptions: TaskPriorityOption[] = [
    { priority: 'LOW', priorityView: 'Low', class: 'priority-low' },
    { priority: 'MEDIUM', priorityView: 'Medium', class: 'priority-medium' },
    { priority: 'HIGH', priorityView: 'High', class: 'priority-high' }
  ]

  filterForm = new FormGroup({
    assigneeId: new FormControl<number | null>(null),
    status: new FormControl<TaskStatus | null>(null),
    priority: new FormControl<TaskPriority | null>(null),
    dueDateFrom: new FormControl<Date | null>(null),
    dueDateTo: new FormControl<Date | null>(null),
    labelIds: new FormControl<number[]>([])
  });

  constructor(private dialog: MatDialog, private snackBar: MatSnackBar, private router: Router) {
    effect(() => {
      const project = this.project();

      if (project) {
        this.handleCacheProjectTasks();
        this.labelService.getLabelsForProject(project.id).subscribe({
          next: labels => {
            this.projectLabels.set(labels);
          },
          error: (err: HttpErrorResponse) => {
            const error = err.error as GeneralApiError;

            this.snackBar.open((error) ? `Error: ${error.errors[0]}` : 'An unknown error occured while loading project labels.', 'Dismiss', {
              duration: 5000
            });
          }
        });
      }
    });
    
    effect(() => {
      const isLoadingTasks = this.isLoadingTasks();

      untracked(() => {
        if (isLoadingTasks) {
          this.filterForm.disable({ emitEvent: false });
        } else {
          this.filterForm.enable({ emitEvent: false });
        }
      });
    });

    this.filterForm.valueChanges.subscribe(() => {
      const formValue = this.filterForm.value;

      this.taskFilter.set({
        assigneeId: formValue.assigneeId ?? undefined,
        status: formValue.status ?? undefined,
        priority: formValue.priority ?? undefined,
        dueDateFrom: toLocalDateString(formValue.dueDateFrom ?? null),
        dueDateTo: toLocalDateString(formValue.dueDateTo ?? null),
        labelIds: formValue.labelIds ?? undefined
      });
      this.handleCacheProjectTasks();
    });
  }

  onTaskPage(event: PageEvent) {
    this.taskPageIndex.set(event.pageIndex);
    this.taskPageSize.set(event.pageSize);

    this.handleCacheProjectTasks();
  }

  onCreateNewTask() {
    const project = this.project();

    if (project) {
      this.dialog.open(NewTaskDialog, {
        data: {
          projectId: project.id,
          projectMembers: project.projectRoles.map(pr => {
            return { id: pr.userId, username: pr.username };
          })
        },
        disableClose: true,
        width: '420px'
      })
      .afterClosed()
      .subscribe(confirmed => {
        if (confirmed) {         
          this.handleCacheProjectTasks(); 
        }
      });
    }
  }

  onOpenTask(task: TaskResponse) {
    this.router.navigateByUrl(`/projects/${task.projectId}/tasks/${task.id}`);
  }
  
  onClearFilters() {
    this.taskFilter.set({});
    this.filterForm.patchValue({
      assigneeId: null,
      status: null,
      priority: null,
      dueDateFrom: null,
      dueDateTo: null,
      labelIds: []
    });
    this.handleCacheProjectTasks();
  }

  onTryAgain() {
    this.handleCacheProjectTasks();
  }

  parseEnumColor(key: string | null): string {
    switch (key) {
      case 'INITIATED': return 'status-initiated';
      case 'NOT_STARTED': return 'status-initiated';
      case 'IN_PROGRESS': return 'status-in-progress';
      case 'COMPLETED': return 'status-completed';
      case 'OVERDUE': return 'status-overdue';
      case 'LOW': return 'priority-low';
      case 'MEDIUM': return 'priority-medium';
      case 'HIGH': return 'priority-high';
      default: return '';
    }
  }

  parseEnumText(key: string | null): string {
    switch (key) {
      case 'INITIATED': return 'Initiated';
      case 'NOT_STARTED': return 'Not started';
      case 'IN_PROGRESS': return 'In Progress';
      case 'COMPLETED': return 'Completed';
      case 'OVERDUE': return 'Overdue';
      case 'LOW': return 'Low';
      case 'MEDIUM': return 'Medium';
      case 'HIGH': return 'High';
      default: return '';
    }
  }

  private handleCacheProjectTasks() {
    const project = this.project();

    if (project) {
      this.taskService.cacheProjectTasksPage(project.id, this.taskFilter(), this.taskPageIndex(), this.taskPageSize()).subscribe({
        error: (err: HttpErrorResponse) => {
          const error = err.error as GeneralApiError;
  
          this.snackBar.open((error) ? `Error: ${error.errors[0]}` : 'An unknown error occured while loading project tasks.', 'Dismiss', {
            duration: 5000
          });
        }
      });
    }
  }
}
