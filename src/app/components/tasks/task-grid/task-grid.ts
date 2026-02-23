import { Component, computed, effect, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ProjectResponse, TaskResponse } from '../../../models';
import { ProjectService } from '../../../service/project.service';
import { TaskService } from '../../../service/task.service';
import { MatDialog } from '@angular/material/dialog';
import { NewTaskDialog } from '../new-task-dialog/new-task-dialog';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UserService } from '../../../service/user.service';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-task-grid',
  imports: [ CommonModule, MatCardModule, MatDividerModule, MatProgressSpinnerModule, MatChipsModule, MatPaginatorModule, MatButtonModule ],
  templateUrl: './task-grid.html',
  styleUrl: './task-grid.css',
})
export class TaskGrid {
  private userService = inject(UserService);
  
  project = signal<ProjectResponse | null>(null);
  tasks = signal<TaskResponse[]>([]);

  isLoadingTasks = signal(false);

  taskPageIndex = signal(0);
  taskPageSize = signal(6);
  totalTasks = signal(0);

  currentUser = toSignal(this.userService.ensureUserLoaded(), { initialValue: undefined });
  currentProjectRole = computed(() => {
    const project = this.project();
    const user = this.currentUser();

    return (project && user) ? project.projectRoles.find(pr => pr.userId === user.id) ?? null : null;
  });

  constructor(private dialog: MatDialog, private projectService: ProjectService, private taskService: TaskService, private router: Router) {
    this.project = this.projectService.project;
    this.tasks = this.taskService.tasks;
    this.isLoadingTasks = this.taskService.isLoadingTasks;
    this.totalTasks = this.taskService.totalTasks;

    effect(() => {
      const project = this.project();

      if (project) {
        this.taskService.cacheProjectTasksPage(project.id, this.taskPageIndex(), this.taskPageSize());
      }
    })
  }

  onTaskPage(event: PageEvent) {
    const project = this.project();

    this.taskPageIndex.set(event.pageIndex);
    this.taskPageSize.set(event.pageSize);

    if (project) this.taskService.cacheProjectTasksPage(project.id, this.taskPageIndex(), this.taskPageSize());
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
          this.taskService.cacheProjectTasksPage(project.id, this.taskPageIndex(), this.taskPageSize());        
        }
      })
    }
  }

  onOpenTask(task: TaskResponse) {
    this.router.navigateByUrl(`/projects/${task.projectId}/tasks/${task.id}`);
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
}
