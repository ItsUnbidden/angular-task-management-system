import { Entity } from "./general.model";

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

export enum LabelColor {
  BLUE = 'blue',
  GREEN = 'green',
  RED = 'red',
  YELLOW = 'yellow',
  CYAN = 'cyan',
  DEEP_BLUE = 'deep-blue',
  MAGENTA = 'magenta',
  PURPLE = 'purple',
  ORANGE = 'orange',
  PINK = 'pink',
  YELLOW_GREEN = 'yellow-green'
}
