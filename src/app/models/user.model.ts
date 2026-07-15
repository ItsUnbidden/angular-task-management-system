import { Entity } from "./general.model";
import { ProjectDeleteResponse, ProjectWithDropboxResultResponse } from "./project.model";

export interface RegistrationRequest {
  username: string;
  email: string;
  password: string;
  repeatPassword: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface EssentialUserResponse extends Entity {
  username: string;
}

export interface UserResponse extends EssentialUserResponse {
  email: string;
  isLocked: boolean;
  roles: UserRole[];
  version: number;
}

export interface UserUpdateRequest {
  username: string;
  email: string;
  password?: string;
  repeatPassword?: string;
  version: number;
}

export interface UserDeleteResponse {
  deletedProjects: ProjectDeleteResponse[];
  quittedProjects: ProjectWithDropboxResultResponse[];
}

export interface Role extends Entity {
  name: string;
}

export type UserRole = 'USER' | 'MANAGER' | 'OWNER';
