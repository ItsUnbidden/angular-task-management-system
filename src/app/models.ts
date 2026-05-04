export interface Entity {
  id: number;
}

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

export interface ProjectResponse extends Entity {
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

export interface ProjectDeleteResponse {
  hasDeletedDropboxFolder: boolean;
  hasDeletedCalendar: boolean;
}

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
  dropboxFolderDeleted: ThirdPartyOperationResult;
  calendarFolderDeleted: ThirdPartyOperationResult;
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

export interface LabelResponse extends Entity {
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

export interface MessageResponse extends Entity {
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

export interface MessageCreateRequest {
  text: string;
}

export interface AttachmentResponse extends Entity {
  taskId: number;
  filename: string;
  uploadDate: string;
}

export interface EssentialUserResponse extends Entity {
  username: string;
}

export interface UserResponse extends EssentialUserResponse {
  email: string;
  isLocked: boolean;
  roles: UserRole[];
}

export interface UserUpdateRequest {
  username: string;
  email: string;
  password?: string;
  repeatPassword?: string;
}

export interface UserDeleteResponse {
  deletedProjects: ProjectDeleteResponse[];
  quittedProjects: UserRemoveFromProjectResponse[];
}

export interface UserRemoveFromProjectResponse {
  project: ProjectResponse;
  dropboxDisconnected: ThirdPartyOperationResult;
  calendarDisconnected: ThirdPartyOperationResult;
}

export interface UserAddToProjectResponse {
  project: ProjectResponse;
  dropboxConnected: ThirdPartyOperationResult;
  calendarConnected: ThirdPartyOperationResult;
}

export interface Role extends Entity {
  name: string;
}

export interface Page<T extends Entity> {
  content: T[];
  totalElements: number;
  number: number;
  size: number;
}

export interface Cache {
  isLoading: boolean;
  error: string | null;
}

export interface PageCache<T extends Entity, F> extends Cache {
  page?: Page<T>;
  filter?: F;
  pageIndex: number;
  pageSize: number;
  sort: string;
  direction: 'asc' | 'desc' | '';
}

export interface SingleItemCache<T extends Entity> extends Cache {
  item?: T;
}

export interface TableState {
  pageIndex: number;
  pageSize: number;
  sortActive: string;
  sortDirection: 'asc' | 'desc' | '';
}

export interface GeneralApiError {
  timestamp: string;
  type: ErrorType;
}

export interface SimpleApiError extends GeneralApiError {
  message: string;
}

export interface ValidationApiError extends GeneralApiError {
  fieldErrors: FieldError[];
}

export interface FieldError {
  codes: string[];
  arguments: any[];
  defaultMessage: string;
  objectName: string;
}

export interface OAuth2StatusResponse {
  status: OAuth2Status;
  aquiredAt: string;
}

export interface ThirdPartyTestResponse {
  result: string;
}

export interface ThirdPartyProjectDisconnectionResponse {
  isDropboxFolderDeleted?: boolean;
  isCalendarDeleted?: boolean;
}

export interface ThirdPartyOperationResult {
  status: ThirdPartyOperationStatus;
}

export enum ErrorType {
  GENERAL_FIELD_VALIDATION = 'GENERAL_FIELD_VALIDATION',
  GENERAL_MISFORMED_REQUEST = 'GENERAL_MISFORMED_REQUEST',
  GENERAL_AUTHENTICATION_FAILURE = 'GENERAL_AUTHENTICATION_FAILURE',

  PROJECT_NOT_FOUND = 'PROJECT_NOT_FOUND',

  TASK_NOT_FOUND = 'TASK_NOT_FOUND',

  LABEL_NOT_FOUND = 'LABEL_NOT_FOUND',

  USER_NOT_FOUND = 'USER_NOT_FOUND',

  ATTACHMENT_NOT_FOUND = 'ATTACHMENT_NOT_FOUND',
  ATTACHMENT_FILE_TOO_LARGE = 'ATTACHMENT_FILE_TOO_LARGE',
  ATTACHMENT_UPLOAD_FAILURE = 'ATTACHMENT_UPLOAD_FAILURE',

  MESSAGE_NOT_FOUND = 'MESSAGE_NOT_FOUND',
  MESSAGE_COMMENT_NOT_FOUND = 'MESSAGE_COMMENT_NOT_FOUND',
  MESSAGE_REPLY_NOT_FOUND = 'MESSAGE_REPLY_NOT_FOUND',

  OAUTH2_INTERNAL_FAILURE = 'OAUTH2_INTERNAL_FAILURE',
  OAUTH2_EXTERNAL_ID_TAKEN = 'OAUTH2_EXTERNAL_ID_TAKEN',
  OAUTH2_ALREADY_AUTHORIZED = 'OAUTH2_ALREADY_AUTHORIZED',
  OAUTH2_NO_STATE_FOUND = 'OAUTH2_NO_STATE_FOUND',
  OAUTH2_CALLBACK_FAILURE = 'OAUTH2_CALLBACK_FAILURE',

  REGISTRATION_USERNAME_TAKEN = 'REGISTRATION_USERNAME_TAKEN',
  REGISTRATION_EMAIL_TAKEN = 'REGISTRATION_EMAIL_TAKEN',

  EXTERNAL_INTERRUPTED = 'EXTERNAL_INTERRUPTED',

  INTERNAL = 'INTERNAL'
}

export type ThirdPartyOperationStatus = 'SUCCESS' | 'SKIPPED' | 'NOT_APPLICABLE' | 'FAILED';

export type ProjectStatus = 'INITIATED' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';

export type TaskStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export type ProjectRoleType = 'CREATOR' | 'ADMIN' | 'CONTRIBUTOR';

export type UserRole = 'USER' | 'MANAGER' | 'OWNER';

export type OAuth2Status = 'OK' | 'EXPIRED' | 'NOT_CONNECTED';
