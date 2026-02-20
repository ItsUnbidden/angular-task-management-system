import { CommonModule } from '@angular/common';
import { Component, signal, ViewChild } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs'
import { ProjectService } from '../../service/project.service';
import { TaskService } from '../../service/task.service';
import { ProjectResponse, TaskResponse } from '../../models';
import { MatDialog } from '@angular/material/dialog';
import { NewProjectDialog } from '../projects/new-project/new-project-dialog';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, MatTabsModule, MatTableModule, MatButtonModule, MatPaginatorModule, MatSortModule, MatFormFieldModule, MatInputModule, MatProgressSpinnerModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  projectColumns: string[] = ['name', 'startDate', 'endDate', 'status', 'isPrivate'];
  taskColumns: string[] = ['name', 'priority', 'status', 'dueDate', 'projectName', 'assigneeUsername'];

  projectDS = new MatTableDataSource<ProjectResponse>([]);
  taskDS = new MatTableDataSource<TaskResponse>([]);

  isLoadingProjects = signal(false);
  isLoadingTasks = signal(false);
  error: string | null = null;

  @ViewChild('projectsPaginator') projectsPaginator!: MatPaginator;
  @ViewChild('tasksPaginator') tasksPaginator!: MatPaginator;

  @ViewChild('projectsSort') projectsSort!: MatSort;
  @ViewChild('tasksSort') tasksSort!: MatSort;

  constructor(private projectService: ProjectService,
              private taskService: TaskService,
              private dialog: MatDialog,
              private router: Router) {}

  ngOnInit() {
    this.loadMyProjects();
    this.loadMyTasks();
  }

  ngAfterViewInit() {
    this.projectDS.paginator = this.projectsPaginator;
    this.projectDS.sort = this.projectsSort;

    this.taskDS.paginator = this.tasksPaginator;
    this.taskDS.sort = this.tasksSort;
  }

  loadMyProjects() {
    this.isLoadingProjects.set(true);
    this.error = null;

    this.projectService.getMyProjects().subscribe({
      next: (projects) => {
        this.projectDS.data = projects;
        this.isLoadingProjects.set(false);
      },
      error: (err) => {
        this.error = this.humanError(err);
        this.isLoadingProjects.set(false);
      }
    });
  }

  loadMyTasks() {
    this.isLoadingTasks.set(true);
    this.error = null;

    this.taskService.getMyTasks().subscribe({
      next: (tasks) => {
        this.taskDS.data = tasks;
        this.isLoadingTasks.set(false);
      },
      error: (err) => {
        this.error = this.humanError(err);
        this.isLoadingTasks.set(false);
      }
    });
  }

  filterProjects(value: string) {
    this.projectDS.filter = value.trim().toLowerCase();
  }

  filterTasks(value: string) {
    this.taskDS.filter = value.trim().toLowerCase();
  }

  openNewProjectDialog() {
    const ref = this.dialog.open(NewProjectDialog, {
      width: '420px',
      disableClose: true
    });

    ref.afterClosed().subscribe(result => {
      if (result) {
        this.projectService.createProject(result).subscribe({
          next: () => this.loadMyProjects(),
          error: (err) => {
            console.error('Failed to create project:', err);
            this.error = this.humanError(err);
          }
        });
      }
    });
  }

  selectProject(p: ProjectResponse) {
    this.router.navigateByUrl(`/projects/${p.id}`);
  }

  private humanError(err: any): string {
    if (err?.status === 401) return 'Not authenticated (token missing/expired).';
    if (err?.status === 403) return 'No permission for this data.';
    return 'Request failed.';
  }
}
