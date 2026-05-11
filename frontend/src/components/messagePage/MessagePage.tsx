import {Avatar, IconButton, InputAdornment, Menu, MenuItem, TextField} from "@mui/material";
import {getChatName, getInitialsFromName} from "../utils/Utils";
import React, {useEffect, useRef, useState} from "react";
import {ChatDTO} from "../../redux/chat/ChatModel";
import {UserDTO} from "../../redux/auth/AuthModel";
import styles from './MesaggePage.module.scss';
import MoreVertIcon from "@mui/icons-material/MoreVert";
import SearchIcon from "@mui/icons-material/Search";
import {MessageDTO} from "../../redux/message/MessageModel";
import MessageCard from "../messageCard/MessageCard";
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CallIcon from '@mui/icons-material/Call';
import VideocamIcon from '@mui/icons-material/Videocam';
import {createMessage} from "../../redux/message/MessageAction";
import ClearIcon from "@mui/icons-material/Clear";
import MicIcon from '@mui/icons-material/Mic';
import {AppDispatch} from "../../redux/Store";
import {useDispatch} from "react-redux";
import {deleteChat} from "../../redux/chat/ChatAction";
import {TOKEN} from "../../config/Config";
import EmojiPicker from "emoji-picker-react";
import MoodIcon from '@mui/icons-material/Mood';
import {EmojiClickData} from "emoji-picker-react/dist/types/exposedTypes";

interface MessagePageProps {
    chat: ChatDTO;
    reqUser: UserDTO | null;
    messages: MessageDTO[];
    newMessage: string;
    setNewMessage: (newMessage: string) => void;
    onSendMessage: () => void;
    setIsShowEditGroupChat: (isShowEditGroupChat: boolean) => void;
    setCurrentChat: (chat: ChatDTO | null) => void;
}

const MessagePage = (props: MessagePageProps) => {

    const [messageQuery, setMessageQuery] = useState<string>("");
    const [isFocused, setIsFocused] = useState<boolean>(false);
    const [isSearch, setIsSearch] = useState<boolean>(false);
    const [anchor, setAnchor] = useState(null);
    const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState<boolean>(false);
    const [isListening, setIsListening] = useState<boolean>(false);
    const lastMessageRef = useRef<null | HTMLDivElement>(null);
    const dispatch: AppDispatch = useDispatch();
    const open = Boolean(anchor);
    const token: string | null = localStorage.getItem(TOKEN);

    useEffect(() => {
        scrollToBottom();
    }, [props]);

    const scrollToBottom = () => {
        if (lastMessageRef.current) {
            lastMessageRef.current.scrollIntoView({behavior: "smooth"});
        }
    };

    const onOpenMenu = (e: any) => {
        setAnchor(e.currentTarget);
    };

    const onCloseMenu = () => {
        setAnchor(null);
    };

    const onEditGroupChat = () => {
        onCloseMenu();
        props.setIsShowEditGroupChat(true);
    };

    const onDeleteChat = () => {
        onCloseMenu();
        if (token) {
            dispatch(deleteChat(props.chat.id, token));
            props.setCurrentChat(null);
        }
    };

    const onChangeNewMessage = (e: React.ChangeEvent<HTMLInputElement>) => {
        setIsEmojiPickerOpen(false);
        props.setNewMessage(e.target.value);
    };

    const onChangeMessageQuery = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setMessageQuery(e.target.value.toLowerCase());
    };

    const onChangeSearch = () => {
        setIsSearch(!isSearch);
    };

    const onClearQuery = () => {
        setMessageQuery("");
        setIsSearch(false);
    };

    const getSearchEndAdornment = () => {
        return <InputAdornment position='end'>
            <IconButton onClick={onClearQuery}>
                <ClearIcon/>
            </IconButton>
        </InputAdornment>
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            props.onSendMessage();
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && token && props.chat.id) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                dispatch(createMessage({
                    chatId: props.chat.id,
                    content: `Sent a file: ${file.name}`,
                    fileName: file.name,
                    fileUrl: base64String
                }, token));
            };
            reader.readAsDataURL(file);
        }
    };

    const onOpenEmojiPicker = () => {
        setIsEmojiPickerOpen(true);
    };

    const onCloseEmojiPicker = () => {
        setIsEmojiPickerOpen(false);
    };

    const onEmojiClick = (e: EmojiClickData) => {
        setIsEmojiPickerOpen(false);
        props.setNewMessage(props.newMessage + e.emoji);
    };

    let lastDay = -1;
    let lastMonth = -1;
    let lastYear = -1;

    const getMessageCard = (message: MessageDTO) => {
        const date: Date = new Date(message.timeStamp);
        const isNewDate = lastDay !== date.getDate() || lastMonth !== date.getMonth() || lastYear !== date.getFullYear();
        if (isNewDate) {
            lastDay = date.getDate();
            lastMonth = date.getMonth();
            lastYear = date.getFullYear();
        }
        return <MessageCard message={message} reqUser={props.reqUser} key={message.id} isNewDate={isNewDate}
                            isGroup={props.chat.isGroup}/>
    };

    const onStartCall = (type: 'VOICE' | 'VIDEO') => {
        console.log(`Initiating ${type} call...`);
        if (props.chat.id && token) {
            const callMessage = {
                chatId: props.chat.id,
                content: `Starting ${type} call...`,
                messageType: 'CALL_START'
            };
            console.log("Sending CALL_START message:", callMessage);
            dispatch(createMessage(callMessage, token));
            
            dispatch({
                type: 'START_CALL',
                payload: {
                    caller: props.reqUser,
                    receiver: props.chat.isGroup ? null : (props.chat.users[0].id === props.reqUser?.id ? props.chat.users[1] : props.chat.users[0]),
                    chatId: props.chat.id,
                    callType: type
                }
            });
        } else {
            console.warn("Cannot start call: missing chat ID or token");
        }
    };

    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const audioChunks = useRef<Blob[]>([]);

    const onToggleListen = async () => {
        if (isListening) {
            mediaRecorder.current?.stop();
            setIsListening(false);
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            mediaRecorder.current = recorder;
            audioChunks.current = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    audioChunks.current.push(e.data);
                }
            };

            recorder.onstop = () => {
                const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64Audio = reader.result as string;
                    if (token && props.chat.id) {
                        dispatch(createMessage({
                            chatId: props.chat.id,
                            content: "Sent a voice message",
                            fileName: "voice_message.webm",
                            fileUrl: base64Audio
                        }, token));
                    }
                };
                reader.readAsDataURL(audioBlob);
                stream.getTracks().forEach(track => track.stop()); // Stop mic after recording
            };

            recorder.start();
            setIsListening(true);
        } catch (err) {
            console.error("Error accessing microphone:", err);
            alert("Could not access microphone.");
        }
    };

    const chatImage = !props.chat.isGroup ? (props.chat.users[0].id === props.reqUser?.id ? props.chat.users[1].image : props.chat.users[0].image) : undefined;

    return (
        <div className={styles.outerMessagePageContainer}>

            {/*Message Page Header*/}
            <div className={styles.messagePageHeaderContainer}>
                <div className={styles.messagePageInnerHeaderContainer}>
                    <div className={styles.messagePageHeaderNameContainer}>
                        <Avatar sx={{
                            width: '2.5rem',
                            height: '2.5rem',
                            fontSize: '1rem',
                            mr: '0.75rem'
                        }} src={chatImage || undefined}>
                            {!chatImage && getInitialsFromName(getChatName(props.chat, props.reqUser))}
                        </Avatar>
                        <p>{getChatName(props.chat, props.reqUser)}</p>
                    </div>
                    <div className={styles.messagePageHeaderNameContainer}>
                        <IconButton onClick={() => onStartCall('VOICE')}>
                            <CallIcon/>
                        </IconButton>
                        <IconButton sx={{mr: '0.5rem'}} onClick={() => onStartCall('VIDEO')}>
                            <VideocamIcon/>
                        </IconButton>
                        {!isSearch &&
                            <IconButton onClick={onChangeSearch}>
                                <SearchIcon/>
                            </IconButton>}
                        {isSearch &&
                            <TextField
                                id='searchMessages'
                                type='text'
                                label='Search for messages ...'
                                size='small'
                                fullWidth
                                value={messageQuery}
                                onChange={onChangeMessageQuery}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position='start'>
                                            <SearchIcon/>
                                        </InputAdornment>
                                    ),
                                    endAdornment: getSearchEndAdornment(),
                                }}
                                InputLabelProps={{
                                    shrink: isFocused || messageQuery.length > 0,
                                    style: {marginLeft: isFocused || messageQuery.length > 0 ? 0 : 30}
                                }}
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => setIsFocused(false)}/>}
                        <IconButton onClick={onOpenMenu}>
                            <MoreVertIcon/>
                        </IconButton>
                        <Menu
                            id="basic-menu"
                            anchorEl={anchor}
                            open={open}
                            onClose={onCloseMenu}
                            MenuListProps={{'aria-labelledby': 'basic-button'}}>
                            {props.chat.isGroup && <MenuItem onClick={onEditGroupChat}>Edit Group Chat</MenuItem>}
                            <MenuItem onClick={onDeleteChat}>
                                {props.chat.isGroup ? 'Delete Group Chat' : 'Delete Chat'}
                            </MenuItem>
                        </Menu>
                    </div>
                </div>
            </div>

            {/*Message Page Content*/}
            <div className={styles.messageContentContainer} onClick={onCloseEmojiPicker}>
                {[...props.messages]
                    .filter(x => x.id !== null && x.id !== undefined) // Ignore signaling messages with null ID
                    .sort((a, b) => +new Date(a.timeStamp) - +new Date(b.timeStamp))
                    .filter(x => messageQuery.length === 0 || x.content.toLowerCase().includes(messageQuery))
                    .map(message => getMessageCard(message))}
                <div ref={lastMessageRef}></div>
            </div>

            {/*Message Page Footer*/}
            <div className={styles.footerContainer}>
                {isEmojiPickerOpen ?
                    <div className={styles.emojiOuterContainer}>
                        <div className={styles.emojiContainer}>
                            <EmojiPicker onEmojiClick={onEmojiClick} searchDisabled={true} skinTonesDisabled={true}/>
                        </div>
                    </div> :
                    <div className={styles.emojiButton}>
                        <input
                            id="msg-file-input"
                            type="file"
                            style={{display: 'none'}}
                            onChange={handleFileChange}
                        />
                        <label htmlFor="msg-file-input">
                            <IconButton component="span">
                                <AttachFileIcon/>
                            </IconButton>
                        </label>
                        <IconButton onClick={onOpenEmojiPicker}>
                            <MoodIcon/>
                        </IconButton>
                    </div>}
                <div className={styles.innerFooterContainer}>
                    <TextField
                        id='newMessage'
                        type='text'
                        label='Enter new message ...'
                        size='small'
                        onKeyDown={onKeyDown}
                        fullWidth
                        value={props.newMessage}
                        onChange={onChangeNewMessage}
                        sx={{ bgcolor: 'background.paper', borderRadius: 1 }}
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position='end'>
                                    <IconButton onClick={onToggleListen} sx={{ color: isListening ? 'red' : 'inherit' }}>
                                        <MicIcon/>
                                    </IconButton>
                                    <IconButton onClick={props.onSendMessage}>
                                        <SendIcon/>
                                    </IconButton>
                                </InputAdornment>),
                        }}/>
                </div>
            </div>
        </div>
    );
};

export default MessagePage;