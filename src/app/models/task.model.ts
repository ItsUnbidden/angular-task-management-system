import { DropboxOperationResult, ThirdPartyOperationResult } from "./external.model";
import { Entity } from "./general.model";

export interface TaskResponse extends Entity {
  name: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: string;
  projectId: number;
  projectName: string;
  assigneeId?: number;
  assigneeUsername?: string;
  amountOfMessages: number;
  progress: number;
  labelIds: number[];
  version: number;
}

export interface TaskCreateRequest {
  name: string;
  description?: string;
  priority: TaskPriority;
  dueDate?: string;
  projectId: number;
  assigneeId?: number;
  labelIds: number[];
}

export interface TaskUpdateRequest {
  name: string;
  description?: string;
  priority: TaskPriority;
  dueDate?: string;
  newAssigneeId?: number;
  labelIds: number[];
  version: number;
}

export interface TaskUpdateStatusRequest {
  newStatus: TaskStatus;
}

export interface TaskFilter {
  assigneeId?: number;
  dueDateFrom?: string;
  dueDateTo?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  labelIds?: number[];
}

export interface TaskDeleteResponse {
  taskName: string;
  dropboxFolderDeleted: DropboxOperationResult;
  calendarDeleted: ThirdPartyOperationResult;
}

export type TaskStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';
