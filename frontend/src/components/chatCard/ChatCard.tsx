import {Avatar} from "@mui/material";
import React from "react";
import {getChatName, getInitialsFromName, transformDateToString} from "../utils/Utils";
import styles from './ChatCard.module.scss';
import {ChatDTO} from "../../redux/chat/ChatModel";
import {useSelector} from "react-redux";
import {RootState} from "../../redux/Store";
import {MessageDTO} from "../../redux/message/MessageModel";

interface ChatCardProps {
    chat: ChatDTO;
    isActive?: boolean;
    isOnline?: boolean;
}

const ChatCard = (props: ChatCardProps) => {

    const authState = useSelector((state: RootState) => state.auth);

    const name: string = getChatName(props.chat, authState.reqUser);
    const initials: string = getInitialsFromName(name);
    const sortedMessages: MessageDTO[] = [...props.chat.messages].sort((a, b) => +new Date(a.timeStamp) - +new Date(b.timeStamp));
    const lastMessage: MessageDTO | undefined = sortedMessages.length > 0 ? sortedMessages[sortedMessages.length - 1] : undefined;
    const lastMessageContent: string = lastMessage ? lastMessage.content.length > 25 ? lastMessage.content.slice(0, 25) + "..." : lastMessage.content : "";
    const lastMessageName: string = lastMessage ? lastMessage.user.fullName === authState.reqUser?.fullName ? "You" : lastMessage.user.fullName : "";
    const lastMessageString: string = lastMessage ? lastMessageName + ": " + lastMessageContent : "No messages yet";
    const lastDate: string = lastMessage ? transformDateToString(new Date(lastMessage.timeStamp)) : "";
    
    const numberOfReadMessages: number = props.chat.messages.filter(msg => {
        if (!authState.reqUser) return true;
        const isReadByMe = msg.readBy ? msg.readBy.includes(authState.reqUser.id) : false;
        return msg.user.id === authState.reqUser.id || isReadByMe;
    }).length;

    const numberOfUnreadMessages: number = props.chat.messages.length - numberOfReadMessages;
    const hasUnread = numberOfUnreadMessages > 0;

    const chatImage = !props.chat.isGroup && authState.reqUser ? (props.chat.users[0].id === authState.reqUser.id ? props.chat.users[1].image : props.chat.users[0].image) : undefined;

    return (
        <div className={`${styles.chatCardOuterContainer} ${props.isActive ? styles.activeCard : ''}`}>
            <div className={styles.chatCardAvatarContainer}>
                <Avatar sx={{
                    width: '3.2rem',
                    height: '3.2rem',
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    bgcolor: props.isActive ? 'primary.main' : 'grey.400'
                }} src={chatImage || undefined}>
                    {!chatImage && initials}
                </Avatar>
                {props.isOnline && <div className={styles.onlineDot} />}
            </div>
            <div className={styles.chatCardContentContainer}>
                <div className={styles.chatCardHeaderRow}>
                    <p className={`${styles.chatCardLargeTextContainer} ${hasUnread ? styles.unreadText : ''}`}>{name}</p>
                    <p className={`${styles.chatCardTimeText} ${hasUnread ? styles.unreadTime : ''}`}>{lastDate}</p>
                </div>
                <div className={styles.chatCardMessageRow}>
                    <p className={`${styles.chatCardSmallTextContainer} ${hasUnread ? styles.unreadMessage : ''}`}>{lastMessageString}</p>
                    {hasUnread && <div className={styles.unreadDot} />}
                </div>
            </div>
        </div>
    );
};

export default ChatCard;