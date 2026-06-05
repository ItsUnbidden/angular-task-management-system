import { Entity } from "./general.model";

export interface AttachmentResponse extends Entity {
  taskId: number;
  filename: string;
  uploadDate: string;
}
