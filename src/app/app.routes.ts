import { Routes } from '@angular/router';
import { NoAuthGuard } from './guard/no-auth.guard';
import { AuthGuard } from './guard/auth.guard';

export const routes: Routes = [{
    path: '',
    pathMatch: "full",
    redirectTo: 'dashboard'
},
{
    path: 'auth',
    loadComponent: () => import('./components/auth/auth').then(m => m.Auth),
    canActivate: [NoAuthGuard]
},
{
    path: 'forbidden',
    loadComponent: () => import('./components/util/forbidden/forbidden').then(m => m.Forbidden),
    canActivate: [AuthGuard]
},
{
    path: 'dashboard',
    loadComponent: () => import('./components/dashboard/dashboard').then(m => m.Dashboard),
    canActivate: [AuthGuard]
},
{
    path: 'manager-controls',
    loadComponent: () => import('./components/util/manager-control-panel/manager-control-panel').then(m => m.ManagerControlPanel),
    canActivate: [AuthGuard]
},
{
    path: 'projects/:projectId',
    loadComponent: () => import('./components/projects/project').then(m => m.Project),
    canActivate: [AuthGuard],
    canActivateChild: [AuthGuard],
    children: [
        {
            path: '',
            pathMatch: 'full',
            loadComponent: () => import('./components/tasks/task-grid/task-grid').then(m => m.TaskGrid),
        },
        {
            path: 'tasks/:taskId',
            loadComponent: () => import('./components/tasks/task').then(m => m.Task),
        }
    ]
}];
