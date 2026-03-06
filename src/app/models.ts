export interface RegistrationRequest {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  repeatPassword: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
}

export interface ProjectResponse {
  id: number;
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  status: ProjectStatus;
  projectRoles: ProjectRoleResponse[];
  isPrivate: boolean;
  isDropboxConnected: boolean;
  isCalendarConnected: boolean;
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

export interface TaskResponse {
  id: number;
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
  labelIds: number[];
}

export interface TaskCreateRequest {
  name: string;
  description?: string;
  priority: TaskPriority;
  dueDate?: string;
  projectId: number;
  assigneeId?: number;
}

export interface TaskUpdateRequest {
  name: string;
  description?: string;
  priority: TaskPriority;
  dueDate?: string;
  newAssigneeId?: number;
  labelIds: number[];
}

export interface TaskUpdateStatusRequest {
  newStatus: TaskStatus;
}

export interface ProjectRoleResponse {
  userId: number;
  username: string;
  roleType: ProjectRoleType;
}

export interface ProjectRoleUpdateRequest {
  newRole: ProjectRoleType;
}

export interface LabelResponse {
  id: number;
  name: string;
  color: string;
  projectId: number;
  taskIds: number[];
}

export interface LabelCreateRequest {
  name: string;
  color: string;
  projectId: number;
  taskIds: number[];
}

export interface LabelUpdateRequest {
  name: string;
  color: string;
  taskIds: number[];
}

export interface MessageResponse {
  id: number;
  userId: number;
  username: string;
  text: string;
  timestamp: string;
  lastUpdated: string;
}

export interface CommentResponse extends MessageResponse {
  amountOfReplies: number;
}

export interface ReplyResponse extends MessageResponse {
  replyDtos: ReplyResponse[];
}

export interface EssentialUserResponse {
  id: number;
  username: string;
}

export interface MessageCreateRequest {
  text: string;
}

export interface UserResponse extends EssentialUserResponse {
  email: string;
  firstName: string;
  lastName: string;
  isLocked: boolean;
  roles: UserRole[];
}

export interface Role {
  id: number;
  name: string;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  number: number;
  size: number;
}

export interface GeneralApiError {
  timestamp: string;
  error: string;
}

export interface OAuth2StatusResponse {
  status: OAuth2Status;
  aquiredAt: string;
}

export type ProjectStatus = 'INITIATED' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';

export type TaskStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export type ProjectRoleType = 'CREATOR' | 'ADMIN' | 'CONTRIBUTOR';

export type UserRole = 'USER' | 'MANAGER' | 'OWNER';

export type OAuth2Status = 'OK' | 'EXPIRED' | 'NOT_CONNECTED';
