import { AbstractControl, ValidationErrors, ValidatorFn } from "@angular/forms";
import { ErrorType, EssentialUserResponse, ExternalServiceApiError, GeneralApiError, ProjectResponse, SimpleApiError, ThirdPartyOperationStatus, ThirdPartyOperationTag, UserResponse } from "./models";
import { environment } from "../environments/environment";

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

export function getChipText(status: string | null): string {
    switch (status) {
        case 'INITIATED': return 'Initiated';
        case 'NOT_STARTED': return 'Not started';
        case 'IN_PROGRESS': return 'In Progress';
        case 'COMPLETED': return 'Completed';
        case 'OVERDUE': return 'Overdue';
        case 'LOW': return 'Low';
        case 'MEDIUM': return 'Medium';
        case 'HIGH': return 'High';
        default: return 'Unknown';
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
    switch (error.type) {
        case ErrorType.GENERAL_FIELD_VALIDATION: return 'Some of the submitted data is invalid.';
        case ErrorType.GENERAL_MISFORMED_REQUEST: return 'Unable to parse request.';
        case ErrorType.GENERAL_AUTHENTICATION_FAILURE: return 'Provided credentials are invalid.';
        case ErrorType.PROJECT_NOT_FOUND: return 'The requested project was not found.';
        case ErrorType.TASK_NOT_FOUND: return 'The requested task was not found.';
        case ErrorType.LABEL_NOT_FOUND: return 'The requested label was not found.';
        case ErrorType.USER_NOT_FOUND: return 'The requested user was not found.';
        case ErrorType.ATTACHMENT_NOT_FOUND: return 'The requested attachment was not found.';
        case ErrorType.ATTACHMENT_FILE_TOO_LARGE: return 'The uploaded file is too large. The maximum file size is currently 150 Mb';
        case ErrorType.ATTACHMENT_UPLOAD_FAILURE: return 'An issue has occured during file upload. This usually means an internal Dropbox failure. Please try again later.';
        case ErrorType.MESSAGE_NOT_FOUND: return 'The requested message was not found.';
        case ErrorType.MESSAGE_COMMENT_NOT_FOUND: return 'The requested comment was not found.';
        case ErrorType.MESSAGE_REPLY_NOT_FOUND: return 'The requested reply was not found.';
        case ErrorType.OAUTH2_INTERNAL_FAILURE: return 'An internal issue has occured during the authorization process. Please try again later.';
        case ErrorType.OAUTH2_EXTERNAL_ID_TAKEN: return 'This external account is already in use by a different user.';
        case ErrorType.OAUTH2_ALREADY_AUTHORIZED: return 'You have already authorized the use of this service.';
        case ErrorType.OAUTH2_NO_STATE_FOUND: return 'The authorization attempt took too long. Please try again.';
        case ErrorType.OAUTH2_CALLBACK_FAILURE: return 'Failed to complete the authorization process. Please try again later.';
        case ErrorType.REGISTRATION_USERNAME_TAKEN: return 'This username is already in use by a different user.';
        case ErrorType.REGISTRATION_EMAIL_TAKEN: return 'This email is already in use by a different user.';
        case ErrorType.EXTERNAL_INTERRUPTED: return 'The server is currently shutting down. Please try again later.';
        case ErrorType.INTERNAL: return 'An unknown internal error has occured. The issue is being investigated. Please try again later.';
        default: return 'An unknown error has occured.';
    }
}

export function getDefaultErrorMessageForExternalResult(error: ExternalServiceApiError) {
    if (environment.logErrors) {
        console.error('An error has occured.', error);
    }
    switch (error.externalResult.tag) {
        case ThirdPartyOperationTag.NO_TASK_FOLDER_ID: return 'This task does not have a folder on Dropbox. You will have to recreate the task.';
        case ThirdPartyOperationTag.IOEXCEPTION: return 'An internal server error has occured. Please try again later.';
        default: return 'An unknown external service issue has occured. Please try again later.'
    }
}

export function isExternalError(error: SimpleApiError) : error is ExternalServiceApiError {
    return 'externalResult' in error;
}
