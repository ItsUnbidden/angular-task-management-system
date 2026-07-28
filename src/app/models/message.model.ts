import { Entity } from "./general.model";

export interface MessageResponse extends Entity {
  userId: number;
  username: string;
  text: string;
  timestamp: string;
  lastUpdated: string;
}

export interface CommentResponse extends MessageResponse {
  numberOfReplies: number;
}

export interface ReplyResponse extends MessageResponse {
  replyDtos: ReplyResponse[];
}

export interface FlattenedReply extends ReplyResponse {
  depth: number;
}

export interface MessageCreateRequest {
  text: string;
}
