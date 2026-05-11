package com.nicolas.chatapp.controllers;

import com.nicolas.chatapp.model.Chat;
import com.nicolas.chatapp.service.ChatService;
import com.nicolas.chatapp.dto.response.WebSocketMessageDTO;
import java.util.Set;
import com.nicolas.chatapp.dto.response.UserDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.Set;

@Slf4j
@Controller
@RequiredArgsConstructor
public class RealtimeChatController {

    private final SimpMessagingTemplate messagingTemplate;
    private final ChatService chatService;

    @MessageMapping("/messages")
    public void receiveMessage(@Payload WebSocketMessageDTO message) {
        log.info("Received WebSocket message: type={}, content={}", message.messageType(), message.content());
        
        try {
            Set<UserDTO> recipients;
            if (message.chat() != null && message.chat().users() != null && !message.chat().users().isEmpty()) {
                recipients = message.chat().users();
            } else if (message.chat() != null && message.chat().id() != null) {
                log.info("Fetching chat users from DB for chatId: {}", message.chat().id());
                Chat chat = chatService.findByIdWithUsers(message.chat().id());
                recipients = UserDTO.fromUsers(chat.getUsers());
            } else {
                log.error("Message chat or chatId is null!");
                return;
            }

            for (UserDTO user : recipients) {
                final String destination = "/topic/" + user.id();
                log.info("Broadcasting to: {}", destination);
                messagingTemplate.convertAndSend(destination, message);
            }
        } catch (Exception e) {
            log.error("Error broadcasting message", e);
        }
    }

}
