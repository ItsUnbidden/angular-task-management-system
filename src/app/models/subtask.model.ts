import { Entity } from "./general.model";

export interface SubtaskResponse extends Entity {
    name: string;
    completed: boolean;
    version: number;
}

export interface SubtaskCreateRequest {
    name: string;
    taskId: number;
}

export interface SubtaskUpdateRequest {
    name: string;
    completed: boolean;
    version: number;
}
