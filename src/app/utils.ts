import { AbstractControl, ValidationErrors, ValidatorFn } from "@angular/forms";
import { environment } from "../environments/environment";
import { EssentialUserResponse, UserResponse } from "./models/user.model";
import { ProjectResponse } from "./models/project.model";
import { ErrorType, ExternalServiceApiError, GeneralApiError } from "./models/error.model";
import { DropboxErrorTag, DropboxOperationResult, ThirdPartyOperationResult, ThirdPartyOperationStatus } from "./models/external.model";
import { HttpParams } from "@angular/common/http";
import { SortDirection } from "@angular/material/sort";

export function toLocalDateString(date: Date | null): string | undefined {
  if (!date) {
    return undefined;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getChipColor(status: string | null): string {
  switch (status) {
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

export function getChipTextKey(status: string | null): string {
  switch (status) {
    case 'INITIATED': return 'common.title.status.initiated';
    case 'NOT_STARTED': return 'common.title.status.notStarted';
    case 'IN_PROGRESS': return 'common.title.status.inProgress';
    case 'COMPLETED': return 'common.title.status.completed';
    case 'OVERDUE': return 'common.title.status.overdue';
    case 'LOW': return 'task.title.priority.low';
    case 'MEDIUM': return 'task.title.priority.medium';
    case 'HIGH': return 'task.title.priority.high';
    default: return 'common.title.unknown';
  }
}

export function getUserRole(user: UserResponse) : string {
  const roles = user.roles;

  if (roles.includes('OWNER')) {
    return 'Owner';
  }
  else if (roles.includes('MANAGER')) {
    return 'Manager';
  }
  return 'User';
}

export function passwordMatchValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const passwordControl = control.get('password');
    const repeatControl = control.get('repeatPassword');

    if (!passwordControl || !repeatControl) {
      console.warn('Password and/or repeatPassword fields are missing in a form where password matching is validated.');
      return null;
    }

    if (passwordControl.value !== repeatControl.value) {
      repeatControl.setErrors({ ...(repeatControl.errors ?? {}), passwordMismatch: true });
      return { passwordMismatch: true };
    } else {
      if (repeatControl.hasError('passwordMismatch')) {
        const errors = { ...(repeatControl.errors ?? {}) };
        delete errors['passwordMismatch'];

        repeatControl.setErrors(Object.keys(errors).length ? errors : null);
      }
      return null;
    }
  }
}

export function getProjectCreator(project: ProjectResponse) : EssentialUserResponse {
  const projectRole = project.projectRoles.find(pr => pr.roleType === 'CREATOR');

  return { id: projectRole?.userId ?? 0, username: projectRole?.username ?? 'UNKNOWN_USER' };
}

export function getDefaultErrorMessageForType(error: GeneralApiError) : string {
  if (environment.logErrors) {
    console.error('An error has occured.', error);
  }
  if (isExternalError(error) && error.externalResult) {
    return getDefaultMessageForExternalError(error.externalResult);
  }
  switch (error.type) {
    case ErrorType.GENERAL_FIELD_VALIDATION: return 'common.error.fieldValidation';
    case ErrorType.GENERAL_MISFORMED_REQUEST: return 'common.error.misformedRequest';
    case ErrorType.GENERAL_FORBIDDEN: return 'common.error.forbidden';

    case ErrorType.AUTH_GENERAL: return 'auth.error.general';
    case ErrorType.AUTH_EXPIRED_REFRESH_TOKEN: return 'auth.error.refreshToken.expired';
    case ErrorType.AUTH_REVOKED_REFRESH_TOKEN: return 'auth.error.refreshToken.revoked';
    case ErrorType.AUTH_INVALID_REFRESH_TOKEN: return 'auth.error.refreshToken.invalid';
    case ErrorType.AUTH_NO_REFRESH_TOKEN: return 'auth.error.refreshToken.none';

    case ErrorType.PROJECT_NOT_FOUND: return 'project.error.notFound';
    case ErrorType.PROJECT_INCONSISTENT_DATE: return 'project.error.inconsistentDate';
    case ErrorType.PROJECT_DROPBOX_CONNECTION_ERROR: return 'project.error.dropboxConnectionError';

    case ErrorType.TASK_NOT_FOUND: return 'task.error.notFound';
    case ErrorType.TASK_DATE_BEFORE_PROJECT_START: return 'task.error.dateBeforeProjectStart';
    case ErrorType.TASK_DATE_WRONG_INTERVAL: return 'task.error.dateWrongInterval';

    case ErrorType.LABEL_NOT_FOUND: return 'label.error.notFound';

    case ErrorType.USER_NOT_FOUND: return 'user.error.notFound';

    case ErrorType.ATTACHMENT_NOT_FOUND: return 'attachment.error.notFound';
    case ErrorType.ATTACHMENT_FILE_TOO_LARGE: return 'attachment.error.fileTooLarge';
    case ErrorType.ATTACHMENT_UPLOAD_FAILURE: return 'attachment.error.uploadFailure';
    case ErrorType.ATTACHMENT_DOWNLOAD_FAILURE: return 'attachment.error.downloadFailure';
    case ErrorType.ATTACHMENT_FILE_DELETE_FAILURE: return 'attachment.error.fileDeleteFailure';

    case ErrorType.MESSAGE_NOT_FOUND: return 'message.error.notFound.message';
    case ErrorType.MESSAGE_COMMENT_NOT_FOUND: return 'message.error.notFound.comment';
    case ErrorType.MESSAGE_REPLY_NOT_FOUND: return 'message.error.notFound.reply';

    case ErrorType.OAUTH2_INTERNAL_FAILURE: return 'auth.error.oauth.internal';
    case ErrorType.OAUTH2_EXTERNAL_ID_TAKEN: return 'auth.error.oauth.externalIdTaken';
    case ErrorType.OAUTH2_ALREADY_AUTHORIZED: return 'auth.error.oauth.alreadyAuthorized';
    case ErrorType.OAUTH2_NO_STATE_FOUND: return 'auth.error.oauth.noStateFound';
    case ErrorType.OAUTH2_CALLBACK_FAILURE: return 'auth.error.oauth.callbackFailure';

    case ErrorType.REGISTRATION_USERNAME_TAKEN: return 'auth.error.registration.usernameTaken';
    case ErrorType.REGISTRATION_EMAIL_TAKEN: return 'auth.error.registration.emailTaken';

    case ErrorType.EXTERNAL_INTERRUPTED: return 'common.error.interrupted';

    case ErrorType.INTERNAL: return 'common.error.internal';
    default: 
      if ('message' in error && error.message && typeof error.message === 'string') {
        return error.message;
      }
      return 'common.error.unknown';
  }
}

export function getDefaultMessageForExternalError(result: ThirdPartyOperationResult) : string {
  if (environment.logErrors) {
    console.error('An third-party result indicates an external error.', result);
  }
  // Currently only Dropbox results are supported.
  const dropboxResult = result as DropboxOperationResult;

  switch (dropboxResult.status) {
    case ThirdPartyOperationStatus.NOT_APPLICABLE: return 'dropbox.error.status.notApplicable';
    case ThirdPartyOperationStatus.RAN_OUT_OF_RETRIES: return 'dropbox.error.status.ranOutOfRetries';
    case ThirdPartyOperationStatus.SKIPPED: return 'dropbox.error.status.skipped';
  }
  if (dropboxResult.tag) {
    switch (dropboxResult.tag) {
      case DropboxErrorTag.PATH_LOOKUP_NOT_FOUND: return 'dropbox.error.tag.lookup.notFound';
      case DropboxErrorTag.PATH_WRITE_CONFLICT: return 'dropbox.error.tag.write.conflict';
      case DropboxErrorTag.PATH_WRITE_NOT_ENOUGH_SPACE: return 'dropbox.error.tag.write.notEnoughSpace';
      case DropboxErrorTag.FILES_IOEXCEPTION: return 'dropbox.error.tag.ioException';
    }
  }
  return dropboxResult.errorMessage ?? 'dropbox.error.unknown';
}

export function isExternalError(error: GeneralApiError) : error is ExternalServiceApiError {
  return 'externalResult' in error;
}

export function getPageableParams(page: number, size: number, sort?: string, direction?: SortDirection, filter?: Object) : HttpParams {
  let params = new HttpParams().set('page', page).set('size', size);
    
  if (sort && direction) params = params.set('sort', sort + ',' + direction);

  if (filter) {
    const entries = Object.entries(filter);

    entries.forEach(e => {
      if (e[1] !== undefined && e[1] !== null) {
        if (typeof e[1] !== 'object') {
          params = params.set(e[0], e[1]);
        } else {
          if (environment.logErrors) console.warn('Unable to include an object into as an HTTP param.')
        }
      }
    });
  }
  return params;
}
