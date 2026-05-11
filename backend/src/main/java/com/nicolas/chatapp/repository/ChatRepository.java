package com.nicolas.chatapp.repository;

import com.nicolas.chatapp.model.Chat;
import com.nicolas.chatapp.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ChatRepository extends JpaRepository<Chat, UUID> {

    @Query("select c from Chat c join c.users u where u.id = :userId")
    List<Chat> findChatByUserId(@Param("userId") UUID userId);

    @Query("SELECT c FROM Chat c WHERE c.isGroup = false AND :user2 MEMBER OF c.users AND :reqUser MEMBER OF c.users")
    Optional<Chat> findSingleChatByUsers(@Param("user2") User user2, @Param("reqUser") User reqUser);

    @Query("SELECT c FROM Chat c JOIN FETCH c.users WHERE c.id = :chatId")
    Optional<Chat> findByIdWithUsers(@Param("chatId") UUID chatId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    @Query(value = "INSERT IGNORE INTO message_read_by (message_id, read_by) SELECT id, :userId FROM message WHERE chat_id = :chatId", nativeQuery = true)
    void markChatAsRead(@Param("chatId") String chatId, @Param("userId") String userId);
}
