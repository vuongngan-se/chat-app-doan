// Removed UUID import from node:crypto
import {UserDTO} from "../auth/AuthModel";
import {ChatDTO} from "../chat/ChatModel";

export interface MessageDTO {
    id: string;
    content: string;
    timeStamp: string;
    user: UserDTO;
    readBy: string[];
    fileName?: string;
    fileUrl?: string;
    messageType?: string;
}

export interface WebSocketMessageDTO {
    id: string;
    content: string;
    timeStamp: string;
    user: UserDTO;
    chat: ChatDTO;
    readBy: string[];
    fileName?: string;
    fileUrl?: string;
    messageType?: string;
}

export interface SendMessageRequestDTO {
    chatId: string;
    content: string;
    fileName?: string;
    fileUrl?: string;
    messageType?: string;
}

export type MessageReducerState = {
    messages: MessageDTO[];
    newMessage: MessageDTO | null;
}