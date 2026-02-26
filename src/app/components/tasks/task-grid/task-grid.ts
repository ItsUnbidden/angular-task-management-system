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
  private projectService = inject(ProjectService);
  private taskService = inject(TaskService);
  
  project = this.projectService.project;
  tasks = this.taskService.tasks;
  currentUser = this.userService.user;
  isLoadingTasks = this.taskService.isLoadingTasks;

  taskPageIndex = signal(0);
  taskPageSize = signal(6);
  totalTasks = this.taskService.totalTasks;

  isAdmin = this.projectService.isAdmin;

  constructor(private dialog: MatDialog, private router: Router) {
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
