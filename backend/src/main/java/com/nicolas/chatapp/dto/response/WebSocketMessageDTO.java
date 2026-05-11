package com.nicolas.chatapp.dto.response;

import java.util.Set;
import java.util.UUID;

public record WebSocketMessageDTO(
    UUID id, 
    String content, 
    String timeStamp, 
    UserDTO user, 
    Set<UUID> readBy, 
    String fileName, 
    String fileUrl, 
    String messageType,
    ChatDTO chat
) {
}
