import { DropboxOperationResult } from "./external.model";
import { Entity } from "./general.model";

export interface ProjectResponse extends Entity {
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  status: ProjectStatus;
  projectRoles: ProjectRoleResponse[];
  progress: number;
  isPrivate: boolean;
  isDropboxConnected: boolean;
  isCalendarConnected: boolean;
}

export interface ProjectWithDropboxResultResponse extends ProjectResponse {
  dropboxResult: DropboxOperationResult;
}

export interface ProjectCreateRequest {
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  isPrivate?: boolean;
}

export interface ProjectUpdateRequest {
  name: string;
  description?: string;
  startDate: string;
  endDate?: string;
  isPrivate?: boolean;
}

export interface ProjectDeleteResponse {
  projectId: number;
  dropboxResult: DropboxOperationResult;
}

export interface ProjectUpdateStatusRequest {
  newStatus: 'IN_PROGRESS' | 'COMPLETED';
}

export interface ProjectRoleResponse extends Entity {
  userId: number;
  username: string;
  roleType: ProjectRoleType;
  isDropboxConnected: boolean;
  isCalendarConnected: boolean;
}

export interface ProjectRoleUpdateRequest {
  newRole: ProjectRoleType;
}

export type ProjectStatus = 'INITIATED' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';

export type ProjectRoleType = 'CREATOR' | 'ADMIN' | 'CONTRIBUTOR';
